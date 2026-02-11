import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService 
  ) {
    const publicKeyRaw = configService.get<string>('JWT_PUBLIC_KEY');
    const publicKey = publicKeyRaw?.includes('BEGIN PUBLIC KEY')
      ? publicKeyRaw
      : `-----BEGIN PUBLIC KEY-----\n${publicKeyRaw}\n-----END PUBLIC KEY-----`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    // Busca no banco ignorando filtros de segurança (admin, etc) para autenticação
    const user = await this.usersService.findByIdForAuth(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Usuário inativo.');
    }

    return { 
      id: user.id, 
      email: user.email,
      role: user.role, 
      secretary: user.secretary 
    };
  }
}