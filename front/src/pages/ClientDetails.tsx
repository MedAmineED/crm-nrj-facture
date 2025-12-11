import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientServices, { type Client } from '@/API/ClientServices';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import type { Contact } from '@/entities/Contact';
import type { Invoice } from '@/entities/Invoice';
import InvoiceServices from '@/API/InvoiceServices';
import ApiUrls from '@/API/Urls';
import { formatCurrency, formatDate } from '@/lib/utils';

// Compact Icons
const Icons = {
    ArrowLeft: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
        </svg>
    ),
    Building: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
        </svg>
    ),
    Users: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    ),
    FileText: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
        </svg>
    ),
    Mail: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
    ),
    Phone: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
    ),
    Hash: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>
        </svg>
    ),
    Calendar: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
        </svg>
    ),
    Euro: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>
        </svg>
    ),
    Eye: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
        </svg>
    ),
    CheckCircle: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    ),
    User: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
    ),
    Briefcase: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
    ),
    AlertCircle: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
        </svg>
    ),
    FileSearch: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v3"/><polyline points="14 2 14 8 20 8"/><path d="M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="m9 18-1.5-1.5"/>
        </svg>
    ),
    UserX: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>
        </svg>
    ),
    MapPin: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
        </svg>
    ),
};

// Compact Loading skeleton
const LoadingSkeleton = () => (
    <div className="w-full py-4 animate-pulse">
        <div className="bg-white rounded-xl border border-slate-100 p-4 mb-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                <div className="flex-1">
                    <div className="h-5 bg-slate-200 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4">
                    <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
                    <div className="space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-full"></div>
                        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// Compact Status Badge - matching MesLeads colors
const StatusBadge = ({ status }: { status: string }) => {
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
    
    const key = status?.toLowerCase();
    const colorClass = STATUS_COLORS[key] || 'bg-slate-100 text-slate-700 border-slate-300';
    
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
            {status || 'Nouveau'}
        </span>
    );
};

// Compact Info Item
const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | React.ReactNode }) => (
    <div className="flex items-center gap-2.5 py-2 border-b border-slate-50 last:border-0">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-xs font-medium text-slate-700 truncate">{value || <span className="text-slate-300 italic">—</span>}</p>
        </div>
    </div>
);

