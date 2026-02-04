import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';
import { ActivateAccountDto } from './dto/activate-account.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    // 1. Usuário existe?
    if (!user) return null;

    // 2. Usuário tem senha?
    if (!user.password) return null; 

    // 3. A senha bate?
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    
    if (user && isPasswordValid) {
      
      // 4. Status bloqueia acesso?
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Usuário inativo ou pendente de ativação.');
      }

      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role, 
      status: user.status 
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }


  async activateAccount(dto: ActivateAccountDto) {
    const user = await this.usersService.findByToken(dto.token);
    if (!user) throw new UnauthorizedException('Token inválido.');

    if (!user.tokenExpiresAt || new Date() > user.tokenExpiresAt) {
      throw new UnauthorizedException('Token expirado. Solicite um novo.');
    }

    // --- [RN02] VALIDAÇÃO DE SENHA RIGOROSA ---
    const pass = dto.password;

    // 1. Pelo menos 8 caracteres
    if (pass.length < 8) {
      throw new BadRequestException('A senha deve ter pelo menos 8 caracteres.');
    }

    // 2. Conter ao menos um número
    if (!/\d/.test(pass)) {
      throw new BadRequestException('A senha deve conter pelo menos um número.');
    }

    // 3. Não pode ser puramente numérica
    if (/^\d+$/.test(pass)) {
      throw new BadRequestException('A senha não pode ser composta apenas por números.');
    }

    // 4. Não pode ser comum (Blacklist básica)
    const commonPasswords = ['12345', '123456', 'senha123', 'admin', 'password', 'trocar123'];
    if (commonPasswords.includes(pass.toLowerCase())) {
      throw new BadRequestException('Esta senha é muito comum e insegura.');
    }

    // 5. Similaridade com dados pessoais
    const lowerPass = pass.toLowerCase();
    const partsToCheck = [
      user.name.split(' ')[0].toLowerCase(), // Primeiro nome
      user.email.split('@')[0].toLowerCase(), // Parte do email antes do @
      user.email,
      user.name.toLowerCase()
    ];

    for (const part of partsToCheck) {
      if (lowerPass.includes(part)) {
        throw new BadRequestException('A senha não pode conter partes do seu nome ou e-mail.');
      }
    }

    const hashedPassword = await bcrypt.hash(pass, 10);
    return this.usersService.activateUser(user.id, hashedPassword);
  }
}