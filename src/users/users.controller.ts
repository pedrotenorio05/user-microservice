import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard) // segurança em todas as rotas 
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.GESTOR) // Apenas Admin e Gestor criam
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: any // recebe quem está logado
  ) {
    
    return this.usersService.create(createUserDto, currentUser); 
  }

  @Get()
  // Passamos o @CurrentUser() para o Service filtrar a lista
  findAll(@CurrentUser() user: any) {
    return this.usersService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  // Passamos o @CurrentUser() para o Service validar se pode editar 
  update(
    @Param('id') id: string, 
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any
  ) {
    return this.usersService.update(id, updateUserDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN) // Apenas ADMIN pode deletar (hard delete)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

 @Patch(':id/inactivate')
  // Operadores não podem inativar (apenas Admin e Gestor na lista)
  @Roles(UserRole.ADMIN, UserRole.GESTOR) 
  inactivate(
    @Param('id') id: string,
    @CurrentUser() user: any // pra saber quem está inativando
  ) {
    return this.usersService.inactivate(id, user);
  }
}