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

// Icons as SVG components
const Icons = {
    ArrowLeft: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
        </svg>
    ),
    Building: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
        </svg>
    ),
    Users: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    ),
    FileText: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
        </svg>
    ),
    Mail: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
    ),
    Phone: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
    ),
    Hash: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>
        </svg>
    ),
    Calendar: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
        </svg>
    ),
    Euro: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>
        </svg>
    ),
    Eye: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
        </svg>
    ),
    CheckCircle: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    ),
    User: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
    ),
    Briefcase: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
    ),
    AlertCircle: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
        </svg>
    ),
    FileSearch: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v3"/><polyline points="14 2 14 8 20 8"/><path d="M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="m9 18-1.5-1.5"/>
        </svg>
    ),
    UserX: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>
        </svg>
    ),
    MapPin: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
        </svg>
    ),
    Zap: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
    ),
    FileCheck: () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/>
        </svg>
    ),
};

// Loading skeleton component
const LoadingSkeleton = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 animate-pulse">
        <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-3xl shadow-glass p-8 mb-6">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-200 rounded-2xl"></div>
                    <div className="flex-1">
                        <div className="h-8 bg-slate-200 rounded-lg w-64 mb-3"></div>
                        <div className="h-5 bg-slate-200 rounded-lg w-48"></div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-glass p-6">
                        <div className="h-6 bg-slate-200 rounded-lg w-32 mb-4"></div>
                        <div className="space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// Status Badge component
const StatusBadge = ({ status }: { status: string }) => {
    const getStatusConfig = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active':
            case 'actif':
                return { 
                    bg: 'bg-gradient-to-r from-emerald-50 to-green-50', 
                    text: 'text-emerald-700', 
                    border: 'border-emerald-200/60',
                    dot: 'bg-emerald-500',
                    label: 'Actif'
                };
            case 'inactive':
            case 'inactif':
                return { 
                    bg: 'bg-gradient-to-r from-slate-50 to-gray-50', 
                    text: 'text-slate-600', 
                    border: 'border-slate-200/60',
                    dot: 'bg-slate-400',
                    label: 'Inactif'
                };
            case 'pending':
            case 'en attente':
                return { 
                    bg: 'bg-gradient-to-r from-amber-50 to-yellow-50', 
                    text: 'text-amber-700', 
                    border: 'border-amber-200/60',
                    dot: 'bg-amber-500',
                    label: 'En attente'
                };
            default:
                return { 
                    bg: 'bg-gradient-to-r from-blue-50 to-indigo-50', 
                    text: 'text-blue-700', 
                    border: 'border-blue-200/60',
                    dot: 'bg-blue-500',
                    label: status || 'Non défini'
                };
        }
    };
    
    const config = getStatusConfig(status);
    
    return (
        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase border ${config.bg} ${config.text} ${config.border} shadow-sm`}>
            <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`}></span>
            {config.label}
        </span>
    );
};

// Info Item component
const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | React.ReactNode }) => (
    <div className="flex items-start gap-4 py-4 border-b border-slate-100/80 last:border-0 group hover:bg-slate-50/50 -mx-4 px-4 rounded-xl transition-all duration-200">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/50 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform duration-200">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm font-semibold text-slate-800 break-words">{value || <span className="text-slate-300 italic font-normal">Non renseigné</span>}</p>
        </div>
    </div>
);

// Contact Card component with more details
const ContactCard = ({ contact }: { contact: Contact }) => (
    <div className="group bg-white rounded-2xl border border-slate-200/60 p-5 hover:shadow-lg hover:border-primary-200/60 transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/25">
                    {contact.prenom?.[0]?.toUpperCase() || ''}{contact.nom?.[0]?.toUpperCase() || 'C'}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 text-base group-hover:text-primary-700 transition-colors">
                    {contact.prenom} {contact.nom}
                </h4>
                {contact.fonction && (
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Icons.Briefcase />
                        {contact.fonction}
                    </p>
                )}
            </div>
        </div>
        
        {/* Contact Details */}
        <div className="mt-4 space-y-2 pt-4 border-t border-slate-100">
            {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-primary-600 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                        <Icons.Mail />
                    </div>
                    <span className="truncate">{contact.email}</span>
                </a>
            )}
            {contact.numTel && (
                <a href={`tel:${contact.numTel}`} className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-primary-600 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <Icons.Phone />
                    </div>
                    {contact.numTel}
                </a>
            )}
            {contact.raisonSociale && (
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-500">
                        <Icons.Building />
                    </div>
                    <span className="truncate">{contact.raisonSociale}</span>
                </div>
            )}
            <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                    <Icons.Hash />
                </div>
                <span>Client: {contact.num_client}</span>
            </div>
        </div>
    </div>
);

