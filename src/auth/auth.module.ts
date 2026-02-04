import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; 
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { InternalAuthController } from './internal-auth.controller';

@Module({
  imports: [
    UsersModule, // Para buscar usuários
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { 
          // O TypeScript reclama se não fizermos esse cast, pois ele acha que string é "muito genérico"
          expiresIn: configService.get('JWT_EXPIRATION') as any 
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, InternalAuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService], // Exportamos caso outro módulo precise validar tokens
})
export class AuthModule {}