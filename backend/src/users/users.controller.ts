import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/role.enum';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  private readonly SECRET_CODE = process.env.USER_VERIFICATION_CODE;

  constructor(private readonly usersService: UsersService) { }
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getAdminData() {
    return { message: 'Admin-only data' };
  }

  @Post('create')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  createUser(@Body() user: User) {
    return this.usersService.create(user.username, user.password);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateUser(@Param('id') id: string, @Body() userDto: User) {
    return this.usersService.update(+id, userDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  deleteUser(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Post('admin-verify')
  async handleAdminVerify(@Body() body: { code: string }) {
    if (body.code !== this.SECRET_CODE) {
      throw new ForbiddenException('Code incorrect');
    }

    return await this.usersService.adminVerify();
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const userId = req.user.userId;
    const isValid = await this.usersService.verifyPassword(userId, body.currentPassword);

    if (!isValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    await this.usersService.changePassword(userId, body.newPassword);
    return { message: 'Mot de passe modifié avec succès' };
  }

  @Patch(':id/ban')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async banUser(@Param('id') id: string) {
    await this.usersService.banUser(+id);
    return { message: 'User banned successfully' };
  }

  @Patch(':id/unban')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async unbanUser(@Param('id') id: string) {
    await this.usersService.unbanUser(+id);
    return { message: 'User unbanned successfully' };
  }
}
