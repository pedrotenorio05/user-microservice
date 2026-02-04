import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // CORREÇÃO: Adicionamos 'as string' para garantir ao TS que não é undefined
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: any) {
    if (payload.status !== 'ACTIVE') {
       throw new UnauthorizedException('Sua conta não está ativa.');
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}