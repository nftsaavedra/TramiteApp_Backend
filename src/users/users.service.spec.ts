import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from './users.service';

// Mock de bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashedValue'),
}));

import * as bcrypt from 'bcrypt';

// Mock de PrismaService
const mockPrismaService = {
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((queries) => Promise.all(queries)),
};

// Mock de ConfigService
const mockConfigService = {
  get: jest.fn(),
};

describe('UsersService', () => {
  let usersService: UsersService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
      role: 'USER' as const,
      oficinaId: 'office-1',
    };

    const mockUser = {
      id: '1',
      ...createUserDto,
      password: 'hashedPassword',
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a user with hashed password', async () => {
      const hashedPassword = 'hashedPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await usersService.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...createUserDto,
          password: hashedPassword,
          mustChangePassword: true,
        },
      });
      // El resultado no debería tener password
      expect((result as any).password).toBeUndefined();
    });

    it('should respect mustChangePassword flag if provided', async () => {
      const createUserDtoWithFlag = {
        ...createUserDto,
        mustChangePassword: false,
      };
      const hashedPassword = 'hashedPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        mustChangePassword: false,
      });

      await usersService.create(createUserDtoWithFlag);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...createUserDtoWithFlag,
          password: hashedPassword,
          mustChangePassword: false,
        },
      });
    });
  });

  describe('findByEmail', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedPassword',
      role: 'USER' as const,
      oficinaId: 'office-1',
      isActive: true,
      mustChangePassword: false,
    };

    it('should return user by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findByEmail('test@example.com');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOne', () => {
    const mockUserWithoutPassword = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER' as const,
      oficinaId: 'office-1',
      isActive: true,
      mustChangePassword: false,
    };

    it('should return user without password by id', async () => {
      const mockUserWithOffice = {
        ...mockUserWithoutPassword,
        oficina: {
          id: 'office-1',
          nombre: 'Test Office',
          siglas: 'TO',
        },
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithOffice);

      const result = await usersService.findOne('1');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          oficina: {
            select: {
              id: true,
              nombre: true,
              siglas: true,
            },
          },
        },
      });
      expect(result).toEqual(mockUserWithOffice);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(usersService.findOne('nonexistent-id'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('findByIdWithPassword', () => {
    const mockUserWithPassword = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'USER' as const,
      oficinaId: 'office-1',
      isActive: true,
      mustChangePassword: false,
    };

    it('should return user with password by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithPassword);

      const result = await usersService.findByIdWithPassword('1');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(mockUserWithPassword);
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await usersService.findByIdWithPassword('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const userId = 'user-123';
    const updateUserDto = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    const mockUpdatedUser = {
      id: userId,
      ...updateUserDto,
      password: 'hashedPassword',
      role: 'USER' as const,
      oficinaId: 'office-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      mustChangePassword: false,
    };

    it('should update user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUpdatedUser);
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await usersService.update(userId, updateUserDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserDto,
      });
      // El resultado no debería tener password
      expect((result as any).password).toBeUndefined();
    });

    it('should hash password if provided in update', async () => {
      const updateWithPassword = {
        ...updateUserDto,
        password: 'newPassword',
      };
      const hashedPassword = 'newHashedPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedPassword);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUpdatedUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUpdatedUser,
        password: hashedPassword,
      });

      await usersService.update(userId, updateWithPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          ...updateWithPassword,
          password: hashedPassword,
        },
      });
    });
  });

  describe('remove', () => {
    const userId = 'user-123';

    const mockDeletedUser = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER' as const,
      oficinaId: 'office-1',
      isActive: true,
    };

    it('should soft delete user (set isActive to false)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockDeletedUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockDeletedUser,
        isActive: false,
      });

      await usersService.remove(userId);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isActive: false },
      });
    });
  });
});
