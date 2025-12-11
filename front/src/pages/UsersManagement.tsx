import Button from '@/components/ui/Button';
import { DataTable } from '@/components/ui/Table';
import type { ColumnDef } from '@tanstack/react-table';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ApiUrls from '@/API/Urls';
import { useAuth } from '@/hooks/useAuth';
import UsersServices from '@/API/UsersServices';
import CreateUserModal from '@/components/CreateUserModal';
import ConfirmDialog from '@/components/ConfirmDialog';

// Définir l'entité User basée sur la structure fournie
interface User {
  id: number;
  username: string;
  password: string;
  roles: string[];
  isActive?: boolean;
}

type Column = ColumnDef<User> & {
  filterType?: 'text' | 'number' | 'dateRange' | 'select';
  filterOptions?: string[];
  enableColumnFilter?: boolean;
};

interface FilterState {
  page: number;
  limit: number;
  [key: string]: any;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ page: 1, limit: 10 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const { isAdmin, isLoading: isAuthLoading, token } = useAuth();
  const navigate = useNavigate();

  const handleBanUser = useCallback(async (userId: number, ban: boolean) => {
    if (!token) return;
    try {
      await axios.patch(
        `${ApiUrls.BASE_URL}users/${userId}/${ban ? 'ban' : 'unban'}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(ban ? '🚫 Utilisateur banni' : '✅ Utilisateur débanni');
      fetchUsers();
    } catch (error) {
      setMessage('❌ Erreur lors de la mise à jour du statut.');
    }
  }, [token]);

  const defaultText = (id: keyof User, header: string): Column => ({
    accessorKey: id,
    header,
    filterType: 'text',
    enableColumnFilter: true,
  });

  const columns: Column[] = [
    defaultText('username', 'Nom d\'utilisateur'),
    {
      accessorKey: 'roles',
      header: 'Rôles',
      cell: ({ row }) => row.original.roles.join(', '),
      filterType: 'select',
      filterOptions: ['admin', 'user', 'editor'],
      enableColumnFilter: true,
    },
    {
      id: 'status',
      header: 'État',
      cell: ({ row }) => row.original.isActive === false ? (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Banni</span>
      ) : (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Actif</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1.5">
          <button
            onClick={() => handleEdit(row.original)}
            className="px-2 py-1 text-[10px] font-medium rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-200"
          >
            Modifier
          </button>
          {row.original.isActive === false ? (
            <button
              onClick={() => handleBanUser(row.original.id, false)}
              className="px-2 py-1 text-[10px] font-medium rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
            >
              Débannir
            </button>
          ) : (
            <button
              onClick={() => handleBanUser(row.original.id, true)}
              className="px-2 py-1 text-[10px] font-medium rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
            >
              Bannir
            </button>
          )}
          <button
            onClick={() => handleDelete(row.original.id)}
            className="px-2 py-1 text-[10px] font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
          >
            Supprimer
          </button>
        </div>
      ),
    },
  ];

  const fetchUsers = useCallback(async () => {
    if (isAuthLoading || isAdmin === null) return;
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = isAdmin ? 'users' : '';
      console.log('Filtres envoyés à l\'API :', filters);
      const response = await UsersServices.GetUsers(endpoint, token, filters.page, filters.limit, filters);
      console.log('Réponse de l\'API :', response);
      setUsers(response.users);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error('Échec de la récupération des utilisateurs :', error);
      setError('Échec du chargement des utilisateurs. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, isAdmin, isAuthLoading]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = useCallback(
    async (username: string, password: string | undefined, roles: string[]) => {
      if (!isAdmin) {
        throw new Error('Seuls les administrateurs peuvent créer des utilisateurs');
      }
      try {
        await axios.post(
          `${ApiUrls.BASE_URL}users/create`,
          { username, password, roles },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        fetchUsers();
      } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Échec de la création de l\'utilisateur');
      }
    },
    [isAdmin, fetchUsers]
  );

  const handleEditUser = useCallback(
    async (username: string, password: string | undefined, roles: string[]) => {
      if (!isAdmin || !selectedUser) {
        throw new Error('Seuls les administrateurs peuvent modifier des utilisateurs');
      }
      try {
        await axios.patch(
          `${ApiUrls.BASE_URL}users/${selectedUser.id}`,
          { username, password, roles },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        fetchUsers();
      } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Échec de la mise à jour de l\'utilisateur');
      }
    },
    [isAdmin, selectedUser, fetchUsers]
  );

  const handleEdit = useCallback((user: User) => {
    console.log('Modifier l\'utilisateur :', user);
    setSelectedUser(user);
    setIsModalOpen(true);
    console.log('Après clic sur modifier - isModalOpen:', true, 'selectedUser:', user);
  }, []);

  const handleDelete = useCallback((id: number) => {
    console.log('Supprimer l\'utilisateur :', id);
    setUserToDelete(id);
    setIsConfirmOpen(true);
    console.log('Après clic sur supprimer - isConfirmOpen:', true, 'userToDelete:', id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!isAdmin || userToDelete === null) return;
    try {
      console.log('Confirmation de la suppression pour l\'ID utilisateur :', userToDelete);
      await axios.delete(`${ApiUrls.BASE_URL}users/${userToDelete}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      fetchUsers();
      setIsConfirmOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Échec de la suppression de l\'utilisateur');
      setIsConfirmOpen(false);
      setUserToDelete(null);
    }
  }, [isAdmin, userToDelete, fetchUsers]);

