import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ActivateAccountDto } from './dto/activate-account.dto';

@Controller('auth')
export class AuthController { 
  constructor(private readonly authService: AuthService) {}

  @Post('activate')
  async activate(@Body() activateDto: ActivateAccountDto) {
    await this.authService.activateAccount(activateDto);
    return { message: 'Conta ativada com sucesso! Você já pode fazer login.' };
  }
}