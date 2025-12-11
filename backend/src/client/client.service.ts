import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';

import { Contact } from '../contact/entities/contact.entity';
import { Facture } from '../facture/entities/facture.entity';

@Injectable()
export class ClientService {
    constructor(
        @InjectRepository(Client)
        private clientRepository: Repository<Client>,
        @InjectRepository(Contact)
        private contactRepository: Repository<Contact>,
    ) { }

    async findOneByNumClient(num_client: string): Promise<Client | null> {
        const client = await this.clientRepository.findOne({
            where: { num_client },
        });
        if (client) {
            client.contacts = await this.contactRepository.find({
                where: { num_client: client.num_client },
            });
        }
        return client;
    }

    async findOne(id: number): Promise<Client | null> {
        const client = await this.clientRepository.findOne({
            where: { id },
        });
        if (client) {
            client.contacts = await this.contactRepository.find({
                where: { num_client: client.num_client },
            });
        }
        return client;
    }

    async createOrUpdate(
        num_client: string,
        profile: string,
        status: string,
        raisonSociale: string,
    ): Promise<Client> {
        console.log('Creating/updating client:', { num_client, profile, status, raisonSociale });

        // Check if client exists
        let client = await this.findOneByNumClient(num_client);

        if (client) {
            // Update existing client if needed
            if (profile) client.profile = profile;
            if (status) client.status = status;
            if (raisonSociale) client.raisonSociale = raisonSociale;
            return await this.clientRepository.save(client);
        } else {
            // Create new client
            client = this.clientRepository.create({
                num_client,
                profile: profile || null,
                status: status || 'active',
                raisonSociale: raisonSociale || null,
            });
            return await this.clientRepository.save(client);
        }
    }

    async findAll(filters?: {
        page?: number;
        limit?: number;
        profile?: string;
        status?: string;
        raisonSociale?: string;
        num_client?: string;
        hasInvoices?: 'with' | 'without' | 'all';
        search?: string;
        // New filters based on invoice data
        departement?: string;
        code_postal?: string;
        adresse_site?: string;
        montant_ttc_min?: number;
        montant_ttc_max?: number;
        conso_annuelle_min?: number;
        conso_annuelle_max?: number;
    }): Promise<{ clients: Client[]; totalCount: number }> {
        // Step 1: Build a query to get distinct client IDs matching the filters
        const idsQueryBuilder = this.clientRepository
            .createQueryBuilder('client')
            .select('DISTINCT client.id', 'id')
            // Join factures for filtering (no contacts here to avoid GROUP BY issues)
            .leftJoin(Facture, 'facture', 'facture.num_client = client.num_client');

        // Also need to join contacts for search filter
        if (filters?.search) {
            idsQueryBuilder.leftJoin(Contact, 'contact', 'contact.num_client = client.num_client');
        }

        if (filters?.profile) {
            idsQueryBuilder.andWhere('client.profile = :profile', {
                profile: filters.profile,
            });
        }

        if (filters?.status) {
            idsQueryBuilder.andWhere('client.status = :status', {
                status: filters.status,
            });
        }

        if (filters?.raisonSociale) {
            idsQueryBuilder.andWhere('client.raisonSociale LIKE :raisonSociale', {
                raisonSociale: `%${filters.raisonSociale}%`,
            });
        }

        if (filters?.num_client) {
            idsQueryBuilder.andWhere('client.num_client LIKE :num_client', {
                num_client: `%${filters.num_client}%`,
            });
        }

        if (filters?.search) {
            idsQueryBuilder.andWhere(
                '(client.num_client LIKE :search OR client.raisonSociale LIKE :search OR client.profile LIKE :search OR contact.nom LIKE :search OR contact.prenom LIKE :search OR contact.email LIKE :search)',
                { search: `%${filters.search}%` },
            );
        }

        if (filters?.hasInvoices === 'with') {
            idsQueryBuilder.andWhere('facture.id IS NOT NULL');
        } else if (filters?.hasInvoices === 'without') {
            idsQueryBuilder.andWhere('facture.id IS NULL');
        }

        // New filters based on invoice data
        if (filters?.departement) {
            idsQueryBuilder.andWhere('LEFT(facture.code_postal, 2) = :departement', {
                departement: filters.departement,
            });
        }

        if (filters?.code_postal) {
            idsQueryBuilder.andWhere('facture.code_postal LIKE :code_postal', {
                code_postal: `%${filters.code_postal}%`,
            });
        }

        if (filters?.adresse_site) {
            idsQueryBuilder.andWhere('facture.adresse_site LIKE :adresse_site', {
                adresse_site: `%${filters.adresse_site}%`,
            });
        }

        if (filters?.montant_ttc_min !== undefined && filters?.montant_ttc_min !== null) {
            idsQueryBuilder.andWhere('facture.montant_ttc >= :montant_ttc_min', {
                montant_ttc_min: filters.montant_ttc_min,
            });
        }

        if (filters?.montant_ttc_max !== undefined && filters?.montant_ttc_max !== null) {
            idsQueryBuilder.andWhere('facture.montant_ttc <= :montant_ttc_max', {
                montant_ttc_max: filters.montant_ttc_max,
            });
        }

        if (filters?.conso_annuelle_min !== undefined && filters?.conso_annuelle_min !== null) {
            idsQueryBuilder.andWhere('CAST(REGEXP_REPLACE(facture.conso_annuelle, \'[^0-9]\', \'\') AS UNSIGNED) >= :conso_annuelle_min', {
                conso_annuelle_min: filters.conso_annuelle_min,
            });
        }

        if (filters?.conso_annuelle_max !== undefined && filters?.conso_annuelle_max !== null) {
            idsQueryBuilder.andWhere('CAST(REGEXP_REPLACE(facture.conso_annuelle, \'[^0-9]\', \'\') AS UNSIGNED) <= :conso_annuelle_max', {
                conso_annuelle_max: filters.conso_annuelle_max,
            });
        }

        // Get the total count of distinct clients
        const countResult = await idsQueryBuilder.clone().getRawMany();
        const totalCount = countResult.length;

        // Apply pagination
        idsQueryBuilder.orderBy('client.id', 'ASC');
        if (filters?.page && filters?.limit) {
            const skip = (filters.page - 1) * filters.limit;
            idsQueryBuilder.offset(skip).limit(filters.limit);
        }

        // Get the client IDs
        const clientIdsResult = await idsQueryBuilder.getRawMany();
        const clientIds = clientIdsResult.map(row => row.id);

        if (clientIds.length === 0) {
            return { clients: [], totalCount };
        }

        // Step 2: Load the full client data with contacts for the selected IDs
        const clients = await this.clientRepository
            .createQueryBuilder('client')
            .leftJoinAndMapMany('client.contacts', Contact, 'contact', 'contact.num_client = client.num_client')
            .whereInIds(clientIds)
            .orderBy('client.id', 'ASC')
            .getMany();

        return { clients, totalCount };
    }

