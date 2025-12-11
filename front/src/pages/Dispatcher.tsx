import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ClientServices, { type Client } from '@/API/ClientServices';
import UsersServices from '@/API/UsersServices';
import ClientAssignmentServices, { type ClientAssignment } from '@/API/ClientAssignmentServices';
import { useAuth } from '@/hooks/useAuth';
import { DataTable } from '@/components/ui/Table';
import type { ColumnDef } from '@tanstack/react-table';

interface User {
    id: number;
    username: string;
    isActive?: boolean;
}

interface UserStats {
    user: User;
    assignedCount: number;
    lastAssignedAt: string | null;
}

interface FilterState {
    page: number;
    limit: number;
    hasInvoices?: 'with' | 'without' | 'all';
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
}

type ClientColumn = ColumnDef<Client> & { enableColumnFilter?: boolean };
type UserColumn = ColumnDef<UserStats> & { enableColumnFilter?: boolean };
type AssignmentColumn = ColumnDef<ClientAssignment> & { enableColumnFilter?: boolean };

const Dispatcher: React.FC = () => {
    const { token } = useAuth();
    const { userId: urlUserId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    
    // State
    const [clients, setClients] = useState<Client[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [users, setUsers] = useState<User[]>([]);
    const [userStats, setUserStats] = useState<UserStats[]>([]);
    const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
    const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>([]);
    const [assignedClientIds, setAssignedClientIds] = useState<Set<number>>(new Set());
    const [userAssignments, setUserAssignments] = useState<ClientAssignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [revokeByDept, setRevokeByDept] = useState('');
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [statusOptions, setStatusOptions] = useState<string[]>([]);
    const [assignmentFilters, setAssignmentFilters] = useState({ 
        raisonSociale: '', 
        num_client: '', 
        status: '',
        departement: '',
        code_postal: '',
        adresse_site: '',
        montant_ttc_min: undefined as number | undefined,
        montant_ttc_max: undefined as number | undefined,
        conso_annuelle_min: undefined as number | undefined,
        conso_annuelle_max: undefined as number | undefined
    });

    // Determine active tab from URL
    const activeTab = useMemo(() => {
        if (location.pathname.endsWith('/assign')) return 'assign';
        return 'manage'; // default
    }, [location.pathname]);

    const selectedUserId = urlUserId ? parseInt(urlUserId, 10) : null;

    const [filters, setFilters] = useState<FilterState>({
        page: 1,
        limit: 10,
        hasInvoices: 'with',
    });

    // Assignments are now filtered by the API, so just use the data directly
    const filteredAssignments = userAssignments;

    useEffect(() => {
        fetchUsers();
        fetchStatusOptions();
    }, []);

    useEffect(() => {
        if (selectedUserId && activeTab === 'assign') {
            fetchClients();
        }
    }, [filters, selectedUserId, activeTab]);

    useEffect(() => {
        if (selectedUserId) {
            fetchAssignableStatus(selectedUserId);
        }
    }, [selectedUserId]);


    useEffect(() => {
        if (users.length > 0) {
            fetchUserStats();
        }
    }, [users]);

    const fetchClients = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await ClientServices.getClients(token, filters);
            setClients(data.clients);
            setTotalCount(data.totalCount);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        if (!token) return;
        try {
            const data = await UsersServices.GetUsers('users', token);
            setUsers(data.users);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchUserStats = async () => {
        if (!token || users.length === 0) return;
        try {
            const allAssignments = await ClientAssignmentServices.getAllAssignments(token);
            const stats: UserStats[] = users.map(user => {
                const userAssigns = allAssignments.filter(a => a.user.id === user.id);
                const lastAssignment = userAssigns.sort((a, b) => 
                    new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
                )[0];
                return {
                    user,
                    assignedCount: userAssigns.length,
                    lastAssignedAt: lastAssignment?.assignedAt || null,
                };
            });
            setUserStats(stats);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStatusOptions = async () => {
        if (!token) return;
        try {
            const statuses = await ClientServices.getDistinctStatuses(token);
            setStatusOptions(statuses);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchAssignableStatus = async (userId: number) => {
        if (!token) return;
        try {
            const data = await ClientAssignmentServices.getAssignableClients(token, userId);
            const assigned = new Set(data.filter(c => c.isAssigned).map(c => c.id));
            setAssignedClientIds(assigned);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchUserAssignments = useCallback(async (userId: number) => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await ClientAssignmentServices.getAssignmentsForUser(token, userId, {
                status: assignmentFilters.status || undefined,
                raisonSociale: assignmentFilters.raisonSociale || undefined,
                num_client: assignmentFilters.num_client || undefined,
                departement: assignmentFilters.departement || undefined,
                code_postal: assignmentFilters.code_postal || undefined,
                adresse_site: assignmentFilters.adresse_site || undefined,
                montant_ttc_min: assignmentFilters.montant_ttc_min,
                montant_ttc_max: assignmentFilters.montant_ttc_max,
                conso_annuelle_min: assignmentFilters.conso_annuelle_min,
                conso_annuelle_max: assignmentFilters.conso_annuelle_max,
            });
            setUserAssignments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [token, assignmentFilters]);

    // Refetch assignments when filters or user changes
    useEffect(() => {
        if (selectedUserId && activeTab === 'manage') {
            fetchUserAssignments(selectedUserId);
        }
    }, [selectedUserId, activeTab, fetchUserAssignments]);

    const handleAssign = async () => {
        if (!token || !selectedUserId || selectedClientIds.length === 0) return;
        setLoading(true);
        try {
            await ClientAssignmentServices.assignClients(token, selectedClientIds, selectedUserId);
            setMessage(`✅ ${selectedClientIds.length} clients assignés avec succès!`);
            setSelectedClientIds([]);
            fetchAssignableStatus(selectedUserId);
            fetchUserAssignments(selectedUserId);
            fetchUserStats();
        } catch (error) {
            setMessage('❌ Erreur lors de l\'assignation.');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignByDepartment = async () => {
        if (!token || !selectedUserId) return;
        const dept = filters.departement;
        if (!dept) {
            setMessage('⚠️ Veuillez sélectionner un département dans les filtres');
            return;
        }
        setLoading(true);
        try {
            const result = await ClientAssignmentServices.assignByDepartment(token, dept, selectedUserId);
            setMessage(`✅ ${result.assigned} clients assignés (${result.skipped} déjà assignés)`);
            fetchAssignableStatus(selectedUserId);
            fetchUserAssignments(selectedUserId);
            fetchUserStats();
        } catch (error) {
            setMessage('❌ Erreur lors de l\'assignation par département.');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeSelected = async () => {
        if (!token || selectedAssignmentIds.length === 0) return;
        if (!confirm(`Êtes-vous sûr de vouloir révoquer ${selectedAssignmentIds.length} assignations?`)) return;
        setLoading(true);
        try {
            let revoked = 0;
            for (const id of selectedAssignmentIds) {
                await ClientAssignmentServices.revokeAssignment(token, id);
                revoked++;
            }
            setMessage(`✅ ${revoked} assignations révoquées`);
            setSelectedAssignmentIds([]);
            if (selectedUserId) {
                fetchUserAssignments(selectedUserId);
                fetchAssignableStatus(selectedUserId);
                fetchUserStats();
            }
        } catch (error) {
            setMessage('❌ Erreur lors de la révocation.');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeAll = async () => {
        if (!token || !selectedUserId) return;
        if (!confirm('Êtes-vous sûr de vouloir révoquer TOUTES les assignations?')) return;
        try {
            const result = await ClientAssignmentServices.revokeAllForUser(token, selectedUserId);
            setMessage(`✅ ${result.revoked} assignations révoquées`);
            setSelectedAssignmentIds([]);
            fetchUserAssignments(selectedUserId);
            fetchAssignableStatus(selectedUserId);
            fetchUserStats();
        } catch (error) {
            setMessage('❌ Erreur lors de la révocation.');
        }
    };

    const handleRevokeByDepartment = async () => {
        if (!token || !revokeByDept || !selectedUserId) return;
        if (!confirm(`Révoquer tous les clients du département ${revokeByDept}?`)) return;
        setLoading(true);
        try {
            const result = await ClientAssignmentServices.revokeByDepartment(token, revokeByDept, selectedUserId);
            setMessage(`✅ ${result.revoked} assignations révoquées pour le département ${revokeByDept}`);
            setRevokeByDept('');
            fetchUserAssignments(selectedUserId);
            fetchAssignableStatus(selectedUserId);
            fetchUserStats();
        } catch (error) {
            setMessage('❌ Erreur lors de la révocation par département.');
        } finally {
            setLoading(false);
        }
    };

    const toggleClientSelection = (id: number) => {
        if (assignedClientIds.has(id)) return;
        setSelectedClientIds(prev =>
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const toggleAssignmentSelection = (id: number) => {
        setSelectedAssignmentIds(prev =>
            prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
        );
    };

    const selectAllClientsOnPage = () => {
        const selectableIds = clients.filter(c => !assignedClientIds.has(c.id)).map(c => c.id);
        setSelectedClientIds(prev => [...new Set([...prev, ...selectableIds])]);
    };

    const selectAllAssignments = () => {
        setSelectedAssignmentIds(filteredAssignments.map(a => a.id));
    };

    const clearClientSelection = () => setSelectedClientIds([]);
    const clearAssignmentSelection = () => setSelectedAssignmentIds([]);

    const handlePageChange = useCallback((page: number) => {
        setFilters(prev => ({ ...prev, page }));
    }, []);

    const handlePageSizeChange = useCallback((limit: number) => {
        setFilters(prev => ({ ...prev, limit, page: 1 }));
    }, []);

    const selectUser = (userId: number) => {
        navigate(`/dashboard/dispatcher/${userId}/manage`);
    };

    const goBackToUsers = () => {
        navigate('/dashboard/dispatcher');
    };

    const switchTab = (tab: 'assign' | 'manage') => {
        if (selectedUserId) {
            navigate(`/dashboard/dispatcher/${selectedUserId}/${tab}`);
        }
    };

    const getStateBadge = (isActive: boolean | undefined) => {
        if (isActive === false) {
            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Banni</span>;
        }
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Actif</span>;
    };

    const getCountBadge = (count: number) => {
        if (count === 0) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{count}</span>;
        if (count < 10) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{count}</span>;
        if (count < 50) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{count}</span>;
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{count}</span>;
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'Nouveau': 'bg-blue-100 text-blue-800',
            'New': 'bg-blue-100 text-blue-800',
            'En cours': 'bg-yellow-100 text-yellow-800',
            'Converti': 'bg-green-100 text-green-800',
            'Rejeté': 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    // User stats columns
    const userColumns: UserColumn[] = [
        {
            accessorKey: 'user',
            header: 'Utilisateur',
            enableColumnFilter: false,
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                        {row.original.user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{row.original.user.username}</span>
                </div>
            )
        },
        { accessorKey: 'assignedCount', header: 'Assignés', enableColumnFilter: false, cell: ({ row }) => getCountBadge(row.original.assignedCount) },
        { id: 'state', header: 'État', enableColumnFilter: false, cell: ({ row }) => getStateBadge(row.original.user.isActive) },
        { accessorKey: 'lastAssignedAt', header: 'Dernière assignation', enableColumnFilter: false, cell: ({ row }) => row.original.lastAssignedAt ? <span className="text-sm text-slate-500">{new Date(row.original.lastAssignedAt).toLocaleDateString('fr-FR')}</span> : <span className="text-sm text-slate-400">-</span> },
        { id: 'actions', header: 'Actions', enableColumnFilter: false, cell: ({ row }) => <button onClick={() => selectUser(row.original.user.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700">Gérer</button> },
    ];

    // Client columns
    const clientColumns: ClientColumn[] = [
        {
            id: 'select',
            enableColumnFilter: false,
            header: () => <input type="checkbox" onChange={(e) => e.target.checked ? selectAllClientsOnPage() : clearClientSelection()} checked={selectedClientIds.length > 0 && clients.every(c => assignedClientIds.has(c.id) || selectedClientIds.includes(c.id))} />,
            cell: ({ row }) => <input type="checkbox" checked={selectedClientIds.includes(row.original.id)} onChange={() => toggleClientSelection(row.original.id)} disabled={assignedClientIds.has(row.original.id)} />
        },
        { accessorKey: 'num_client', header: 'N° Client', enableColumnFilter: false },
        { accessorKey: 'raisonSociale', header: 'Raison Sociale', enableColumnFilter: false },
        { accessorKey: 'status', header: 'Statut', enableColumnFilter: false },
        { id: 'assigned', header: 'État', enableColumnFilter: false, cell: ({ row }) => assignedClientIds.has(row.original.id) ? <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">Déjà assigné</span> : <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Disponible</span> },
    ];

    // Assignment columns
    const assignmentColumns: AssignmentColumn[] = [
        {
            id: 'select',
            enableColumnFilter: false,
            header: () => <input type="checkbox" onChange={(e) => e.target.checked ? selectAllAssignments() : clearAssignmentSelection()} checked={selectedAssignmentIds.length === filteredAssignments.length && filteredAssignments.length > 0} />,
            cell: ({ row }) => <input type="checkbox" checked={selectedAssignmentIds.includes(row.original.id)} onChange={() => toggleAssignmentSelection(row.original.id)} />
        },
        { id: 'client', header: 'Client', enableColumnFilter: false, cell: ({ row }) => <div><p className="font-medium text-sm">{row.original.client?.raisonSociale || '-'}</p><p className="text-xs text-slate-500">{row.original.client?.num_client}</p></div> },
        { accessorKey: 'status', header: 'Statut', enableColumnFilter: false, cell: ({ row }) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(row.original.status)}`}>{row.original.status}</span> },
        { accessorKey: 'assignedAt', header: 'Assigné le', enableColumnFilter: false, cell: ({ row }) => <span className="text-sm text-slate-500">{new Date(row.original.assignedAt).toLocaleDateString('fr-FR')}</span> },
    ];

    const activeFilterCount = [filters.status, filters.raisonSociale, filters.num_client, filters.departement, filters.code_postal, filters.adresse_site, filters.montant_ttc_min, filters.montant_ttc_max, filters.conso_annuelle_min, filters.conso_annuelle_max].filter(Boolean).length;
    const assignmentFilterCount = [assignmentFilters.raisonSociale, assignmentFilters.num_client, assignmentFilters.status, assignmentFilters.departement, assignmentFilters.code_postal, assignmentFilters.adresse_site, assignmentFilters.montant_ttc_min, assignmentFilters.montant_ttc_max, assignmentFilters.conso_annuelle_min, assignmentFilters.conso_annuelle_max].filter(Boolean).length;

    const selectedUser = users.find(u => u.id === selectedUserId);

    // Users list view
    if (!selectedUserId) {
        return (
            <div className="w-full py-2">
                <h1 className="text-xl font-bold text-slate-800 mb-4">Dispatcher</h1>
                {message && <div className="mb-4 p-3 bg-slate-100 rounded-lg text-sm flex justify-between items-center"><span>{message}</span><button onClick={() => setMessage('')} className="text-slate-500 hover:text-slate-700">×</button></div>}
                <DataTable columns={userColumns} data={userStats} pageCount={1} currentPage={1} pageSize={userStats.length || 10} isLoading={loading} />
            </div>
        );
    }

    // User dispatcher view
    return (
        <div className="w-full py-2">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold text-slate-800">Dispatcher</h1>
                <button onClick={goBackToUsers} className="text-sm text-blue-600 hover:underline">← Retour aux utilisateurs</button>
            </div>

            {message && <div className="mb-4 p-3 bg-slate-100 rounded-lg text-sm flex justify-between items-center"><span>{message}</span><button onClick={() => setMessage('')} className="text-slate-500 hover:text-slate-700">×</button></div>}

            {/* User Info */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">{selectedUser?.username.charAt(0).toUpperCase()}</div>
                <div className="flex-1">
                    <p className="font-semibold text-slate-700">{selectedUser?.username}</p>
                    <p className="text-xs text-slate-500">{userAssignments.length} clients assignés</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button onClick={() => switchTab('manage')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'manage' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Assignations ({userAssignments.length})</button>
                <button onClick={() => switchTab('assign')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'assign' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Assigner</button>
            </div>

            {activeTab === 'assign' && (
                <>
                    {/* Filter Panel */}
                    <div className="mb-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="w-full px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-700">Filtres</span>
                                {activeFilterCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500 text-white">{activeFilterCount}</span>}
                            </div>
                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                        {isFiltersOpen && (
                            <div className="p-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Statut</label><select value={filters.status || ''} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined, page: 1 }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg"><option value="">Tous</option>{statusOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Raison Sociale</label><input type="text" placeholder="Rechercher..." value={filters.raisonSociale || ''} onChange={(e) => setFilters(prev => ({ ...prev, raisonSociale: e.target.value || undefined, page: 1 }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" /></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">N° Client</label><input type="text" placeholder="Rechercher..." value={filters.num_client || ''} onChange={(e) => setFilters(prev => ({ ...prev, num_client: e.target.value || undefined, page: 1 }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" /></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Département</label><select value={filters.departement || ''} onChange={(e) => setFilters(prev => ({ ...prev, departement: e.target.value || undefined, page: 1 }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg"><option value="">Tous</option>{Array.from({ length: 95 }, (_, i) => { const dept = String(i + 1).padStart(2, '0'); return <option key={dept} value={dept}>{dept}</option>; })}</select></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Code Postal</label><input type="text" placeholder="75001" value={filters.code_postal || ''} onChange={(e) => setFilters(prev => ({ ...prev, code_postal: e.target.value || undefined, page: 1 }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" /></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Adresse</label><input type="text" placeholder="Rechercher..." value={filters.adresse_site || ''} onChange={(e) => setFilters(prev => ({ ...prev, adresse_site: e.target.value || undefined, page: 1 }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" /></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Montant TTC (€)</label><div className="flex gap-1"><input type="number" placeholder="Min" value={filters.montant_ttc_min ?? ''} onChange={(e) => setFilters(prev => ({ ...prev, montant_ttc_min: e.target.value ? Number(e.target.value) : undefined, page: 1 }))} className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg" /><input type="number" placeholder="Max" value={filters.montant_ttc_max ?? ''} onChange={(e) => setFilters(prev => ({ ...prev, montant_ttc_max: e.target.value ? Number(e.target.value) : undefined, page: 1 }))} className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg" /></div></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Conso Annuelle</label><div className="flex gap-1"><input type="number" placeholder="Min" value={filters.conso_annuelle_min ?? ''} onChange={(e) => setFilters(prev => ({ ...prev, conso_annuelle_min: e.target.value ? Number(e.target.value) : undefined, page: 1 }))} className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg" /><input type="number" placeholder="Max" value={filters.conso_annuelle_max ?? ''} onChange={(e) => setFilters(prev => ({ ...prev, conso_annuelle_max: e.target.value ? Number(e.target.value) : undefined, page: 1 }))} className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg" /></div></div>
                                </div>
                                <div className="mt-3"><button onClick={() => setFilters({ page: 1, limit: filters.limit, hasInvoices: 'with' })} className="text-xs text-rose-500 hover:text-rose-600">Réinitialiser les filtres</button></div>
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    <div className="bg-white p-3 rounded-lg shadow mb-4 border border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-600"><strong>{selectedClientIds.length}</strong> sélectionnés sur <strong>{totalCount}</strong></span>
                            <button onClick={selectAllClientsOnPage} className="text-xs text-blue-600 hover:underline">Sélectionner la page</button>
                            <button onClick={clearClientSelection} className="text-xs text-slate-500 hover:underline">Désélectionner</button>
                        </div>
                        <div className="flex gap-2">
                            {filters.departement && <button onClick={handleAssignByDepartment} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Assigner dép. {filters.departement}</button>}
                            <button onClick={handleAssign} disabled={loading || selectedClientIds.length === 0} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{loading ? '...' : `Assigner (${selectedClientIds.length})`}</button>
                        </div>
                    </div>

                    <DataTable columns={clientColumns} data={clients} onPaginationChange={handlePageChange} onPageSizeChange={handlePageSizeChange} pageCount={Math.ceil(totalCount / filters.limit)} currentPage={filters.page} pageSize={filters.limit} isLoading={loading} />
                </>
            )}

            {activeTab === 'manage' && (
                <>
                    {/* Filter Panel for Assignations */}
                    <div className="mb-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="w-full px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-700">Filtres</span>
                                {assignmentFilterCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500 text-white">{assignmentFilterCount}</span>}
                            </div>
                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                        {isFiltersOpen && (
                            <div className="p-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Statut</label><select value={assignmentFilters.status} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, status: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg"><option value="">Tous</option>{statusOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Raison Sociale</label><input type="text" placeholder="Rechercher..." value={assignmentFilters.raisonSociale} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, raisonSociale: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" /></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">N° Client</label><input type="text" placeholder="Rechercher..." value={assignmentFilters.num_client} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, num_client: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" /></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Département</label><select value={assignmentFilters.departement} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, departement: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg"><option value="">Tous</option>{Array.from({ length: 95 }, (_, i) => { const dept = String(i + 1).padStart(2, '0'); return <option key={dept} value={dept}>{dept}</option>; })}</select></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Code Postal</label><input type="text" placeholder="75001" value={assignmentFilters.code_postal} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, code_postal: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" /></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Adresse</label><input type="text" placeholder="Rechercher..." value={assignmentFilters.adresse_site} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, adresse_site: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" /></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Montant TTC (€)</label><div className="flex gap-1"><input type="number" placeholder="Min" value={assignmentFilters.montant_ttc_min ?? ''} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, montant_ttc_min: e.target.value ? Number(e.target.value) : undefined }))} className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg" /><input type="number" placeholder="Max" value={assignmentFilters.montant_ttc_max ?? ''} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, montant_ttc_max: e.target.value ? Number(e.target.value) : undefined }))} className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg" /></div></div>
                                    <div><label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Conso Annuelle</label><div className="flex gap-1"><input type="number" placeholder="Min" value={assignmentFilters.conso_annuelle_min ?? ''} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, conso_annuelle_min: e.target.value ? Number(e.target.value) : undefined }))} className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg" /><input type="number" placeholder="Max" value={assignmentFilters.conso_annuelle_max ?? ''} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, conso_annuelle_max: e.target.value ? Number(e.target.value) : undefined }))} className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg" /></div></div>
                                </div>
                                <div className="mt-3"><button onClick={() => setAssignmentFilters({ raisonSociale: '', num_client: '', status: '', departement: '', code_postal: '', adresse_site: '', montant_ttc_min: undefined, montant_ttc_max: undefined, conso_annuelle_min: undefined, conso_annuelle_max: undefined })} className="text-xs text-rose-500 hover:text-rose-600">Réinitialiser les filtres</button></div>
                            </div>
                        )}
                    </div>

                    {/* Bulk Actions */}
                    <div className="bg-white p-3 rounded-lg shadow mb-4 border border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-600"><strong>{selectedAssignmentIds.length}</strong> sélectionnés sur <strong>{filteredAssignments.length}</strong></span>
                            <button onClick={selectAllAssignments} className="text-xs text-blue-600 hover:underline">Tout sélectionner</button>
                            <button onClick={clearAssignmentSelection} className="text-xs text-slate-500 hover:underline">Désélectionner</button>
                        </div>
                        <div className="flex gap-2 items-center">
                            <select value={revokeByDept} onChange={(e) => setRevokeByDept(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg">
                                <option value="">Dép.</option>
                                {Array.from({ length: 95 }, (_, i) => { const dept = String(i + 1).padStart(2, '0'); return <option key={dept} value={dept}>{dept}</option>; })}
                            </select>
                            <button onClick={handleRevokeByDepartment} disabled={!revokeByDept || loading} className="bg-orange-600 text-white px-2 py-1.5 rounded-lg text-xs disabled:opacity-50">Révoquer dép.</button>
                            <button onClick={handleRevokeSelected} disabled={selectedAssignmentIds.length === 0 || loading} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50">Révoquer ({selectedAssignmentIds.length})</button>
                            <button onClick={handleRevokeAll} disabled={userAssignments.length === 0 || loading} className="bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50">Tout révoquer</button>
                        </div>
                    </div>

                    <DataTable columns={assignmentColumns} data={filteredAssignments} pageCount={1} currentPage={1} pageSize={filteredAssignments.length || 10} isLoading={loading} />
                </>
            )}
        </div>
    );
};

export default Dispatcher;
