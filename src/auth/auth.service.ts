import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';
import { ActivateAccountDto } from './dto/activate-account.dto';

// Interface interna para tipar o retorno do validateUser
interface ValidatedUser {
  id: string;
  role: string;
  [key: string]: any;
}

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateUser(email: string, pass: string): Promise<ValidatedUser | null> {
    const user = await this.usersService.findByEmail(email);

    // Prevenção de Timing Attack
    const dummyHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWrn3ILAWOiP.k.s3.s3.s3.s3.s3.'; 
    const storedPassword = user?.password || dummyHash;

    const isPasswordValid = await bcrypt.compare(pass, storedPassword);

    if (!user || !isPasswordValid) {
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Usuário inativo ou pendente de ativação.');
    }

    // Removemos dados sensíveis antes de retornar
    const { password, activationToken, ...result } = user as any; 
    return result;
  }

  async activateAccount(dto: ActivateAccountDto) {
    const user = await this.usersService.findByToken(dto.token);
    
    // Mensagem genérica para segurança
    if (!user || !user.tokenExpiresAt || new Date() > user.tokenExpiresAt) {
      throw new UnauthorizedException('Link de ativação inválido ou expirado.');
    }

    const pass = dto.password;
    this.validateStrongPassword(pass, user);

    const hashedPassword = await bcrypt.hash(pass, 10); // Custo 10
    return this.usersService.activateUser(user.id, hashedPassword);
  }

  private validateStrongPassword(pass: string, user: any) {
    if (pass.length < 8) throw new BadRequestException('A senha deve ter pelo menos 8 caracteres.');
    if (!/\d/.test(pass)) throw new BadRequestException('A senha deve conter pelo menos um número.');
    if (!/[a-zA-Z]/.test(pass)) throw new BadRequestException('A senha deve conter letras.');
    if (/^\d+$/.test(pass)) throw new BadRequestException('A senha não pode ser composta apenas por números.');

    const commonPasswords = ['12345', '123456', 'senha123', 'admin', 'password', 'trocar123', 'mudar123'];
    if (commonPasswords.includes(pass.toLowerCase())) {
      throw new BadRequestException('Esta senha é muito comum e insegura.');
    }

    const lowerPass = pass.toLowerCase();
    const partsToCheck = [
      user.email.split('@')[0].toLowerCase(),
      user.name.split(' ')[0].toLowerCase(),
    ];

    for (const part of partsToCheck) {
      if (part.length > 2 && lowerPass.includes(part)) {
        throw new BadRequestException('A senha não pode conter partes do seu nome ou e-mail.');
      }
    }
  }
}