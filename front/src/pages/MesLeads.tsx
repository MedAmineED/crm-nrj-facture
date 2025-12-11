import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ClientAssignmentServices, { type ClientAssignment } from '@/API/ClientAssignmentServices';
import { useAuth } from '@/hooks/useAuth';

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
    'nouveau': 'bg-slate-100 text-slate-700 border-slate-300',
    'rdv pris': 'bg-blue-100 text-blue-800 border-blue-300',
    'a rappeler': 'bg-amber-100 text-amber-800 border-amber-300',
    'en négociation': 'bg-purple-100 text-purple-800 border-purple-300',
    'devis envoyé': 'bg-cyan-100 text-cyan-800 border-cyan-300',
    'converti': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'pas intéressé': 'bg-orange-100 text-orange-800 border-orange-300',
    'mort': 'bg-red-100 text-red-800 border-red-300',
    'injoignable': 'bg-gray-100 text-gray-700 border-gray-300',
};

// Département options
const DEPARTEMENT_OPTIONS = [
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '21',
    '22', '23', '24', '25', '26', '27', '28', '29', '30', '31',
    '32', '33', '34', '35', '36', '37', '38', '39', '40', '41',
    '42', '43', '44', '45', '46', '47', '48', '49', '50', '51',
    '52', '53', '54', '55', '56', '57', '58', '59', '60', '61',
    '62', '63', '64', '65', '66', '67', '68', '69', '70', '71',
    '72', '73', '74', '75', '76', '77', '78', '79', '80', '81',
    '82', '83', '84', '85', '86', '87', '88', '89', '90', '91',
    '92', '93', '94', '95', '971', '972', '973', '974', '976'
];

const getStatusStyle = (status: string) => {
    const key = status?.toLowerCase();
    return STATUS_COLORS[key] || 'bg-slate-100 text-slate-700 border-slate-300';
};

