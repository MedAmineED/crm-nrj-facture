import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { AuthGuard } from '@nestjs/passport';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Assign contacts to a user
  @Post('assign-contacts')
  @Roles(Role.ADMIN)
  async assignContactsToUser(
    @Body()
    body: {
      userId: number;
      contactIds: number[];
      notes?: string;
    },
  ) {
    const adminId = body.userId; // Assuming you have user info in request
    return this.adminService.assignContactsToUser(
      body.userId,
      body.contactIds,
      adminId,
      body.notes,
    );
  }

  // Dashboard statistics
  @Get('dashboard/stats')
  @Roles(Role.ADMIN)
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // Delete facture service file
  @Delete('facture-service')
  @Roles(Role.ADMIN)
  async deleteFactureServiceFile() {
    const clTables = await this.adminService.clearAllTables();
    const dlFiles = await this.adminService.deleteFactureServiceFile();
    return {
      message: 'Facture service file deleted successfully',
      clTables,
      dlFiles,
    };
  }
}
