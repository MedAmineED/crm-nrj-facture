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
    }): Promise<{ clients: Client[]; totalCount: number }> {
        const queryBuilder = this.clientRepository
            .createQueryBuilder('client')
            // Join contacts manually on num_client
            .leftJoinAndMapMany('client.contacts', Contact, 'contact', 'contact.num_client = client.num_client')
            // Join factures manually on num_client for filtering
            .leftJoin(Facture, 'facture', 'facture.num_client = client.num_client');

        if (filters?.profile) {
            queryBuilder.andWhere('client.profile = :profile', {
                profile: filters.profile,
            });
        }

        if (filters?.status) {
            queryBuilder.andWhere('client.status = :status', {
                status: filters.status,
            });
        }

        if (filters?.raisonSociale) {
            queryBuilder.andWhere('client.raisonSociale LIKE :raisonSociale', {
                raisonSociale: `%${filters.raisonSociale}%`,
            });
        }

        if (filters?.num_client) {
            queryBuilder.andWhere('client.num_client LIKE :num_client', {
                num_client: `%${filters.num_client}%`,
            });
        }

        if (filters?.search) {
            queryBuilder.andWhere(
                '(client.num_client LIKE :search OR client.raisonSociale LIKE :search OR client.profile LIKE :search OR contact.nom LIKE :search OR contact.prenom LIKE :search OR contact.email LIKE :search)',
                { search: `%${filters.search}%` },
            );
        }

        if (filters?.hasInvoices === 'with') {
            queryBuilder.andWhere('facture.id IS NOT NULL');
        } else if (filters?.hasInvoices === 'without') {
            queryBuilder.andWhere('facture.id IS NULL');
        }

        if (filters?.page && filters?.limit) {
            const skip = (filters.page - 1) * filters.limit;
            queryBuilder.skip(skip).take(filters.limit);
        }

        const [clients, totalCount] = await queryBuilder.getManyAndCount();
        return { clients, totalCount };
    }

    async update(id: number, updateClientDto: { profile?: string; status?: string; raisonSociale?: string }): Promise<Client> {
        const client = await this.clientRepository.findOne({ where: { id } });
        if (!client) {
            throw new Error('Client not found');
        }
        if (updateClientDto.profile) client.profile = updateClientDto.profile;
        if (updateClientDto.status) client.status = updateClientDto.status;
        if (updateClientDto.raisonSociale) client.raisonSociale = updateClientDto.raisonSociale;
        return await this.clientRepository.save(client);
    }

    async remove(id: number): Promise<void> {
        await this.clientRepository.delete(id);
    }
}
