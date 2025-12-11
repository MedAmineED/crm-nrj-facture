import { Controller, Get, Query, UseGuards, Patch, Delete, Param, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientService } from './client.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';

@Controller('client')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClientController {
    constructor(private readonly clientService: ClientService) { }

    @Get('all')
    @Roles(Role.ADMIN)
    async findAll(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('profile') profile?: string,
        @Query('status') status?: string,
        @Query('raisonSociale') raisonSociale?: string,
        @Query('num_client') num_client?: string,
        @Query('hasInvoices') hasInvoices?: 'with' | 'without' | 'all',
        @Query('search') search?: string,
        // New filters based on invoice data
        @Query('departement') departement?: string,
        @Query('code_postal') code_postal?: string,
        @Query('adresse_site') adresse_site?: string,
        @Query('montant_ttc_min') montant_ttc_min?: string,
        @Query('montant_ttc_max') montant_ttc_max?: string,
        @Query('conso_annuelle_min') conso_annuelle_min?: string,
        @Query('conso_annuelle_max') conso_annuelle_max?: string,
    ) {
        return this.clientService.findAll({
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            profile,
            status,
            raisonSociale,
            num_client,
            hasInvoices,
            search,
            departement,
            code_postal,
            adresse_site,
            montant_ttc_min: montant_ttc_min ? parseFloat(montant_ttc_min) : undefined,
            montant_ttc_max: montant_ttc_max ? parseFloat(montant_ttc_max) : undefined,
            conso_annuelle_min: conso_annuelle_min ? parseFloat(conso_annuelle_min) : undefined,
            conso_annuelle_max: conso_annuelle_max ? parseFloat(conso_annuelle_max) : undefined,
        });
    }

    @Get('statuses')
    @Roles(Role.ADMIN)
    async getDistinctStatuses() {
        return this.clientService.getDistinctStatuses();
    }

    @Get(':id')
    @Roles(Role.USER, Role.ADMIN)
    async findOne(@Param('id') id: string) {
        return this.clientService.findOne(+id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN)
    async update(
        @Param('id') id: string,
        @Body() updateClientDto: { profile?: string; status?: string; raisonSociale?: string },
    ) {
        return this.clientService.update(+id, updateClientDto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    async remove(@Param('id') id: string) {
        return this.clientService.remove(+id);
    }
}
