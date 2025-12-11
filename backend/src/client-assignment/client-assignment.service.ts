import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClientAssignment } from './entities/client-assignment.entity';
import { UsersService } from '../users/users.service';
import { ClientService } from '../client/client.service';
import { Facture } from '../facture/entities/facture.entity';

@Injectable()
export class ClientAssignmentService {
    constructor(
        @InjectRepository(ClientAssignment)
        private clientAssignmentRepository: Repository<ClientAssignment>,
        @InjectRepository(Facture)
        private factureRepository: Repository<Facture>,
        private usersService: UsersService,
        private clientService: ClientService,
    ) { }

    async assignClientsToUser(clientIds: number[], userId: number): Promise<ClientAssignment[]> {
        const user = await this.usersService.findOneById(userId); // Assuming findOne exists and returns user or throws
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify clients exist
        // ClientService might not have findByIds, so we might need to use repository if exposed or add method
        // For now assuming we can just try to save. But better to check.
        // Let's assume clientService has a method to check or we just proceed.
        // Ideally we should check if they are already assigned to THIS user to avoid duplicates?
        // The requirement says "Multi-Assignment", so same client can be assigned to multiple users.
        // But same client to SAME user multiple times? Probably not.

        const existingAssignments = await this.clientAssignmentRepository.find({
            where: {
                user: { id: userId },
                client: { id: In(clientIds) },
                isActive: true
            },
            relations: ['client']
        });

        const existingClientIds = existingAssignments.map(a => a.client.id);
        const newClientIds = clientIds.filter(id => !existingClientIds.includes(id));

        if (newClientIds.length === 0) {
            return [];
        }

        const assignments = [];
        for (const clientId of newClientIds) {
            const client = await this.clientService.findOne(clientId); // Assuming findOne exists
            if (client) {
                const assignment = this.clientAssignmentRepository.create({
                    user,
                    client,
                    status: 'New',
                    assignedAt: new Date(),
                    isActive: true
                });
                assignments.push(assignment);
            }
        }

        return this.clientAssignmentRepository.save(assignments);
    }

    async getUserClients(userId: number): Promise<ClientAssignment[]> {
        return this.clientAssignmentRepository.find({
            where: { user: { id: userId }, isActive: true },
            relations: ['client'],
            order: { assignedAt: 'DESC' }
        });
    }

    async updateAssignmentStatus(assignmentId: number, status: string, comment: string, userId: number, isAdmin: boolean = false): Promise<ClientAssignment> {
        let assignment: ClientAssignment | null;

        if (isAdmin) {
            // Admin can update any assignment
            assignment = await this.clientAssignmentRepository.findOne({
                where: { id: assignmentId }
            });
        } else {
            // User can only update their own assignments
            assignment = await this.clientAssignmentRepository.findOne({
                where: { id: assignmentId, user: { id: userId } }
            });
        }

        if (!assignment) {
            throw new NotFoundException('Assignment not found or does not belong to user');
        }

        assignment.status = status;
        if (comment !== undefined) {
            assignment.comment = comment;
        }

        return this.clientAssignmentRepository.save(assignment);
    }

    async getAssignmentsByClientId(clientId: number): Promise<ClientAssignment[]> {
        return this.clientAssignmentRepository.find({
            where: { client: { id: clientId }, isActive: true },
            relations: ['user', 'client'],
            order: { assignedAt: 'DESC' }
        });
    }

    async getAssignableClients(userId: number): Promise<{ id: number; isAssigned: boolean }[]> {
        const { clients } = await this.clientService.findAll({ limit: 10000 });
        const existingAssignments = await this.clientAssignmentRepository.find({
            where: { user: { id: userId }, isActive: true },
            relations: ['client']
        });
        const assignedClientIds = new Set(existingAssignments.map(a => a.client.id));

        return clients.map(client => ({
            id: client.id,
            isAssigned: assignedClientIds.has(client.id)
        }));
    }