// Compact Contact Card
const ContactCard = ({ contact }: { contact: Contact }) => (
    <div className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md hover:border-primary-200 transition-all">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {contact.prenom?.[0]?.toUpperCase() || ''}{contact.nom?.[0]?.toUpperCase() || 'C'}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 text-sm truncate">
                    {contact.prenom} {contact.nom}
                </h4>
                {contact.fonction && (
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Icons.Briefcase />
                        {contact.fonction}
                    </p>
                )}
            </div>
        </div>
        
        <div className="mt-2.5 pt-2.5 border-t border-slate-50 space-y-1.5">
            {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-primary-600 transition-colors">
                    <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center text-blue-500">
                        <Icons.Mail />
                    </div>
                    <span className="truncate">{contact.email}</span>
                </a>
            )}
            {contact.numTel && (
                <a href={`tel:${contact.numTel}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-primary-600 transition-colors">
                    <div className="w-5 h-5 rounded bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <Icons.Phone />
                    </div>
                    {contact.numTel}
                </a>
            )}
        </div>
    </div>
);

// Compact Invoice Card
const InvoiceCard = ({ invoice, onViewPdf }: { invoice: Invoice; onViewPdf: () => void }) => (
    <div className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md hover:border-primary-200 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white shadow-sm">
                    <Icons.FileText />
                </div>
                <div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-800">#{invoice.id}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-700">
                            {invoice.type_document || 'Doc'}
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Icons.Calendar />
                        {formatDate(invoice.creation_date)}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-base font-bold text-slate-800">
                    {formatCurrency(Number(invoice.montant_ttc) || 0)}
                </p>
                <p className="text-[9px] text-slate-400 uppercase">TTC</p>
            </div>
        </div>

        {/* Details Grid - Compact */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 py-2 border-t border-b border-slate-50 text-[11px]">
            {invoice.siret && (
                <div><span className="text-slate-400">SIRET:</span> <span className="font-medium text-slate-600">{invoice.siret}</span></div>
            )}
            {invoice.code_postal && (
                <div><span className="text-slate-400">CP:</span> <span className="font-medium text-slate-600">{invoice.code_postal}</span></div>
            )}
            {invoice.pdl && (
                <div className="truncate"><span className="text-slate-400">PDL:</span> <span className="font-medium text-slate-600">{invoice.pdl}</span></div>
            )}
            {invoice.conso_annuelle && (
                <div><span className="text-slate-400">Conso:</span> <span className="font-medium text-slate-600">{invoice.conso_annuelle}</span></div>
            )}
            {invoice.echeance && (
                <div><span className="text-slate-400">Éch:</span> <span className="font-medium text-slate-600">{formatDate(invoice.echeance)}</span></div>
            )}
            {invoice.prix_unitaire && (
                <div><span className="text-slate-400">P.U.:</span> <span className="font-medium text-slate-600">{invoice.prix_unitaire}€</span></div>
            )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-2 pt-1">
            {invoice.original_filename && (
                <p className="text-[10px] text-slate-400 truncate max-w-[140px]" title={invoice.original_filename}>
                    📄 {invoice.original_filename}
                </p>
            )}
            <button
                onClick={onViewPdf}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-medium transition-all ml-auto"
            >
                <Icons.Eye />
                PDF
            </button>
        </div>
    </div>
);

// Compact Empty State
const EmptyState = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            {icon}
        </div>
        <h4 className="text-sm font-semibold text-slate-600 mb-1">{title}</h4>
        <p className="text-xs text-slate-400 max-w-xs">{description}</p>
    </div>
);

// Main Component
const ClientDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [client, setClient] = useState<Client | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'contacts' | 'invoices'>('contacts');
    
    // Editing status/comment
    const [isEditingStatusComment, setIsEditingStatusComment] = useState(false);
    const [editStatus, setEditStatus] = useState('');
    const [editComment, setEditComment] = useState('');
    const [saveMessage, setSaveMessage] = useState('');

    const STATUS_OPTIONS = [
        'Nouveau', 'RDV Pris', 'A rappeler', 'En négociation', 
        'Devis envoyé', 'Converti', 'Pas intéressé', 'Mort', 'Injoignable'
    ];

    const handleStartEdit = () => {
        setEditStatus(client?.status || '');
        setEditComment(client?.comment || '');
        setIsEditingStatusComment(true);
    };

    const handleSaveStatusComment = async () => {
        if (!client || !token) return;
        try {
            await ClientServices.updateClient(client.id, token, { 
                status: editStatus, 
                comment: editComment 
            });
            setClient({ ...client, status: editStatus, comment: editComment });
            setIsEditingStatusComment(false);
            setSaveMessage('✅ Modifications enregistrées');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (err) {
            setSaveMessage('❌ Erreur lors de la sauvegarde');
        }
    };

    useEffect(() => {
        const fetchClientDetails = async () => {
            if (!id || !token) return;
            setIsLoading(true);
            try {
                const clientData = await ClientServices.getClient(+id, token);
                setClient(clientData);

                if ((clientData as any).contacts) {
                    setContacts((clientData as any).contacts);
                }

                if (clientData.num_client) {
                    const invoicesResponse = await InvoiceServices.GetInvoicesByClient(ApiUrls.BASE_URL, clientData.num_client, token, {});
                    setInvoices(invoicesResponse.data || []);
                }

            } catch (err) {
                console.error("Error fetching client details:", err);
                setError("Impossible de charger les détails du client.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchClientDetails();
    }, [id, token]);

    const handleViewPdf = async (invoice: Invoice) => {
        try {
            const pdfUrl = await InvoiceServices.getPdfFile(invoice.id, token!);
            window.open(pdfUrl, '_blank');
        } catch (e) {
            alert("Erreur lors de l'ouverture du PDF");
        }
    };

    if (isLoading) return <LoadingSkeleton />;
    
    if (error) {
        return (
            <div className="w-full py-8 flex items-center justify-center">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center max-w-sm">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                        <Icons.AlertCircle />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mb-1">Erreur</h2>
                    <p className="text-sm text-slate-500 mb-6">{error}</p>
                    <Button onClick={() => navigate(-1)} className="text-xs px-4 py-2">
                        Retour
                    </Button>
                </div>
            </div>
        );
    }
    
    if (!client) {
        return (
            <div className="w-full py-8 flex items-center justify-center">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center max-w-sm">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                        <Icons.FileSearch />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mb-1">Client non trouvé</h2>
                    <p className="text-sm text-slate-500 mb-6">Le client demandé n'existe pas ou a été supprimé.</p>
                    <Button onClick={() => navigate(-1)} className="text-xs px-4 py-2">
                        Retour
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full py-2">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between mb-4">
                <button 
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-primary-600 font-medium transition-colors"
                >
                    <Icons.ArrowLeft />
                    <span>Retour</span>
                </button>
                <StatusBadge status={client.status || ''} />
            </div>

            {/* Client Header Card - Compact */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-4 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary-500 via-primary-400 to-cyan-400"></div>
                <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-md">
                                <Icons.Building />
                            </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-bold text-slate-800 truncate">
                                {client.raisonSociale || `Client #${client.num_client}`}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                    <Icons.Hash />
                                    {client.num_client}
                                </span>
                                {client.profile && (
                                    <span className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 font-medium text-[10px]">
                                        {client.profile}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-4">
                            <div className="text-center">
                                <p className="text-xl font-bold text-primary-600">{contacts.length}</p>
                                <p className="text-[10px] font-medium text-slate-500 uppercase">Contacts</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-emerald-600">{invoices.length}</p>
                                <p className="text-[10px] font-medium text-slate-500 uppercase">Factures</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Left Column - Client Info */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                        <h3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-primary-50 flex items-center justify-center text-primary-500">
                                <Icons.Building />
                            </div>
                            Informations
                        </h3>
                        
                        <div className="space-y-0.5">
                            <InfoItem icon={<Icons.Hash />} label="N° Client" value={client.num_client} />
                            <InfoItem icon={<Icons.Building />} label="Raison Sociale" value={client.raisonSociale || ''} />
                            <InfoItem icon={<Icons.User />} label="Profil" value={client.profile || ''} />
                            
                            {isEditingStatusComment ? (
                                <div className="pt-2 space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Statut</label>
                                        <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value)}
                                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        >
                                            <option value="">Sélectionner...</option>
                                            {STATUS_OPTIONS.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Commentaire</label>
                                        <textarea
                                            value={editComment}
                                            onChange={(e) => setEditComment(e.target.value)}
                                            placeholder="Ajouter un commentaire..."
                                            rows={2}
                                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveStatusComment}
                                            className="px-3 py-1 text-[10px] font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            Sauvegarder
                                        </button>
                                        <button
                                            onClick={() => setIsEditingStatusComment(false)}
                                            className="px-3 py-1 text-[10px] font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <InfoItem 
                                        icon={<Icons.CheckCircle />} 
                                        label="Statut" 
                                        value={<StatusBadge status={client.status || ''} />} 
                                    />
                                    {client.comment && (
                                        <InfoItem 
                                            icon={<Icons.FileText />} 
                                            label="Commentaire" 
                                            value={<span className="text-slate-600 text-xs">{client.comment}</span>} 
                                        />
                                    )}
                                    <button
                                        onClick={handleStartEdit}
                                        className="mt-3 w-full px-3 py-1.5 text-[10px] font-medium rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-200"
                                    >
                                        Modifier Statut / Commentaire
                                    </button>
                                </>
                            )}
                            
                            {saveMessage && (
                                <div className={`mt-2 p-2 rounded-lg text-[10px] ${
                                    saveMessage.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                }`}>
                                    {saveMessage}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Tabs */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        {/* Tab Navigation */}
                        <div className="border-b border-slate-100 px-4 pt-3 pb-0">
                            <div className="flex gap-1 p-0.5 rounded-lg bg-slate-100 w-fit">
                                <button
                                    onClick={() => setActiveTab('contacts')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                        activeTab === 'contacts' 
                                            ? 'bg-white text-primary-600 shadow-sm' 
                                            : 'text-slate-600 hover:text-slate-800'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Icons.Users />
                                        Contacts ({contacts.length})
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('invoices')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                        activeTab === 'invoices' 
                                            ? 'bg-white text-primary-600 shadow-sm' 
                                            : 'text-slate-600 hover:text-slate-800'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Icons.FileText />
                                        Factures ({invoices.length})
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="p-4">
                            {activeTab === 'contacts' && (
                                <>
                                    {contacts.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {contacts.map((contact) => (
                                                <ContactCard key={contact.id} contact={contact} />
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={<Icons.UserX />}
                                            title="Aucun contact"
                                            description="Ce client n'a pas encore de contacts associés."
                                        />
                                    )}
                                </>
                            )}

                            {activeTab === 'invoices' && (
                                <>
                                    {invoices.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {invoices.map((invoice) => (
                                                <InvoiceCard
                                                    key={invoice.id}
                                                    invoice={invoice}
                                                    onViewPdf={() => handleViewPdf(invoice)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={<Icons.FileSearch />}
                                            title="Aucune facture"
                                            description="Ce client n'a pas encore de factures enregistrées."
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDetails;
