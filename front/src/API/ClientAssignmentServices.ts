import axios from 'axios';
import ApiUrls from './Urls';
import type { Client } from './ClientServices';

export interface ClientAssignment {
    id: number;
    user: { id: number; username: string };
    client: Client;
    status: string;
    comment: string;
    assignedAt: string;
    isActive: boolean;
}

class ClientAssignmentServices {
    private headers(token: string) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };
    }

    async assignClients(token: string, clientIds: number[], userId: number): Promise<ClientAssignment[]> {
        const response = await axios.post(`${ApiUrls.BASE_URL}client-assignments/assign`, { clientIds, userId }, {
            headers: this.headers(token),
        });
        return response.data;
    }

    async assignByDepartment(token: string, departement: string, userId: number): Promise<{ assigned: number; skipped: number }> {
        const response = await axios.post(`${ApiUrls.BASE_URL}client-assignments/assign-by-department`, { departement, userId }, {
            headers: this.headers(token),
        });
        return response.data;
    }

    async getAssignableClients(token: string, userId: number): Promise<{ id: number; isAssigned: boolean }[]> {
        const response = await axios.get(`${ApiUrls.BASE_URL}client-assignments/assignable/${userId}`, {
            headers: this.headers(token),
        });
        return response.data;
    }

    async getAssignmentsForUser(token: string, userId: number, filters?: {
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
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    params.append(key, String(value));
                }
            });
        }
        const queryString = params.toString();
        const url = `${ApiUrls.BASE_URL}client-assignments/user/${userId}${queryString ? `?${queryString}` : ''}`;
        const response = await axios.get(url, {
            headers: this.headers(token),
        });
        return response.data;
    }

    async getAllAssignments(token: string): Promise<ClientAssignment[]> {
        const response = await axios.get(`${ApiUrls.BASE_URL}client-assignments/all`, {
            headers: this.headers(token),
        });
        return response.data;
    }

    async getAssignmentsByClient(token: string, clientId: number): Promise<ClientAssignment[]> {
        const response = await axios.get(`${ApiUrls.BASE_URL}client-assignments/by-client/${clientId}`, {
            headers: this.headers(token),
        });
        return response.data;
    }

    async revokeAssignment(token: string, id: number): Promise<void> {
        await axios.delete(`${ApiUrls.BASE_URL}client-assignments/${id}/revoke`, {
            headers: this.headers(token),
        });
    }

    async revokeAllForUser(token: string, userId: number): Promise<{ revoked: number }> {
        const response = await axios.delete(`${ApiUrls.BASE_URL}client-assignments/user/${userId}/revoke-all`, {
            headers: this.headers(token),
        });
        return response.data;
    }

    async revokeByDepartment(token: string, departement: string, userId: number): Promise<{ revoked: number }> {
        const response = await axios.delete(`${ApiUrls.BASE_URL}client-assignments/revoke-by-department`, {
            headers: this.headers(token),
            data: { departement, userId },
        });
        return response.data;
    }

    async getMyClients(token: string, filters?: {
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
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    params.append(key, String(value));
                }
            });
        }
        const queryString = params.toString();
        const url = `${ApiUrls.BASE_URL}client-assignments/my-clients-filtered${queryString ? `?${queryString}` : ''}`;
        const response = await axios.get(url, {
            headers: this.headers(token),
        });
        return response.data;
    }

    async getMyStats(token: string): Promise<{
        totalAssigned: number;
        statusBreakdown: Record<string, number>;
        recentAssignments: ClientAssignment[];
    }> {
        const response = await axios.get(`${ApiUrls.BASE_URL}client-assignments/my-stats`, {
            headers: this.headers(token),
        });
        return response.data;
    }

    async updateStatus(token: string, id: number, status: string, comment: string): Promise<ClientAssignment> {
        const response = await axios.patch(`${ApiUrls.BASE_URL}client-assignments/${id}/status`, { status, comment }, {
            headers: this.headers(token),
        });
        return response.data;
    }
}

export default new ClientAssignmentServices();