    async assignByDepartment(departement: string, userId: number): Promise<{ assigned: number; skipped: number }> {
        const user = await this.usersService.findOneById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Get all clients with invoices in this department
        const { clients } = await this.clientService.findAll({ departement, limit: 100000 });

        // Get existing assignments for this user
        const existingAssignments = await this.clientAssignmentRepository.find({
            where: { user: { id: userId }, isActive: true },
            relations: ['client']
        });
        const assignedClientIds = new Set(existingAssignments.map(a => a.client.id));

        const newAssignments = [];
        let skipped = 0;

        for (const client of clients) {
            if (assignedClientIds.has(client.id)) {
                skipped++;
                continue;
            }
            newAssignments.push(this.clientAssignmentRepository.create({
                user,
                client,
                status: 'New',
                assignedAt: new Date(),
                isActive: true
            }));
        }

        if (newAssignments.length > 0) {
            await this.clientAssignmentRepository.save(newAssignments);
        }

        return { assigned: newAssignments.length, skipped };
    }

    async revokeAssignment(assignmentId: number): Promise<void> {
        const assignment = await this.clientAssignmentRepository.findOne({ where: { id: assignmentId } });
        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }
        assignment.isActive = false;
        await this.clientAssignmentRepository.save(assignment);
    }

    async revokeAllForUser(userId: number): Promise<number> {
        const result = await this.clientAssignmentRepository.update(
            { user: { id: userId }, isActive: true },
            { isActive: false }
        );
        return result.affected || 0;
    }

    async revokeByDepartment(departement: string, userId: number): Promise<number> {
        // Get all clients with invoices in this department
        const { clients } = await this.clientService.findAll({ departement, limit: 100000 });
        const clientIds = clients.map(c => c.id);

        if (clientIds.length === 0) {
            return 0;
        }

        // Find assignments for this user with these clients
        const assignments = await this.clientAssignmentRepository.find({
            where: {
                user: { id: userId },
                client: { id: In(clientIds) },
                isActive: true
            },
            relations: ['client']
        });

        if (assignments.length === 0) {
            return 0;
        }

        // Revoke all matching assignments
        const assignmentIds = assignments.map(a => a.id);
        const result = await this.clientAssignmentRepository.update(
            { id: In(assignmentIds) },
            { isActive: false }
        );

        return result.affected || 0;
    }

    async getAssignmentsForUser(userId: number, filters?: {
        status?: string;
        raisonSociale?: string;
        num_client?: string;
        departement?: string;
        code_postal?: string;
        adresse_site?: string;
        montant_ttc_min?: number;
        montant_ttc_max?: number;
        conso_annuelle_min?: number;
        conso_annuelle_max?: number;
    }): Promise<ClientAssignment[]> {
        // First get all active assignments for the user
        const assignments = await this.clientAssignmentRepository.find({
            where: { user: { id: userId }, isActive: true },
            relations: ['client'],
            order: { assignedAt: 'DESC' }
        });

        if (!filters || Object.keys(filters).every(k => !filters[k])) {
            return assignments;
        }

        // Get client IDs from assignments
        const clientIds = assignments.map(a => a.client.id);
        if (clientIds.length === 0) {
            return [];
        }

        // Use clientService.findAll with filters to get matching clients
        const { clients } = await this.clientService.findAll({
            limit: 100000,
            ...filters
        });

        const matchingClientIds = new Set(clients.map(c => c.id));

        // Filter assignments to only include those with matching clients
        return assignments.filter(a => matchingClientIds.has(a.client.id));
    }

    async getAllAssignments(): Promise<ClientAssignment[]> {
        return this.clientAssignmentRepository.find({
            where: { isActive: true },
            relations: ['client', 'user'],
            order: { assignedAt: 'DESC' }
        });
    }

    async getUserDashboardStats(userId: number): Promise<{
        totalAssigned: number;
        statusBreakdown: Record<string, number>;
        recentAssignments: ClientAssignment[];
    }> {
        // Get all active assignments for this user
        const assignments = await this.clientAssignmentRepository.find({
            where: { user: { id: userId }, isActive: true },
            relations: ['client'],
            order: { assignedAt: 'DESC' }
        });

        // Calculate status breakdown
        const statusBreakdown: Record<string, number> = {};
        assignments.forEach(assignment => {
            const status = assignment.status || 'New';
            statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
        });

        // Get recent 5 assignments
        const recentAssignments = assignments.slice(0, 5);

        return {
            totalAssigned: assignments.length,
            statusBreakdown,
            recentAssignments
        };
    }

    async getMyClientsWithFilters(userId: number, filters?: {
        status?: string;
        raisonSociale?: string;
        num_client?: string;
        departement?: string;
        code_postal?: string;
        adresse_site?: string;
        montant_ttc_min?: number;
        montant_ttc_max?: number;
        conso_annuelle_min?: number;
        conso_annuelle_max?: number;
    }): Promise<ClientAssignment[]> {
        // Get all active assignments for the user with client data
        const assignments = await this.clientAssignmentRepository.find({
            where: { user: { id: userId }, isActive: true },
            relations: ['client'],
            order: { assignedAt: 'DESC' }
        });

        if (!filters || Object.keys(filters).every(k => !filters[k])) {
            return assignments;
        }

        // Check if we have invoice-based filters
        const hasInvoiceFilters = filters.departement || filters.code_postal ||
            filters.adresse_site || filters.montant_ttc_min || filters.montant_ttc_max ||
            filters.conso_annuelle_min || filters.conso_annuelle_max;

        // If we have invoice filters, fetch invoices for all assigned clients
        let clientInvoicesMap = new Map<string, any[]>();
        if (hasInvoiceFilters) {
            const clientNumList = assignments
                .filter(a => a.client?.num_client)
                .map(a => a.client.num_client);

            if (clientNumList.length > 0) {
                const invoices = await this.factureRepository.find({
                    where: { num_client: In(clientNumList) }
                });

                // Group invoices by num_client
                invoices.forEach(inv => {
                    if (!clientInvoicesMap.has(inv.num_client)) {
                        clientInvoicesMap.set(inv.num_client, []);
                    }
                    clientInvoicesMap.get(inv.num_client).push(inv);
                });
            }
        }

        // Apply filters
        return assignments.filter(assignment => {
            const client = assignment.client;

            // Status filter on assignment
            if (filters.status && assignment.status?.toLowerCase() !== filters.status.toLowerCase()) {
                return false;
            }

            // Client-level filters
            if (filters.raisonSociale && client?.raisonSociale) {
                if (!client.raisonSociale.toLowerCase().includes(filters.raisonSociale.toLowerCase())) {
                    return false;
                }
            }

            if (filters.num_client && client?.num_client) {
                if (!client.num_client.toLowerCase().includes(filters.num_client.toLowerCase())) {
                    return false;
                }
            }

            // Invoice-based filters
            if (hasInvoiceFilters && client?.num_client) {
                const invoices = clientInvoicesMap.get(client.num_client) || [];

                if (invoices.length === 0) return false;

                const matchingInvoice = invoices.some(inv => {
                    if (filters.departement) {
                        const invDept = inv.code_postal?.substring(0, 2);
                        if (invDept !== filters.departement) return false;
                    }
                    if (filters.code_postal && inv.code_postal !== filters.code_postal) {
                        return false;
                    }
                    if (filters.adresse_site && inv.adresse_site) {
                        if (!inv.adresse_site.toLowerCase().includes(filters.adresse_site.toLowerCase())) {
                            return false;
                        }
                    }
                    if (filters.montant_ttc_min && Number(inv.montant_ttc) < filters.montant_ttc_min) {
                        return false;
                    }
                    if (filters.montant_ttc_max && Number(inv.montant_ttc) > filters.montant_ttc_max) {
                        return false;
                    }
                    if (filters.conso_annuelle_min && Number(inv.conso_annuelle) < filters.conso_annuelle_min) {
                        return false;
                    }
                    if (filters.conso_annuelle_max && Number(inv.conso_annuelle) > filters.conso_annuelle_max) {
                        return false;
                    }
                    return true;
                });

                if (!matchingInvoice) return false;
            }

            return true;
        });
    }
}

