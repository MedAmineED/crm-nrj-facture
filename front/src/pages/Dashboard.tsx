import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ClientServices from '@/API/ClientServices';
import InvoiceServices from '@/API/InvoiceServices';
import ClientAssignmentServices, { type ClientAssignment } from '@/API/ClientAssignmentServices';
import ApiUrls from '@/API/Urls';
import { formatCurrency } from '@/lib/utils';
import type { Invoice } from '@/entities/Invoice';


// Admin Dashboard Stats Interface
interface AdminDashboardStats {
    totalClients: number;
    totalClientsWithInvoices: number;
    totalClientsWithoutInvoices: number;
    totalInvoices: number;
    totalAmount: number;
    recentInvoices: Invoice[];
    invoicesByType: Record<string, number>;
}

// User Dashboard Stats Interface
interface UserDashboardStats {
    totalAssigned: number;
    statusBreakdown: Record<string, number>;
    recentAssignments: ClientAssignment[];
}

// User Dashboard Component
const UserDashboard = ({ token }: { token: string }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<UserDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                const data = await ClientAssignmentServices.getMyStats(token);
                setStats(data);
            } catch (error) {
                console.error('Error fetching user dashboard stats:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [token]);

    const getStatusColor = (status: string) => {
        const colors: Record<string, { bg: string; text: string; border: string }> = {
            'Nouveau': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
            'RDV Pris': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
            'A rappeler': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
            'En négociation': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
            'Devis envoyé': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
            'Converti': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
            'Pas intéressé': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
            'Mort': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
            'Injoignable': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
        };
        return colors[status] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
    };

    if (isLoading) {
        return (
            <div className="w-full py-2">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <div className="h-8 bg-slate-200 rounded-lg w-48 animate-pulse mb-1"></div>
                        <div className="h-4 bg-slate-200 rounded-lg w-64 animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
                                <div className="h-3 bg-slate-200 rounded w-20 mb-3"></div>
                                <div className="h-6 bg-slate-200 rounded w-28"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full py-2">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-slate-800 mb-1">
                        Mon Espace
                    </h1>
                    <p className="text-xs text-slate-500">
                        Vue d'ensemble de vos leads assignés
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-stagger">
                    {/* Total Assigned */}
                    <div 
                        onClick={() => navigate('/dashboard/mes-leads')}
                        className="group cursor-pointer bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all duration-300"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Leads Assignés
                                </p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {stats?.totalAssigned || 0}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Total de vos clients
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Status Cards */}
                    {Object.entries(stats?.statusBreakdown || {}).slice(0, 3).map(([status, count]) => {
                        const colors = getStatusColor(status);
                        return (
                            <div 
                                key={status}
                                className={`bg-white rounded-xl border ${colors.border} shadow-sm p-4 transition-all duration-300`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                            {status}
                                        </p>
                                        <p className={`text-2xl font-bold ${colors.text}`}>
                                            {count}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            leads
                                        </p>
                                    </div>
                                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Assignments */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-primary-50 flex items-center justify-center text-primary-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    Leads Récents
                                </h2>
                                <button
                                    onClick={() => navigate('/dashboard/mes-leads')}
                                    className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
                                >
                                    Voir tout
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="p-3">
                                {stats?.recentAssignments && stats.recentAssignments.length > 0 ? (
                                    <div className="space-y-2">
                                        {stats.recentAssignments.map((assignment) => {
                                            const colors = getStatusColor(assignment.status);
                                            return (
                                                <div 
                                                    key={assignment.id}
                                                    className="flex items-center gap-3 p-2.5 bg-slate-50/50 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/>
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold text-slate-800 truncate">
                                                                {assignment.client?.raisonSociale || 'Client'}
                                                            </span>
                                                            <span className={`px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text} rounded`}>
                                                                {assignment.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                                            N° {assignment.client?.num_client || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                                                            </svg>
                                                            {new Date(assignment.assignedAt).toLocaleDateString('fr-FR')}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                                            </svg>
                                        </div>
                                        <p className="text-xs text-slate-500">Aucun lead assigné récemment</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions & Status Overview */}
                    <div className="space-y-4">
                        {/* Status Overview */}
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                        </svg>
                                    </div>
                                    Répartition par Statut
                                </h3>
                            </div>
                            
                            <div className="p-4">
                                {stats?.statusBreakdown && Object.keys(stats.statusBreakdown).length > 0 ? (
                                    <div className="space-y-3">
                                        {Object.entries(stats.statusBreakdown).map(([status, count]) => {
                                            const percentage = stats.totalAssigned > 0 
                                                ? (count / stats.totalAssigned) * 100 
                                                : 0;
                                            const colors = getStatusColor(status);
                                            return (
                                                <div key={status}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium text-slate-700">{status}</span>
                                                        <span className="text-xs font-bold text-slate-800">{count}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full ${colors.bg.replace('50', '400')} rounded-full transition-all duration-500`}
                                                            style={{ width: `${percentage}%`, backgroundColor: colors.text.includes('blue') ? '#3b82f6' : colors.text.includes('amber') ? '#f59e0b' : colors.text.includes('emerald') ? '#10b981' : colors.text.includes('rose') ? '#f43f5e' : '#64748b' }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 text-center py-2">
                                        Aucune donnée disponible
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                <h3 className="text-sm font-bold text-slate-800">Actions Rapides</h3>
                            </div>
                            <div className="p-3 space-y-2">
                                <button
                                    onClick={() => navigate('/dashboard/mes-leads')}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800">Gérer mes Leads</p>
                                        <p className="text-[10px] text-slate-500">Voir et modifier vos clients</p>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => navigate('/dashboard/profile')}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800">Mon Profil</p>
                                        <p className="text-[10px] text-slate-500">Paramètres du compte</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Admin Dashboard Component (existing logic)
const AdminDashboard = ({ token }: { token: string }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;
            setIsLoading(true);
            
            try {
                // Fetch clients with invoices
                const clientsWithInvoices = await ClientServices.getClients(token, { 
                    hasInvoices: 'with',
                    limit: 1000 
                });
                
                // Fetch clients without invoices
                const clientsWithoutInvoices = await ClientServices.getClients(token, { 
                    hasInvoices: 'without',
                    limit: 1000 
                });
                
                // Fetch all invoices
                const invoicesResponse = await InvoiceServices.GetInvoicesList(
                    `${ApiUrls.BASE_URL}api/factures`,
                    token,
                    { limit: 1000 }
                );
                
                // Calculate stats
                const totalAmount = invoicesResponse.data.reduce(
                    (sum, inv) => sum + (Number(inv.montant_ttc) || 0), 
                    0
                );
                
                // Group invoices by type
                const invoicesByType: Record<string, number> = {};
                invoicesResponse.data.forEach(inv => {
                    const type = inv.type_document || 'Non défini';
                    invoicesByType[type] = (invoicesByType[type] || 0) + 1;
                });
                
                // Get recent invoices (last 5)
                const recentInvoices = invoicesResponse.data
                    .sort((a, b) => new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime())
                    .slice(0, 5);
                
                setStats({
                    totalClients: clientsWithInvoices.totalCount + clientsWithoutInvoices.totalCount,
                    totalClientsWithInvoices: clientsWithInvoices.totalCount,
                    totalClientsWithoutInvoices: clientsWithoutInvoices.totalCount,
                    totalInvoices: invoicesResponse.total || invoicesResponse.data.length,
                    totalAmount,
                    recentInvoices,
                    invoicesByType,
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchStats();
    }, [token]);

    if (isLoading) {
        return (
            <div className="w-full py-2">
                <div className="max-w-7xl mx-auto">
                    {/* Header skeleton */}
                    <div className="mb-6">
                        <div className="h-8 bg-slate-200 rounded-lg w-48 animate-pulse mb-1"></div>
                        <div className="h-4 bg-slate-200 rounded-lg w-64 animate-pulse"></div>
                    </div>
                    {/* Stats skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
                                <div className="h-3 bg-slate-200 rounded w-20 mb-3"></div>
                                <div className="h-6 bg-slate-200 rounded w-28"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full py-2">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-slate-800 mb-1">
                        Tableau de bord
                    </h1>
                    <p className="text-xs text-slate-500">
                        Vue d'ensemble de votre activité CRM
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-stagger">
                    {/* Total Clients */}
                    <div 
                        onClick={() => navigate('/dashboard/clients')}
                        className="group cursor-pointer bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all duration-300"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Total Clients
                                </p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {stats?.totalClients || 0}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                    <span className="text-emerald-600 font-semibold">{stats?.totalClientsWithInvoices || 0}</span> avec factures
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Total Invoices */}
                    <div 
                        onClick={() => navigate('/dashboard/my-invoices')}
                        className="cursor-pointer bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all duration-300"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Total Factures
                                </p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {stats?.totalInvoices || 0}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Documents enregistrés
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Invoices */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center text-violet-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
                                        </svg>
                                    </div>
                                    Factures Récentes
                                </h2>
                                <button
                                    onClick={() => navigate('/dashboard/my-invoices')}
                                    className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
                                >
                                    Voir tout
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="p-3">
                                {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
                                    <div className="space-y-2">
                                        {stats.recentInvoices.map((invoice) => (
                                            <div 
                                                key={invoice.id}
                                                className="flex items-center gap-3 p-2.5 bg-slate-50/50 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-slate-800">
                                                            #{invoice.id}
                                                        </span>
                                                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-600 rounded">
                                                            {invoice.type_document || 'Document'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                                        Client: {invoice.num_client || 'Non assigné'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-800">
                                                        {formatCurrency(Number(invoice.montant_ttc) || 0)}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                                                        </svg>
                                                        {new Date(invoice.creation_date).toLocaleDateString('fr-FR')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
                                            </svg>
                                        </div>
                                        <p className="text-xs text-slate-500">Aucune facture récente</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions & Stats */}
                    <div className="space-y-4">
                        {/* Invoice Types Distribution */}
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                        </svg>
                                    </div>
                                    Types de Documents
                                </h3>
                            </div>
                            
                            <div className="p-4">
                                {stats?.invoicesByType && Object.keys(stats.invoicesByType).length > 0 ? (
                                    <div className="space-y-3">
                                        {Object.entries(stats.invoicesByType).map(([type, count]) => {
                                            const percentage = stats.totalInvoices > 0 
                                                ? (count / stats.totalInvoices) * 100 
                                                : 0;
                                            return (
                                                <div key={type}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium text-slate-700">{type}</span>
                                                        <span className="text-xs font-bold text-slate-800">{count}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 text-center py-2">
                                        Aucune donnée disponible
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                <h3 className="text-sm font-bold text-slate-800">Actions Rapides</h3>
                            </div>
                            <div className="p-3 space-y-2">
                                <button
                                    onClick={() => navigate('/dashboard/clients')}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800">Voir les Clients</p>
                                        <p className="text-[10px] text-slate-500">Gérer vos clients</p>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => navigate('/dashboard/dispatcher')}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800">Dispatcher</p>
                                        <p className="text-[10px] text-slate-500">Assigner des leads</p>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => navigate('/dashboard/my-invoices')}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800">Voir les Factures</p>
                                        <p className="text-[10px] text-slate-500">Gérer les documents</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Dashboard Component - Routes to Admin or User based on role
const Dashboard = () => {
    const { token, isAdmin, isLoading: isAuthLoading } = useAuth();

    // Wait for auth to complete - isAdmin will be null until /auth/me completes
    // We need to wait for both: not loading AND isAdmin is determined (not null)
    if (isAuthLoading || !token || isAdmin === null) {
        return (
            <div className="w-full py-2">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <div className="h-8 bg-slate-200 rounded-lg w-48 animate-pulse mb-1"></div>
                        <div className="h-4 bg-slate-200 rounded-lg w-64 animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
                                <div className="h-3 bg-slate-200 rounded w-20 mb-3"></div>
                                <div className="h-6 bg-slate-200 rounded w-28"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Route to appropriate dashboard based on role
    if (isAdmin) {
        return <AdminDashboard token={token} />;
    }
    
    return <UserDashboard token={token} />;
};

export default Dashboard;
