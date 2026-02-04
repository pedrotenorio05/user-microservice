import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthValidationDto } from './dto/auth-validation.dto';

@Controller('internal/auth') // Define a rota base como /internal/auth
export class InternalAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK) // Garante que retorna 200 OK e não 201 Created
  async validate(@Body() req: AuthValidationDto) {
    // 1. Reutilizamos a lógica de validação que já existe no AuthService
    const user = await this.authService.validateUser(req.email, req.password);

    // 2. Se falhar (senha errada ou user não existe), lança erro 401 igual ao Java
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 3. Monta a resposta exatamente como seu amigo pediu (AuthValidationResponse)
    return {
      valid: true,
      userId: user.id,
      // No Java ele retorna uma lista de roles. 
      // Como aqui sua Role é única, colocamos dentro de um array para manter o padrão dele.
      roles: [user.role] 
    };
  }
}