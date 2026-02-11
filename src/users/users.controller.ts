import { 
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, 
  ParseUUIDPipe, ClassSerializerInterceptor, UseInterceptors, Query, DefaultValuePipe, ParseIntPipe
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '@prisma/client';
// Importação como 'type' para evitar erro de metadados
import type { ICurrentUser } from '../auth/current-user.interface';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor) // 🔒 Ativa o @Exclude da Entity
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: ICurrentUser) {
    return this.usersService.create(createUserDto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: ICurrentUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(user, page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ICurrentUser) {
    return this.usersService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: ICurrentUser
  ) {
    return this.usersService.update(id, updateUserDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/inactivate')
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  inactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ICurrentUser) {
    return this.usersService.inactivate(id, user);
  }
}