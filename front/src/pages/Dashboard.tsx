import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ClientServices from '@/API/ClientServices';
import InvoiceServices from '@/API/InvoiceServices';
import ApiUrls from '@/API/Urls';
import { formatCurrency } from '@/lib/utils';
import type { Invoice } from '@/entities/Invoice';

// Icons
const Icons = {
    Building: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
        </svg>
    ),
    Users: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    ),
    FileText: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
        </svg>
    ),
    Euro: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>
        </svg>
    ),
    TrendingUp: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
        </svg>
    ),
    ArrowRight: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
    ),
    Calendar: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
        </svg>
    ),
    Activity: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
    ),
};

interface DashboardStats {
    totalClients: number;
    totalClientsWithInvoices: number;
    totalClientsWithoutInvoices: number;
    totalInvoices: number;
    totalAmount: number;
    recentInvoices: Invoice[];
    invoicesByType: Record<string, number>;
}

const Dashboard = () => {
    const navigate = useNavigate();
    const { token, isAdmin } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header skeleton */}
                    <div className="mb-8">
                        <div className="h-10 bg-slate-200 rounded-lg w-64 animate-pulse mb-2"></div>
                        <div className="h-5 bg-slate-200 rounded-lg w-96 animate-pulse"></div>
                    </div>
                    {/* Stats skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-glass p-6 animate-pulse">
                                <div className="h-4 bg-slate-200 rounded w-24 mb-4"></div>
                                <div className="h-8 bg-slate-200 rounded w-32"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                        Tableau de bord
                    </h1>
                    <p className="text-slate-500">
                        Vue d'ensemble de votre activité CRM
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-stagger">
                    {/* Total Clients */}
                    <div 
                        onClick={() => navigate('/dashboard/clients')}
                        className="group cursor-pointer card-stats hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
                                    Total Clients
                                </p>
                                <p className="text-4xl font-extrabold text-slate-800">
                                    {stats?.totalClients || 0}
                                </p>
                                <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                                    <span className="text-emerald-600 font-semibold">{stats?.totalClientsWithInvoices || 0}</span> avec factures
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                                <Icons.Building />
                            </div>
                        </div>
                    </div>

                    {/* Total Invoices */}
                    <div 
                        onClick={() => isAdmin && navigate('/dashboard/my-leads')}
                        className={`card-stats ${isAdmin ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl' : ''} transition-all duration-300`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
                                    Total Factures
                                </p>
                                <p className="text-4xl font-extrabold text-slate-800">
                                    {stats?.totalInvoices || 0}
                                </p>
                                <p className="text-sm text-slate-500 mt-2">
                                    Documents enregistrés
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
                                <Icons.FileText />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Invoices */}
                    <div className="lg:col-span-2">
                        <div className="card-premium p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 flex items-center justify-center text-violet-600">
                                        <Icons.FileText />
                                    </div>
                                    Factures Récentes
                                </h2>
                                {isAdmin && (
                                    <button
                                        onClick={() => navigate('/dashboard/my-leads')}
                                        className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
                                    >
                                        Voir tout
                                        <Icons.ArrowRight />
                                    </button>
                                )}
                            </div>
                            
                            {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.recentInvoices.map((invoice) => (
                                        <div 
                                            key={invoice.id}
                                            className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                                                <Icons.FileText />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-slate-800">
                                                        #{invoice.id}
                                                    </span>
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-600 rounded-md">
                                                        {invoice.type_document || 'Document'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Client: {invoice.num_client || 'Non assigné'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-800">
                                                    {formatCurrency(Number(invoice.montant_ttc) || 0)}
                                                </p>
                                                <p className="text-xs text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                                                    <Icons.Calendar />
                                                    {new Date(invoice.creation_date).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                        <Icons.FileText />
                                    </div>
                                    <p className="text-slate-500">Aucune facture récente</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions & Stats */}
                    <div className="space-y-6">
                        {/* Invoice Types Distribution */}
                        <div className="card-premium p-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-600">
                                    <Icons.Activity />
                                </div>
                                Types de Documents
                            </h3>
                            
                            {stats?.invoicesByType && Object.keys(stats.invoicesByType).length > 0 ? (
                                <div className="space-y-4">
                                    {Object.entries(stats.invoicesByType).map(([type, count]) => {
                                        const percentage = stats.totalInvoices > 0 
                                            ? (count / stats.totalInvoices) * 100 
                                            : 0;
                                        return (
                                            <div key={type}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-sm font-medium text-slate-700">{type}</span>
                                                    <span className="text-sm font-bold text-slate-800">{count}</span>
                                                </div>
                                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
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
                                <p className="text-sm text-slate-500 text-center py-4">
                                    Aucune donnée disponible
                                </p>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="card-premium p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Actions Rapides</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate('/dashboard/clients')}
                                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 transition-all text-left group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Icons.Building />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">Voir les Clients</p>
                                        <p className="text-xs text-slate-500">Gérer vos clients</p>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => navigate('/dashboard/contact')}
                                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 transition-all text-left group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Icons.Users />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">Voir les Contacts</p>
                                        <p className="text-xs text-slate-500">Gérer vos contacts</p>
                                    </div>
                                </button>
                                
                                {isAdmin && (
                                    <button
                                        onClick={() => navigate('/dashboard/my-leads')}
                                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Icons.FileText />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">Voir les Factures</p>
                                            <p className="text-xs text-slate-500">Gérer les documents</p>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