    async getDistinctStatuses(): Promise<string[]> {
        const result = await this.clientRepository
            .createQueryBuilder('client')
            .select('DISTINCT client.status', 'status')
            .where('client.status IS NOT NULL')
            .andWhere('client.status != :empty', { empty: '' })
            .orderBy('client.status', 'ASC')
            .getRawMany();

        return result.map(row => row.status);
    }

    async update(id: number, updateClientDto: { profile?: string; status?: string; raisonSociale?: string; comment?: string }): Promise<Client> {
        const client = await this.clientRepository.findOne({ where: { id } });
        if (!client) {
            throw new Error('Client not found');
        }
        if (updateClientDto.profile !== undefined) client.profile = updateClientDto.profile;
        if (updateClientDto.status !== undefined) client.status = updateClientDto.status;
        if (updateClientDto.raisonSociale !== undefined) client.raisonSociale = updateClientDto.raisonSociale;
        if (updateClientDto.comment !== undefined) client.comment = updateClientDto.comment;
        return await this.clientRepository.save(client);
    }

    async remove(id: number): Promise<void> {
        await this.clientRepository.delete(id);
    }
    async createOrUpdateBatch(
        clientsData: {
            num_client: string;
            profile?: string;
            status?: string;
            raisonSociale?: string;
        }[],
    ): Promise<void> {
        if (clientsData.length === 0) return;

        console.log(`Processing batch of ${clientsData.length} clients`);

        // 1. Fetch existing clients
        const numClients = clientsData.map((c) => c.num_client);
        const existingClients = await this.clientRepository.find({
            where: numClients.map((num_client) => ({ num_client })),
            select: ['id', 'num_client', 'profile', 'status', 'raisonSociale'], // Only select needed fields
        });

        const existingClientsMap = new Map(
            existingClients.map((c) => [c.num_client, c]),
        );

        const toInsert: Client[] = [];
        const toUpdate: Client[] = [];

        for (const data of clientsData) {
            const existing = existingClientsMap.get(data.num_client);
            if (existing) {
                // Update fields if provided
                let changed = false;
                if (data.profile && existing.profile !== data.profile) {
                    existing.profile = data.profile;
                    changed = true;
                }
                if (data.status && existing.status !== data.status) {
                    existing.status = data.status;
                    changed = true;
                }
                if (data.raisonSociale && existing.raisonSociale !== data.raisonSociale) {
                    existing.raisonSociale = data.raisonSociale;
                    changed = true;
                }
                if (changed) {
                    toUpdate.push(existing);
                }
            } else {
                // Create new
                const newClient = this.clientRepository.create({
                    num_client: data.num_client,
                    profile: data.profile || null,
                    status: data.status || 'active',
                    raisonSociale: data.raisonSociale || null,
                });
                toInsert.push(newClient);
            }
        }

        // 2. Bulk Insert
        if (toInsert.length > 0) {
            await this.clientRepository.insert(toInsert);
        }

        // 3. Bulk Update
        if (toUpdate.length > 0) {
            await this.clientRepository.save(toUpdate);
        }
    }
}
