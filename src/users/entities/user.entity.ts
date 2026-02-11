import { Exclude } from 'class-transformer';
import { UserRole, UserStatus } from '@prisma/client';

export class UserEntity {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  secretary: string | null;
  
  @Exclude() // Garante que a senha NUNCA saia da API
  password: string | null;

  @Exclude() // Esconde o token de ativação
  activationToken: string | null;

  @Exclude()
  tokenExpiresAt: Date | null;

  createdAt: Date;
  updatedAt: Date;

  // Helper para criar a instância rapidamente
  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}