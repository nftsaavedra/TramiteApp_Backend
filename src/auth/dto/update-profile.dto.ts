import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
