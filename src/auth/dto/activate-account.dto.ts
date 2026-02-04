import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ActivateAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'O token de ativação é obrigatório.' })
  token: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  password: string;
}