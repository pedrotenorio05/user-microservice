import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Lê a etiqueta "Roles" que colocamos na rota
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Se a rota não exige cargo específico, deixa passar (o AuthGuard já garantiu que está logado)
    if (!requiredRoles) {
      return true;
    }

    // 2. Pega os dados do usuário (que o JwtStrategy colocou lá)
    const { user } = context.switchToHttp().getRequest();
    
    // 3. Verifica: O cargo do usuário está na lista de permitidos?
    return requiredRoles.some((role) => user.role === role);
  }
}