import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  name: string;

  @IsEmail({}, { message: 'O e-mail informado é inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'O CPF é obrigatório' })
  cpf: string;

  @IsString()
  @IsNotEmpty({ message: 'O telefone é obrigatório' })
  @Matches(/^\(\d{2}\) 9\d{4}-\d{4}$/, { message: 'O telefone deve seguir o formato (XX) 9XXXX-XXXX' })
  phone: string;

  @IsEnum(UserRole, { message: 'O perfil deve ser ADMIN, GESTOR ou OPERADOR' })
  role: UserRole;

  @IsOptional()
  @IsString()
  secretary?: string;
}