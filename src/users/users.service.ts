import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import type { ICurrentUser } from '../auth/current-user.interface';
import { UserStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, currentUser: ICurrentUser) {
    if (!this.validateCPF(dto.cpf)) throw new BadRequestException('CPF inválido.');

    // Regra de Hierarquia
    if (currentUser.role === 'GESTOR' && dto.role === 'ADMIN') {
      throw new ForbiddenException('Gestores não podem criar Administradores.');
    }

    // Regra de Isolamento na Criação
    if (currentUser.role === 'GESTOR' && dto.secretary !== currentUser.secretary) {
        throw new ForbiddenException('Você só pode criar usuários para a sua secretaria.');
    }

    // Validação de Secretaria Obrigatória
    if (dto.role !== 'ADMIN' && !dto.secretary) {
      throw new BadRequestException('Gestor/Operador deve estar vinculado a uma secretaria.');
    }

    const activationToken = randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    try {
      const user = await this.prisma.user.create({
        data: {
          ...dto,
          status: UserStatus.PENDING_PASSWORD,
          activationToken,
          tokenExpiresAt,
        },
      });

      console.log(`[EMAIL MOCK] Token para ${user.email}: ${activationToken}`);
      
      return new UserEntity(user);

    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('E-mail ou CPF já cadastrados.');
      throw error;
    }
  }

  async findAll(currentUser: ICurrentUser, page: number, limit: number) {
    const where: any = {};

    // 🔒 ISOLAMENTO: Gestor/Operador só vê gente da mesma secretaria
    if (currentUser.role !== 'ADMIN') {
      where.role = { not: 'ADMIN' };
      if (currentUser.secretary) {
        where.secretary = currentUser.secretary;
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Retorna instâncias de UserEntity para o interceptor funcionar corretamente
    return {
      data: users.map(user => new UserEntity(user)),
      meta: { total, page, lastPage: Math.ceil(total / limit) }
    };
  }

  async findOne(id: string, currentUser: ICurrentUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // 🔒 ISOLAMENTO e PRIVACIDADE
    if (currentUser.role !== 'ADMIN') {
      if (user.role === 'ADMIN') throw new ForbiddenException('Acesso negado.');
      
      if (user.secretary !== currentUser.secretary) {
        throw new ForbiddenException('Acesso negado: Usuário de outra secretaria.');
      }
    }

    return new UserEntity(user);
  }

  // Métodos auxiliares usados pelo AuthService
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByToken(token: string) {
    return this.prisma.user.findFirst({ where: { activationToken: token } });
  }

  async activateUser(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        password: passwordHash,     
        status: UserStatus.ACTIVE,           
        activationToken: null,      
        tokenExpiresAt: null,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto, currentUser: ICurrentUser) {
    if (dto.cpf || dto.name) throw new BadRequestException('CPF e Nome não podem ser alterados.');

    const targetUser = await this.findOne(id, currentUser); // Reutiliza a segurança do findOne

    // Unicidade de E-mail
    if (dto.email && dto.email !== targetUser.email) {
      const exists = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } }
      });
      if (exists) throw new ConflictException('Este e-mail já está em uso.');
    }

    // Regras de Permissão
    if (currentUser.role !== 'ADMIN') {
      if (dto.role === 'ADMIN') throw new ForbiddenException('Você não pode promover para Admin.');
      
      // 🔒 [NOVO] Bloqueio de alteração de secretaria por não-admins
      if (dto.secretary && dto.secretary !== currentUser.secretary) {
          throw new ForbiddenException('Apenas Administradores podem alterar a secretaria de um usuário.');
      }
    }

    // Regra do último gestor da secretaria
    if (targetUser.role === 'GESTOR' && dto.role && dto.role !== 'GESTOR') {
      const gestorCount = await this.prisma.user.count({
        where: { role: 'GESTOR', status: UserStatus.ACTIVE, secretary: targetUser.secretary }
      });
      if (gestorCount <= 1) throw new ForbiddenException('A secretaria não pode ficar sem Gestores.');
    }

    const { id: _, ...data } = dto;
    const updated = await this.prisma.user.update({ where: { id }, data });
    return new UserEntity(updated);
  }

  async remove(id: string) {
    // Soft Delete (Recomendado para manter integridade)
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    return this.prisma.user.update({
        where: { id },
        data: { 
            status: UserStatus.INACTIVE,
            // Se tiver coluna deletedAt: deletedAt: new Date() 
        }
    });
  }

  async inactivate(id: string, currentUser: ICurrentUser) {
    const targetUser = await this.findOne(id, currentUser); 

    if (targetUser.id === currentUser.id) throw new ForbiddenException('Não pode inativar a si mesmo.');
    
    if (currentUser.role !== 'ADMIN' && targetUser.role === 'ADMIN') {
        throw new ForbiddenException('Gestores não podem inativar Administradores.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.INACTIVE,
        inactivatedAt: new Date(),
        inactivatedById: currentUser.id,
      },
    });
    return new UserEntity(updated);
  }

  private validateCPF(cpf: string): boolean {
    if (!cpf) return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    
    const validateDigit = (t: number) => {
      let d1 = 0;
      for (let i = 0; i < t; i++) d1 += parseInt(cpf.substring(i, i + 1)) * (t + 1 - i);
      d1 = (d1 * 10) % 11;
      if (d1 === 10 || d1 === 11) d1 = 0;
      return d1 === parseInt(cpf.substring(t, t + 1));
    }
    return validateDigit(9) && validateDigit(10);
  }

  // Uso interno apenas (Auth Strategy)
  async findByIdForAuth(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}