// Invoice Card component with full details
const InvoiceCard = ({ invoice, onViewPdf }: { invoice: Invoice; onViewPdf: () => void }) => (
    <div className="group bg-white rounded-2xl border border-slate-200/60 p-5 hover:shadow-lg hover:border-primary-200/60 transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
                    <Icons.FileText />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-800">#{invoice.id}</span>
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-violet-100 text-violet-700">
                            {invoice.type_document || 'Document'}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                        <Icons.Calendar />
                        {formatDate(invoice.creation_date)}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-2xl font-extrabold text-slate-800">
                    {formatCurrency(Number(invoice.montant_ttc) || 0)}
                </p>
                <p className="text-xs text-slate-400 uppercase">TTC</p>
            </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 py-4 border-t border-b border-slate-100">
            {invoice.siret && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">SIRET:</span>
                    <span className="font-medium text-slate-700">{invoice.siret}</span>
                </div>
            )}
            {invoice.code_naf && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">NAF:</span>
                    <span className="font-medium text-slate-700">{invoice.code_naf}</span>
                </div>
            )}
            {invoice.code_postal && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Code Postal:</span>
                    <span className="font-medium text-slate-700">{invoice.code_postal}</span>
                </div>
            )}
            {invoice.pdl && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">PDL:</span>
                    <span className="font-medium text-slate-700 truncate">{invoice.pdl}</span>
                </div>
            )}
            {invoice.conso_annuelle && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Conso:</span>
                    <span className="font-medium text-slate-700">{invoice.conso_annuelle}</span>
                </div>
            )}
            {invoice.prix_unitaire && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Prix unit.:</span>
                    <span className="font-medium text-slate-700">{invoice.prix_unitaire} €</span>
                </div>
            )}
            {invoice.echeance && (
                <div className="flex items-center gap-2 text-sm col-span-2">
                    <span className="text-slate-400">Échéance:</span>
                    <span className="font-medium text-slate-700">{formatDate(invoice.echeance)}</span>
                </div>
            )}
            {invoice.adresse_site && (
                <div className="flex items-start gap-2 text-sm col-span-2">
                    <span className="text-slate-400 flex-shrink-0">Adresse:</span>
                    <span className="font-medium text-slate-700">{invoice.adresse_site}</span>
                </div>
            )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-2">
            {invoice.original_filename && (
                <p className="text-xs text-slate-400 truncate max-w-[200px]" title={invoice.original_filename}>
                    📄 {invoice.original_filename}
                </p>
            )}
            <button
                onClick={onViewPdf}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 text-sm font-semibold transition-all duration-200 ml-auto"
            >
                <Icons.Eye />
                Voir PDF
            </button>
        </div>
    </div>
);

// Empty State component
const EmptyState = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center text-slate-400 mb-5">
            {icon}
        </div>
        <h4 className="text-lg font-semibold text-slate-700 mb-2">{title}</h4>
        <p className="text-sm text-slate-500 max-w-xs">{description}</p>
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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl shadow-glass p-12 text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                        <Icons.AlertCircle />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Erreur</h2>
                    <p className="text-slate-500 mb-8">{error}</p>
                    <Button onClick={() => navigate('/dashboard/clients')} className="btn-premium">
                        Retourner à la liste
                    </Button>
                </div>
            </div>
        );
    }
    
    if (!client) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl shadow-glass p-12 text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                        <Icons.FileSearch />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Client non trouvé</h2>
                    <p className="text-slate-500 mb-8">Le client demandé n'existe pas ou a été supprimé.</p>
                    <Button onClick={() => navigate('/dashboard/clients')} className="btn-premium">
                        Retourner à la liste
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-slate-200/60">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={() => navigate('/dashboard/clients')}
                            className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 font-medium transition-colors"
                        >
                            <Icons.ArrowLeft />
                            <span>Retour aux clients</span>
                        </button>
                        
                        <div className="flex items-center gap-3">
                            <StatusBadge status={client.status || ''} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Client Header Card */}
                <div className="relative overflow-hidden bg-white rounded-3xl shadow-glass border border-slate-100 mb-8 animate-fade-in">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 via-primary-400 to-cyan-400"></div>
                    
                    <div className="p-8">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <div className="flex-shrink-0">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-xl shadow-primary-500/30">
                                    <Icons.Building />
                                </div>
                            </div>
                            
                            <div className="flex-1">
                                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                                    {client.raisonSociale || `Client #${client.num_client}`}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Icons.Hash />
                                        {client.num_client}
                                    </span>
                                    {client.profile && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary-50 text-primary-700 font-medium">
                                            {client.profile}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="flex gap-6 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-200/60 md:pl-8">
                                <div className="text-center">
                                    <p className="text-3xl font-extrabold text-primary-600">{contacts.length}</p>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Contacts</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-3xl font-extrabold text-emerald-600">{invoices.length}</p>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Factures</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Client Info */}
                    <div className="lg:col-span-1">
                        <div className="card-premium p-6">
                            <h3 className="section-title mb-6">
                                <span className="section-title-icon">
                                    <Icons.Building />
                                </span>
                                Informations
                            </h3>
                            
                            <div className="space-y-1">
                                <InfoItem icon={<Icons.Hash />} label="Numéro Client" value={client.num_client} />
                                <InfoItem icon={<Icons.Building />} label="Raison Sociale" value={client.raisonSociale || ''} />
                                <InfoItem icon={<Icons.User />} label="Profil" value={client.profile || ''} />
                                <InfoItem 
                                    icon={<Icons.CheckCircle />} 
                                    label="Statut" 
                                    value={<StatusBadge status={client.status || ''} />} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Tabs for Contacts & Invoices */}
                    <div className="lg:col-span-2">
                        <div className="card-premium overflow-hidden">
                            {/* Tab Navigation */}
                            <div className="border-b border-slate-100 px-6 pt-6">
                                <div className="flex gap-1 p-1 rounded-xl bg-slate-100 w-fit">
                                    <button
                                        onClick={() => setActiveTab('contacts')}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                            activeTab === 'contacts' 
                                                ? 'bg-white text-primary-600 shadow-sm' 
                                                : 'text-slate-600 hover:text-slate-800'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icons.Users />
                                            Contacts ({contacts.length})
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('invoices')}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                            activeTab === 'invoices' 
                                                ? 'bg-white text-primary-600 shadow-sm' 
                                                : 'text-slate-600 hover:text-slate-800'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icons.FileText />
                                            Factures ({invoices.length})
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="p-6">
                                {activeTab === 'contacts' && (
                                    <>
                                        {contacts.length > 0 ? (
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
        </div>
    );
};

export default ClientDetails;