const MesLeads: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
    const [allAssignments, setAllAssignments] = useState<ClientAssignment[]>([]); // For extracting unique statuses
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editStatus, setEditStatus] = useState('');
    const [editComment, setEditComment] = useState('');
    const [message, setMessage] = useState('');
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);

    // Filter values directly used (no separate state + filters)
    const [statusFilter, setStatusFilter] = useState('');
    const [raisonSocialeFilter, setRaisonSocialeFilter] = useState('');
    const [numClientFilter, setNumClientFilter] = useState('');
    const [departementFilter, setDepartementFilter] = useState('');
    const [codePostalFilter, setCodePostalFilter] = useState('');
    const [adresseFilter, setAdresseFilter] = useState('');
    const [montantMin, setMontantMin] = useState('');
    const [montantMax, setMontantMax] = useState('');
    const [consoMin, setConsoMin] = useState('');
    const [consoMax, setConsoMax] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(25);

    // Dynamic status options extracted from all assignments
    const statusOptions = useMemo(() => {
        const statuses = allAssignments
            .map(a => a.status)
            .filter((s): s is string => !!s);
        const uniqueStatuses = [...new Set(statuses)];
        return uniqueStatuses.sort((a, b) => a.localeCompare(b));
    }, [allAssignments]);

    // Fetch all assignments initially (for status options)
    useEffect(() => {
        const fetchAll = async () => {
            if (!token) return;
            try {
                const data = await ClientAssignmentServices.getMyClients(token, {});
                setAllAssignments(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchAll();
    }, [token]);

    const fetchAssignments = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await ClientAssignmentServices.getMyClients(token, {
                status: statusFilter || undefined,
                raisonSociale: raisonSocialeFilter || undefined,
                num_client: numClientFilter || undefined,
                departement: departementFilter || undefined,
                code_postal: codePostalFilter || undefined,
                adresse_site: adresseFilter || undefined,
                montant_ttc_min: montantMin ? parseFloat(montantMin) : undefined,
                montant_ttc_max: montantMax ? parseFloat(montantMax) : undefined,
                conso_annuelle_min: consoMin ? parseFloat(consoMin) : undefined,
                conso_annuelle_max: consoMax ? parseFloat(consoMax) : undefined,
            });
            setAssignments(data);
            setTotalCount(data.length);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [token, statusFilter, raisonSocialeFilter, numClientFilter, departementFilter, 
        codePostalFilter, adresseFilter, montantMin, montantMax, consoMin, consoMax]);

    // Debounced auto-filter on any change
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchAssignments();
            setPage(1);
        }, 300);
        return () => clearTimeout(debounceTimer);
    }, [statusFilter, raisonSocialeFilter, numClientFilter, departementFilter, 
        codePostalFilter, adresseFilter, montantMin, montantMax, consoMin, consoMax, token]);

    // Initial load
    useEffect(() => {
        fetchAssignments();
    }, []);

    const clearFilters = () => {
        setStatusFilter('');
        setRaisonSocialeFilter('');
        setNumClientFilter('');
        setDepartementFilter('');
        setCodePostalFilter('');
        setAdresseFilter('');
        setMontantMin('');
        setMontantMax('');
        setConsoMin('');
        setConsoMax('');
        setPage(1);
    };

    const startEdit = (assignment: ClientAssignment) => {
        setEditingId(assignment.id);
        setEditStatus(assignment.status || 'Nouveau');
        setEditComment(assignment.comment || '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditStatus('');
        setEditComment('');
    };

    const saveEdit = async (id: number) => {
        if (!token) return;
        try {
            await ClientAssignmentServices.updateStatus(token, id, editStatus, editComment);
            setMessage('✅ Statut mis à jour avec succès');
            setEditingId(null);
            fetchAssignments();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('❌ Erreur lors de la mise à jour');
        }
    };

    // Paginate data client-side
    const paginatedData = assignments.slice(
        (page - 1) * limit,
        page * limit
    );

    const totalPages = Math.ceil(totalCount / limit);

    const activeFilterCount = [
        statusFilter, raisonSocialeFilter, numClientFilter, 
        departementFilter, codePostalFilter, adresseFilter,
        montantMin, montantMax, consoMin, consoMax
    ].filter(Boolean).length;

    return (
        <div className="w-full py-2">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Mes Leads</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Gérez vos clients assignés</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                        <strong className="text-primary-600">{totalCount}</strong> leads
                    </span>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm flex justify-between items-center ${
                    message.includes('✅') ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                    <span>{message}</span>
                    <button onClick={() => setMessage('')} className="hover:opacity-70 text-lg font-medium">×</button>
                </div>
            )}

            {/* Filters Panel */}
            <div className="mb-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                            </svg>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Filtres</span>
                        {activeFilterCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary-500 text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </div>
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isFiltersOpen ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    >
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </button>

                <div className={`transition-all duration-200 ease-in-out overflow-hidden ${isFiltersOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {/* Statut */}
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Statut</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                                >
                                    <option value="">Tous</option>
                                    {statusOptions.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Raison Sociale */}
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Raison Sociale</label>
                                <input
                                    type="text"
                                    value={raisonSocialeFilter}
                                    onChange={(e) => setRaisonSocialeFilter(e.target.value)}
                                    placeholder="Rechercher..."
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* N° Client */}
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">N° Client</label>
                                <input
                                    type="text"
                                    value={numClientFilter}
                                    onChange={(e) => setNumClientFilter(e.target.value)}
                                    placeholder="Rechercher..."
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* Département */}
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Département</label>
                                <select
                                    value={departementFilter}
                                    onChange={(e) => setDepartementFilter(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                                >
                                    <option value="">Tous</option>
                                    {DEPARTEMENT_OPTIONS.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Code Postal */}
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Code Postal</label>
                                <input
                                    type="text"
                                    value={codePostalFilter}
                                    onChange={(e) => setCodePostalFilter(e.target.value)}
                                    placeholder="75001"
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* Adresse */}
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Adresse</label>
                                <input
                                    type="text"
                                    value={adresseFilter}
                                    onChange={(e) => setAdresseFilter(e.target.value)}
                                    placeholder="Rechercher..."
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* Montant Min/Max */}
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Montant (€)</label>
                                <div className="flex gap-1">
                                    <input
                                        type="number"
                                        value={montantMin}
                                        onChange={(e) => setMontantMin(e.target.value)}
                                        placeholder="Min"
                                        className="w-1/2 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                    <input
                                        type="number"
                                        value={montantMax}
                                        onChange={(e) => setMontantMax(e.target.value)}
                                        placeholder="Max"
                                        className="w-1/2 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Conso Min/Max */}
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Conso (kWh)</label>
                                <div className="flex gap-1">
                                    <input
                                        type="number"
                                        value={consoMin}
                                        onChange={(e) => setConsoMin(e.target.value)}
                                        placeholder="Min"
                                        className="w-1/2 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                    <input
                                        type="number"
                                        value={consoMax}
                                        onChange={(e) => setConsoMax(e.target.value)}
                                        placeholder="Max"
                                        className="w-1/2 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Clear Button */}
                            <div className="flex items-end">
                                <button
                                    onClick={clearFilters}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    Réinitialiser
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Legend */}
            <div className="mb-4 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="flex flex-wrap gap-1.5">
                    {statusOptions.map(s => (
                        <span key={s} className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${getStatusStyle(s)}`}>
                            {s}
                        </span>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-slate-500 mt-3">Chargement...</p>
                </div>
            ) : totalCount === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-slate-600 text-lg font-medium">Aucun lead trouvé</p>
                    <p className="text-slate-400 text-sm mt-2">Modifiez vos filtres ou attendez de nouvelles assignations</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide">N° Client</th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Raison Sociale</th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Statut</th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Commentaire</th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Assigné le</th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedData.map((assignment) => (
                                    <tr key={assignment.id} className="hover:bg-slate-25 transition-colors">
                                        <td className="px-3 py-2">
                                            <span 
                                                className="font-mono text-xs text-blue-600 font-medium hover:underline cursor-pointer"
                                                onClick={() => assignment.client?.id && navigate(`/dashboard/clients/${assignment.client.id}`)}
                                            >
                                                {assignment.client?.num_client || '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="font-medium text-slate-800 text-xs">
                                                {assignment.client?.raisonSociale || '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            {editingId === assignment.id ? (
                                                <select
                                                    value={editStatus}
                                                    onChange={(e) => setEditStatus(e.target.value)}
                                                    className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                                                >
                                                    {statusOptions.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusStyle(assignment.status)}`}>
                                                    {assignment.status || 'Nouveau'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 max-w-[180px]">
                                            {editingId === assignment.id ? (
                                                <input
                                                    type="text"
                                                    value={editComment}
                                                    onChange={(e) => setEditComment(e.target.value)}
                                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                    placeholder="Commentaire..."
                                                />
                                            ) : (
                                                <span className="text-xs text-slate-500 truncate block">
                                                    {assignment.comment || '-'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="text-xs text-slate-500">
                                                {new Date(assignment.assignedAt).toLocaleDateString('fr-FR')}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex gap-1">
                                                {editingId === assignment.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => saveEdit(assignment.id)}
                                                            className="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-medium hover:bg-emerald-700"
                                                        >
                                                            Sauver
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[10px] font-medium hover:bg-slate-300"
                                                        >
                                                            Annuler
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => startEdit(assignment)}
                                                            className="text-primary-600 hover:bg-primary-50 px-2 py-1 rounded text-[10px] font-medium border border-primary-200"
                                                        >
                                                            Modifier
                                                        </button>
                                                        <button
                                                            onClick={() => assignment.client?.id && navigate(`/dashboard/clients/${assignment.client.id}`)}
                                                            className="text-slate-600 hover:bg-slate-100 px-2 py-1 rounded text-[10px] font-medium border border-slate-200"
                                                        >
                                                            Détails
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                Page {page} sur {totalPages} ({totalCount} résultats)
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ← Préc.
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Suiv. →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MesLeads;