  const handleSendContacts = useCallback(
    (userId: number) => {
      console.log(`Envoyer les contacts pour l\'ID utilisateur : ${userId}`);
      navigate(`/dashboard/unassigned/${userId}`);
    },
    [navigate]
  );

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const handleFilterChange = useCallback((newFilters: Array<{ id: string; value: any }>) => {
    if (!newFilters || newFilters.length === 0) {
      setFilters((prev) => ({ page: prev.page, limit: prev.limit }));
      return;
    }

    const cleanedFilters = newFilters.reduce((acc, filter) => {
      if (filter.value !== '' && filter.value != null) {
        acc[filter.id] = filter.value;
      }
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(cleanedFilters).length === 0) {
      setFilters((prev) => ({ page: prev.page, limit: prev.limit }));
    } else {
      setFilters((prev) => ({ ...prev, ...cleanedFilters, page: 1 }));
    }
  }, []);

  return (
    <div className="w-full py-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-slate-800">Utilisateurs</h1>
        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => {
              setSelectedUser(null);
              setIsModalOpen(true);
              console.log('Créer un utilisateur cliqué - isModalOpen:', true);
            }}
            className="text-xs px-3 py-1.5"
          >
            + Utilisateur
          </Button>
        )}
      </div>
      {message && (
        <div className="mb-4 p-3 bg-slate-100 rounded-lg text-sm flex justify-between items-center">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-500 hover:text-slate-700">×</button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      <DataTable
        columns={columns}
        data={users}
        onPaginationChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onFilterChange={handleFilterChange}
        pageCount={Math.ceil(totalCount / (filters.limit || 10))}
        currentPage={filters.page || 1}
        pageSize={filters.limit || 10}
        isLoading={isLoading}
      />
      {isModalOpen && (
        <CreateUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
            console.log('Modale fermée - isModalOpen:', false);
          }}
          onSubmit={selectedUser ? handleEditUser : handleCreateUser}
          user={selectedUser}
        />
      )}
      {isConfirmOpen && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false);
            setUserToDelete(null);
            console.log('Dialogue de confirmation fermé - isConfirmOpen:', false);
          }}
          onConfirm={confirmDelete}
          title="Confirmer la suppression"
          message="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
        />
      )}
    </div>
  );
};

export default UsersManagement;