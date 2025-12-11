import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './role.enum';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Handle case where roles might be a string (simple-array sometimes behaves oddly)
    let userRoles = user?.roles;
    if (typeof userRoles === 'string') {
      userRoles = userRoles.split(',').map(r => r.trim().toLowerCase());
    } else if (Array.isArray(userRoles)) {
      // Normalize to lowercase for comparison
      userRoles = userRoles.map(r => r.toLowerCase());
    }

    // Compare with lowercase required roles
    const hasRole = requiredRoles.some((role) => userRoles?.includes(role.toLowerCase()));

    return hasRole;
  }
}
