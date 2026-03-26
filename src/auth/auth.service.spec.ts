import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '@/users/users.service';

// Mock de bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashedValue'),
}));

import * as bcrypt from 'bcrypt';

// Mocks
const mockUsersService = {
  findByEmail: jest.fn(),
  findByIdWithPassword: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    // Limpiar mocks antes de cada test
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'USER' as const,
      oficinaId: 'office-1',
      mustChangePassword: false,
    };

    it('should return user without password when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await authService.validateUser('test@example.com', 'password123');

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        oficinaId: 'office-1',
        mustChangePassword: false,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await authService.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const result = await authService.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER' as const,
      oficinaId: 'office-1',
      mustChangePassword: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return access token and mustChangePassword flag', async () => {
      const mockToken = 'jwt-token-123';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await authService.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        sub: '1',
        role: 'USER',
        oficinaId: 'office-1',
      });
      expect(result).toEqual({
        access_token: mockToken,
        mustChangePassword: false,
        message: 'Autenticación exitosa',
      });
    });

    it('should handle user with mustChangePassword = true', async () => {
      const userWithChangeRequired = { ...mockUser, mustChangePassword: true };
      const mockToken = 'jwt-token-456';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await authService.login(userWithChangeRequired);

      expect(result.mustChangePassword).toBe(true);
    });

    it('should handle user without oficinaId', async () => {
      const userWithoutOffice = { ...mockUser, oficinaId: null };
      const mockToken = 'jwt-token-789';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await authService.login(userWithoutOffice);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          oficinaId: null,
        }),
      );
    });
  });

  describe('changePassword', () => {
    const userId = 'user-123';
    const mockUserWithPassword = {
      id: userId,
      email: 'test@example.com',
      password: 'hashedOldPassword',
      name: 'Test User',
      role: 'USER' as const,
      oficinaId: 'office-1',
      mustChangePassword: true,
    };

    it('should change password successfully when current password is correct', async () => {
      mockUsersService.findByIdWithPassword.mockResolvedValue(mockUserWithPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      mockUsersService.update.mockResolvedValue({
        ...mockUserWithPassword,
        password: 'newHashedPassword',
        mustChangePassword: false,
      });

      const changePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword',
      };

      const result = await authService.changePassword(userId, changePasswordDto);

      expect(usersService.findByIdWithPassword).toHaveBeenCalledWith(userId);
      expect(usersService.update).toHaveBeenCalledWith(userId, {
        password: 'newPassword',
        mustChangePassword: false,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findByIdWithPassword.mockResolvedValue(null);

      const changePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword',
      };

      await expect(authService.changePassword(userId, changePasswordDto))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when current password is incorrect', async () => {
      mockUsersService.findByIdWithPassword.mockResolvedValue(mockUserWithPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const changePasswordDto = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword',
      };

      await expect(authService.changePassword(userId, changePasswordDto))
        .rejects
        .toThrow(BadRequestException);
    });
  });
});
