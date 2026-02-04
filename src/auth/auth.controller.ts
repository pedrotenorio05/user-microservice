import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ActivateAccountDto } from './dto/activate-account.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) { 
    
    // Valida usuário e senha
    const user = await this.authService.validateUser(body.email, body.password);
    
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Gera o token
    return this.authService.login(user);
  }

  @Post('activate')
  async activate(@Body() activateDto: ActivateAccountDto) {
    await this.authService.activateAccount(activateDto);
    return { message: 'Conta ativada com sucesso! Você já pode fazer login.' };
  }

}