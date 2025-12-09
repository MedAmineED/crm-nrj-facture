import Button from '@/components/ui/Button';
import { DataTable } from '@/components/ui/Table';
import type { Contact } from '@/entities/Contact';
import type { ColumnDef } from '@tanstack/react-table';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ApiUrls from '@/API/Urls';
import { useAuth } from '@/hooks/useAuth';

type Column = ColumnDef<Contact> & {
  filterType?: 'text' | 'number' | 'dateRange' | 'select';
  filterOptions?: string[];
  enableColumnFilter?: boolean;
};

interface FilterState {
  page: number;
  limit: number;
  [key: string]: any;
}

const UnassignedContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ page: 1, limit: 10 });
  const { isAdmin, isLoading: isAuthLoading, token } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const defaultText = (id: keyof Contact, header: string): Column => ({
    accessorKey: id,
    header,
    filterType: 'text',
    enableColumnFilter: true,
  });

  const columns: Column[] = [
    defaultText('num_client', 'Numéro Client'),
    defaultText('nom', 'Nom'),
    defaultText('prenom', 'Prénom'),
    defaultText('raisonSociale', 'Raison Sociale'),
    defaultText('fonction', 'Fonction'),
    defaultText('email', 'Email'),
    defaultText('numTel', 'Téléphone'),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAssign(row.original.id)}
          >
            Assigner
          </Button>
        </div>
      ),
    },
  ];

  const fetchUnassignedContacts = useCallback(async () => {
    if (isAuthLoading || isAdmin === null || !userId) return;
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Récupération des contacts non assignés pour l'utilisateur ID : ${userId}`);
      console.log('Filtres envoyés à l\'API :', filters);
      const response = await axios.get(`${ApiUrls.BASE_URL}contact/not-sent/${userId}`, {
        params: filters,
      });
      console.log('Réponse de l\'API :', response.data);
      setContacts(response.data.contacts || []);
      setTotalCount(response.data.totalCount || 0);
    } catch (error) {
      console.error('Échec de la récupération des contacts non assignés :', error);
      setError('Échec du chargement des contacts non assignés. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, isAdmin, isAuthLoading, userId]);

  useEffect(() => {
    fetchUnassignedContacts();
  }, [fetchUnassignedContacts]);

  const handleAssign = useCallback(async (contactId: number) => {
    try {
      await axios.post(`${ApiUrls.BASE_URL}admin/assign-contacts`, {
        userId: parseInt(userId || '0'),
        contactIds: [contactId],
        notes: 'Assignation d\'un contact unique depuis la vue des contacts non assignés',
            },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      }
    );
      fetchUnassignedContacts();
    } catch (error) {
      console.error('Échec de l\'assignation du contact :', error);
      setError('Échec de l\'assignation du contact. Veuillez réessayer.');
    }
  }, [userId, fetchUnassignedContacts]);

   const handleAssignAll = useCallback(async () => {
    if (contacts.length === 0) {
      setError('Aucun contact à assigner.');
      return;
    }
    try {
      const contactIds = contacts.map(contact => contact.id);
      const response = await axios.post(`${ApiUrls.BASE_URL}admin/assign-contacts`, {
        userId: parseInt(userId || '0'),
        contactIds,
        notes: 'Assignation en masse depuis la vue des contacts non assignés',
      },      {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      fetchUnassignedContacts();
      setError(null);
      if (response.data.message) {
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Échec de l\'assignation de tous les contacts :', error);
      setError('Échec de l\'assignation de tous les contacts. Veuillez réessayer.');
    }
  }, [contacts, userId, fetchUnassignedContacts]);

  const handleEdit = (contact: Contact) => {
    console.log('Modifier le contact :', contact);
  };

  const handleDelete = (id: number) => {
    console.log('Supprimer le contact :', id);
  };

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const handleFilterChange = useCallback((newFilters: Array<{ id: string; value: any }>) => {
    // Si newFilters est vide, réinitialiser aux seuls paramètres de pagination
    if (!newFilters || newFilters.length === 0) {
      setFilters(prev => ({ page: prev.page, limit: prev.limit }));
      return;
    }

    // Transformer le tableau de filtres en objet plat, en excluant les valeurs vides/nulles
    const cleanedFilters = newFilters.reduce((acc, filter) => {
      if (filter.value !== '' && filter.value != null) {
        acc[filter.id] = filter.value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Si aucun filtre valide ne reste, réinitialiser aux seuls paramètres de pagination
    if (Object.keys(cleanedFilters).length === 0) {
      setFilters(prev => ({ page: prev.page, limit: prev.limit }));
    } else {
      setFilters(prev => ({ ...prev, ...cleanedFilters, page: 1 }));
    }
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contacts non assignés pour l'utilisateur {userId}</h1>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={handleAssignAll}
            disabled={isLoading || contacts.length === 0}
          >
            Envoyer tous les contacts
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/users')}
          >
            Retour aux utilisateurs
          </Button>
        </div>
      </div>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      <DataTable
        columns={columns}
        data={contacts}
        onPaginationChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onFilterChange={handleFilterChange}
        pageCount={Math.ceil(totalCount / (filters.limit || 10))}
        currentPage={filters.page || 1}
        pageSize={filters.limit || 10}
        isLoading={isLoading}
      />
    </div>
  );
};

export default UnassignedContacts;