import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthValidationDto } from './dto/auth-validation.dto';
//  Adicionar '@nestjs/throttler' ao projeto e use @UseGuards(ThrottlerGuard) aqui em produção.

@Controller('internal/auth')
export class InternalAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() req: AuthValidationDto) {
    try {
      const user = await this.authService.validateUser(req.email, req.password);

      if (!user) {
        return { valid: false, userId: null, roles: [] };
      }

      return {
        valid: true,
        userId: user.id,
        roles: [user.role] // Java espera lista
      };

    } catch (error) {
      // Capturamos apenas Unauthorized (usuário inativo)
      // Erros de banco/sistema (500) devem explodir para logs
      if (error instanceof UnauthorizedException) {
        return { valid: false, userId: null, roles: [] };
      }
      throw error;
    }
  }
}