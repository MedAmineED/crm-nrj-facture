import axios from 'axios';
import ApiUrls from './Urls';
import type { Contact } from '@/entities/Contact';

export interface Client {
    id: number;
    num_client: string;
    profile: string;
    status: string;
    raisonSociale: string;
    contacts?: Contact[];
}

class ClientServices {
    async getClients(token: string, filters?: {
        page?: number;
        limit?: number;
        profile?: string;
        status?: string;
        raisonSociale?: string;
        num_client?: string;
        hasInvoices?: 'with' | 'without' | 'all';
        search?: string;
    }): Promise<{ clients: Client[], totalCount: number }> {
        try {
            const response = await axios.get(`${ApiUrls.BASE_URL}client/all`, {
                params: filters,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching clients:", error);
            throw error;
        }
    }

    async getClient(id: number, token: string): Promise<Client> {
        try {
            const response = await axios.get(`${ApiUrls.BASE_URL}client/${id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching client:", error);
            throw error;
        }
    }

    async updateClient(id: number, token: string, data: Partial<Client>) {
        try {
            const response = await axios.patch(`${ApiUrls.BASE_URL}client/${id}`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error("Error updating client:", error);
            throw error;
        }
    }

    async deleteClient(id: number, token: string) {
        try {
            const response = await axios.delete(`${ApiUrls.BASE_URL}client/${id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error("Error deleting client:", error);
            throw error;
        }
    }
}

export default new ClientServices();
