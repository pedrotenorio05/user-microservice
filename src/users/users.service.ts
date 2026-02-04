import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatus } from '@prisma/client'; 
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, currentUser: any) {
    // [RN06] - Validação de CPF (Algoritmo)
    if (!this.validateCPF(createUserDto.cpf)) {
      throw new BadRequestException('CPF inválido.');
    }

    // [RN06 e RN07] - Unicidade (Email e CPF)
    const userExists = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: createUserDto.email }, { cpf: createUserDto.cpf }],
      },
    });
    if (userExists) {
      throw new ConflictException('E-mail ou CPF já cadastrados.');
    }

    // [RN04] - Hierarquia de Criação
    // Gestor só pode criar Gestor ou Operador
    if (currentUser.role === 'GESTOR' && createUserDto.role === 'ADMIN') {
      throw new ForbiddenException('Gestores não podem criar Administradores.');
    }

    // [RN05] - Obrigatoriedade de Secretaria
    // Se NÃO for Admin, TEM que ter secretaria
    if (createUserDto.role !== 'ADMIN' && !createUserDto.secretary) {
      throw new BadRequestException('Usuários do tipo Gestor ou Operador devem estar vinculados a uma secretaria.');
    }

    // Gera token de ativação
    const activationToken = crypto.randomUUID();
    // [RN08] - Validade de 24h
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        status: 'PENDING_PASSWORD', // [RN09]
        activationToken,
        tokenExpiresAt,
      },
    });

    // [RN01] - Mock do envio de e-mail (Console Log)
    console.log(`
      📨 [MOCK EMAIL SERVICE]
      Para: ${user.email}
      Assunto: Bem-vindo ao Sistema! Ative sua conta.
      Link: http://frontend.com/activate?token=${activationToken}
      (Válido por 24h)
    `);

    // Retorna sem a senha e dados sensíveis
    const { password, activationToken: _, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

 findAll(currentUser: any) {
    const where: any = {};

    if (currentUser.role !== 'ADMIN') {
      where.role = { not: 'ADMIN' };
    }
    
    return this.prisma.user.findMany({
      where,
      orderBy: { name: 'asc' }, 
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado'); // Erro 404
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any) {
    //  Bloquear edição de CPF e Nome
    if (updateUserDto.cpf || updateUserDto.name) {
      throw new BadRequestException('CPF e Nome completo não podem ser alterados.');
    }

    // Busca o usuário alvo (quem será editado)
    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    if (!targetUser) throw new NotFoundException('Usuário alvo não encontrado');

    // Se quem está tentando editar NÃO é Admin...
    if (currentUser.role !== 'ADMIN') {
      // ... ele não pode editar em um ADMIN
      if (targetUser.role === 'ADMIN') {
        throw new ForbiddenException('Você não tem permissão para editar um Administrador.');
      }
    }

    // Se está tentando mudar o cargo de GESTOR para qualquer outra coisa
    if (targetUser.role === 'GESTOR' && updateUserDto.role && updateUserDto.role !== 'GESTOR') {
      // Conta quantos gestores ativos restam
      const gestorCount = await this.prisma.user.count({
        where: { role: 'GESTOR', status: 'ACTIVE' }
      });

      if (gestorCount <= 1) {
        throw new ForbiddenException('Operação negada: A unidade não pode ficar sem nenhum Gestor.');
      }
    }

    // Removemos o ID do DTO para segurança e atualizamos
    const { id: _, ...data } = updateUserDto;

    return this.prisma.user.update({
      where: { id },
      data: data,
    });
  }

  async remove(id: string) {
    await this.findOne(id); 
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async inactivate(id: string, currentUser: any) {
    const targetUser = await this.prisma.user.findUnique({ where: { id } });

    if (!targetUser) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // Um usuário não pode inativar a si mesmo
    if (targetUser.id === currentUser.id) {
      throw new ForbiddenException('Você não pode inativar sua própria conta.');
    }

    // Se quem está inativando NÃO é Admin (ou seja, é Gestor)...
    if (currentUser.role !== 'ADMIN') {
      // ... ele não pode inativar um Admin
      if (targetUser.role === 'ADMIN') {
        throw new ForbiddenException('Gestores não podem inativar Administradores.');
      }
      // Gestor pode inativar Gestor e Operador
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'INACTIVE', 
        inactivatedAt: new Date(), 
        inactivatedById: currentUser.id,
      },
    });
  }

  async findByToken(token: string) {
    return this.prisma.user.findFirst({
      where: { activationToken: token },
    });
  }

  async activateUser(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        password: passwordHash,     
        status: 'ACTIVE',           
        activationToken: null,      
        tokenExpiresAt: null,
      },
    });
  }

  private validateCPF(cpf: string): boolean {
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

}