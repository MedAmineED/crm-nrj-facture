import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, Request, ParseIntPipe, Query } from '@nestjs/common';
import { ClientAssignmentService } from './client-assignment.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

@Controller('client-assignments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClientAssignmentController {
    constructor(private readonly clientAssignmentService: ClientAssignmentService) { }

    // ==========================================
    // USER + ADMIN ACCESSIBLE ROUTES (put first to avoid route conflicts)
    // ==========================================

    @Get('my-stats')
    @Roles(Role.USER, Role.ADMIN)
    async getMyStats(@Request() req) {
        return this.clientAssignmentService.getUserDashboardStats(req.user.userId);
    }

    @Get('my-clients')
    @Roles(Role.USER, Role.ADMIN)
    async getMyClients(@Request() req) {
        return this.clientAssignmentService.getUserClients(req.user.userId);
    }

    @Get('my-clients-filtered')
    @Roles(Role.USER, Role.ADMIN)
    async getMyClientsFiltered(
        @Request() req,
        @Query('status') status?: string,
        @Query('raisonSociale') raisonSociale?: string,
        @Query('num_client') num_client?: string,
        @Query('departement') departement?: string,
        @Query('code_postal') code_postal?: string,
        @Query('adresse_site') adresse_site?: string,
        @Query('montant_ttc_min') montant_ttc_min?: string,
        @Query('montant_ttc_max') montant_ttc_max?: string,
        @Query('conso_annuelle_min') conso_annuelle_min?: string,
        @Query('conso_annuelle_max') conso_annuelle_max?: string,
    ) {
        return this.clientAssignmentService.getMyClientsWithFilters(req.user.userId, {
            status,
            raisonSociale,
            num_client,
            departement,
            code_postal,
            adresse_site,
            montant_ttc_min: montant_ttc_min ? parseFloat(montant_ttc_min) : undefined,
            montant_ttc_max: montant_ttc_max ? parseFloat(montant_ttc_max) : undefined,
            conso_annuelle_min: conso_annuelle_min ? parseFloat(conso_annuelle_min) : undefined,
            conso_annuelle_max: conso_annuelle_max ? parseFloat(conso_annuelle_max) : undefined,
        });
    }

    @Patch(':id/status')
    @Roles(Role.USER, Role.ADMIN)
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { status: string, comment: string },
        @Request() req
    ) {
        const isAdmin = req.user.role === 'admin';
        return this.clientAssignmentService.updateAssignmentStatus(id, body.status, body.comment, req.user.userId, isAdmin);
    }

    // ==========================================
    // ADMIN ONLY ROUTES
    // ==========================================

    @Post('assign')
    @Roles(Role.ADMIN)
    async assignClients(@Body() body: { clientIds: number[], userId: number }) {
        return this.clientAssignmentService.assignClientsToUser(body.clientIds, body.userId);
    }

    @Post('assign-by-department')
    @Roles(Role.ADMIN)
    async assignByDepartment(@Body() body: { departement: string, userId: number }) {
        return this.clientAssignmentService.assignByDepartment(body.departement, body.userId);
    }

    @Get('all')
    @Roles(Role.ADMIN)
    async getAllAssignments() {
        return this.clientAssignmentService.getAllAssignments();
    }

    @Get('by-client/:clientId')
    @Roles(Role.ADMIN)
    async getAssignmentsByClient(@Param('clientId', ParseIntPipe) clientId: number) {
        return this.clientAssignmentService.getAssignmentsByClientId(clientId);
    }

    @Get('assignable/:userId')
    @Roles(Role.ADMIN)
    async getAssignableClients(@Param('userId', ParseIntPipe) userId: number) {
        return this.clientAssignmentService.getAssignableClients(userId);
    }

    @Get('user/:userId')
    @Roles(Role.ADMIN)
    async getAssignmentsForUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query('status') status?: string,
        @Query('raisonSociale') raisonSociale?: string,
        @Query('num_client') num_client?: string,
        @Query('departement') departement?: string,
        @Query('code_postal') code_postal?: string,
        @Query('adresse_site') adresse_site?: string,
        @Query('montant_ttc_min') montant_ttc_min?: string,
        @Query('montant_ttc_max') montant_ttc_max?: string,
        @Query('conso_annuelle_min') conso_annuelle_min?: string,
        @Query('conso_annuelle_max') conso_annuelle_max?: string,
    ) {
        return this.clientAssignmentService.getAssignmentsForUser(userId, {
            status,
            raisonSociale,
            num_client,
            departement,
            code_postal,
            adresse_site,
            montant_ttc_min: montant_ttc_min ? parseFloat(montant_ttc_min) : undefined,
            montant_ttc_max: montant_ttc_max ? parseFloat(montant_ttc_max) : undefined,
            conso_annuelle_min: conso_annuelle_min ? parseFloat(conso_annuelle_min) : undefined,
            conso_annuelle_max: conso_annuelle_max ? parseFloat(conso_annuelle_max) : undefined,
        });
    }

    @Delete(':id/revoke')
    @Roles(Role.ADMIN)
    async revokeAssignment(@Param('id', ParseIntPipe) id: number) {
        await this.clientAssignmentService.revokeAssignment(id);
        return { success: true };
    }

    @Delete('user/:userId/revoke-all')
    @Roles(Role.ADMIN)
    async revokeAllForUser(@Param('userId', ParseIntPipe) userId: number) {
        const count = await this.clientAssignmentService.revokeAllForUser(userId);
        return { revoked: count };
    }

    @Delete('revoke-by-department')
    @Roles(Role.ADMIN)
    async revokeByDepartment(@Body() body: { departement: string, userId: number }) {
        const count = await this.clientAssignmentService.revokeByDepartment(body.departement, body.userId);
        return { revoked: count };
    }
}
