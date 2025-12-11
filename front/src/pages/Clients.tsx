import Button from '@/components/ui/Button';
import { DataTable } from '@/components/ui/Table';
import type { ColumnDef } from '@tanstack/react-table';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ClientServices, { type Client } from '@/API/ClientServices';
import ClientAssignmentServices from '@/API/ClientAssignmentServices';
import { useAuth } from '@/hooks/useAuth';
import EditClientModal from '@/components/EditClientModal';
import axios from 'axios';
import ApiUrls from '@/API/Urls';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type Column = ColumnDef<Client> & {
  filterType?: 'text' | 'number' | 'dateRange' | 'select';
  filterOptions?: string[];
  enableColumnFilter?: boolean;
};

interface FilterState {
  page: number;
  limit: number;
  hasInvoices?: 'with' | 'without' | 'all';
  profile?: string;
  status?: string;
  raisonSociale?: string;
  num_client?: string;
  search?: string;
  // Invoice-based filters
  departement?: string;
  code_postal?: string;
  adresse_site?: string;
  montant_ttc_min?: number;
  montant_ttc_max?: number;
  conso_annuelle_min?: number;
  conso_annuelle_max?: number;
  [key: string]: any;
}

interface ImportResult {
  totalRecords: number;
  successfulImports: number;
  failedImports: number;
  duplicatePhoneNumbers: number;
  failedDueToMissingNumClient: number;
  failedDueToDuplicateNumClient: number;
  failedDueToInvalidPhone: number;
  failedDueToInvalidEmail: number;
  failedDueToDuplicateEmail: number;
  failedDueToOtherErrors: number;
  otherErrorsDetails?: string[];
}

const Clients = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Parse filters from URL params
  const getInitialFilters = useCallback((): FilterState => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const hasInvoices = (searchParams.get('hasInvoices') as 'with' | 'without' | 'all') || 'with';
    
    return {
      page,
      limit,
      hasInvoices,
      status: searchParams.get('status') || undefined,
      raisonSociale: searchParams.get('raisonSociale') || undefined,
      num_client: searchParams.get('num_client') || undefined,
      departement: searchParams.get('departement') || undefined,
      code_postal: searchParams.get('code_postal') || undefined,
      adresse_site: searchParams.get('adresse_site') || undefined,
      montant_ttc_min: searchParams.get('montant_ttc_min') ? Number(searchParams.get('montant_ttc_min')) : undefined,
      montant_ttc_max: searchParams.get('montant_ttc_max') ? Number(searchParams.get('montant_ttc_max')) : undefined,
      conso_annuelle_min: searchParams.get('conso_annuelle_min') ? Number(searchParams.get('conso_annuelle_min')) : undefined,
      conso_annuelle_max: searchParams.get('conso_annuelle_max') ? Number(searchParams.get('conso_annuelle_max')) : undefined,
    };
  }, [searchParams]);

  const [clients, setClients] = useState<Client[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(() => {
    // Open filters by default if there are active filters (other than default ones)
    const initial = getInitialFilters();
    return !!(initial.status || initial.raisonSociale || initial.num_client || 
              initial.departement || initial.code_postal || initial.adresse_site ||
              initial.montant_ttc_min || initial.montant_ttc_max || 
              initial.conso_annuelle_min || initial.conso_annuelle_max);
  });
  const { isAdmin, isLoading: isAuthLoading, token } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    
    // Always include page and limit
    params.set('page', String(filters.page));
    params.set('limit', String(filters.limit));
    if (filters.hasInvoices) params.set('hasInvoices', filters.hasInvoices);
    
    // Only include non-empty filter values
    if (filters.status) params.set('status', filters.status);
    if (filters.raisonSociale) params.set('raisonSociale', filters.raisonSociale);
    if (filters.num_client) params.set('num_client', filters.num_client);
    if (filters.departement) params.set('departement', filters.departement);
    if (filters.code_postal) params.set('code_postal', filters.code_postal);
    if (filters.adresse_site) params.set('adresse_site', filters.adresse_site);
    if (filters.montant_ttc_min !== undefined) params.set('montant_ttc_min', String(filters.montant_ttc_min));
    if (filters.montant_ttc_max !== undefined) params.set('montant_ttc_max', String(filters.montant_ttc_max));
    if (filters.conso_annuelle_min !== undefined) params.set('conso_annuelle_min', String(filters.conso_annuelle_min));
    if (filters.conso_annuelle_max !== undefined) params.set('conso_annuelle_max', String(filters.conso_annuelle_max));
    
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Import State
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const dbFields = [
    { value: 'num_client', label: 'Numéro Client', required: true },
    { value: 'nom', label: 'Nom', required: false },
    { value: 'prenom', label: 'Prénom', required: false },
    { value: 'raisonSociale', label: 'Raison Sociale', required: false },
    { value: 'fonction', label: 'Fonction', required: false },
    { value: 'email', label: 'Email', required: false },
    { value: 'numTel', label: 'Numéro de Téléphone', required: true },
    { value: 'profile', label: 'Profil', required: false },
    { value: 'status', label: 'Statut', required: false },
  ];

  const defaultText = (id: keyof Client, header: string): Column => ({
    accessorKey: id,
    header,
    enableColumnFilter: false,
  });

  // Status color mapping (same as MesLeads)
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

  const getStatusStyle = (status: string) => {
    const key = status?.toLowerCase();
    return STATUS_COLORS[key] || 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const columns: Column[] = [
    {
        accessorKey: 'num_client',
        header: 'N° Client',
        cell: ({ row }) => (
            <span 
                className="text-primary-600 hover:text-primary-700 hover:underline cursor-pointer font-medium text-xs"
                onClick={() => navigate(`/dashboard/clients/${row.original.id}`)}
            >
                {row.original.num_client}
            </span>
        )
    },
    {
        accessorKey: 'raisonSociale',
        header: 'Raison Sociale',
        cell: ({ row }) => (
            <span className="text-xs text-slate-700 font-medium">
                {row.original.raisonSociale || '-'}
            </span>
        )
    },
    {
        accessorKey: 'status',
        header: 'Statut',
        cell: ({ row }) => (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusStyle(row.original.status)}`}>
                {row.original.status || 'Nouveau'}
            </span>
        )
    },
    {
        accessorKey: 'comment',
        header: 'Commentaire',
        cell: ({ row }) => (
            <span className="text-xs text-slate-500 truncate max-w-[150px] block" title={row.original.comment || ''}>
                {row.original.comment || '-'}
            </span>
        )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1.5">
            <button
                onClick={() => navigate(`/dashboard/clients/${row.original.id}`)}
                className="px-2 py-1 text-[10px] font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            >
                Détails
            </button>
          {isAdmin && (
            <>
              <button
                onClick={() => handleEdit(row.original)}
                className="px-2 py-1 text-[10px] font-medium rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-200"
              >
                Modifier
              </button>
              <button
                onClick={() => handleDelete(row.original.id)}
                className="px-2 py-1 text-[10px] font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              >
                Supprimer
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const fetchClients = useCallback(async () => {
    if (isAuthLoading || !token) return;
    setIsLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        // Admin: fetch all clients
        const response = await ClientServices.getClients(token, filters);
        setClients(response.clients);
        setTotalCount(response.totalCount);
      } else {
        // User: fetch only assigned clients
        const assignments = await ClientAssignmentServices.getMyClients(token, {
          status: filters.status,
          raisonSociale: filters.raisonSociale,
          num_client: filters.num_client,
        });
        // Transform assignments to clients
        const clientsFromAssignments: Client[] = assignments
          .filter(a => a.client)
          .map(a => a.client as Client);
        setClients(clientsFromAssignments);
        setTotalCount(clientsFromAssignments.length);
      }
    } catch (error) {
      console.error('Échec de la récupération des clients:', error);
      setError('Échec du chargement des clients. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, isAuthLoading, token, isAdmin]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Fetch distinct statuses for the dropdown
  useEffect(() => {
    const fetchStatuses = async () => {
      if (!token) return;
      try {
        const statuses = await ClientServices.getDistinctStatuses(token);
        setStatusOptions(statuses);
      } catch (error) {
        console.error('Error fetching statuses:', error);
      }
    };
    fetchStatuses();
  }, [token]);

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsEditModalOpen(true);
  };

  const handleSaveClient = async (data: Partial<Client>) => {
    if (!selectedClient || !token) return;
    try {
      await ClientServices.updateClient(selectedClient.id, token, data);
      fetchClients();
    } catch (e) {
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
        try {
            await ClientServices.deleteClient(id, token!);
            fetchClients();
        } catch (e) {
            alert("Erreur lors de la suppression");
        }
    }
  };

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  // Import Handlers
  const handleImportFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
  
      // Check file format
      const isCSV = file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv');
      const isXLSX = file.type.includes('spreadsheet') || 
                     file.type.includes('excel') ||
                     file.name.toLowerCase().endsWith('.xlsx') ||
                     file.name.toLowerCase().endsWith('.xls');
  
      if (!isCSV && !isXLSX) {
        setError('Format de fichier invalide. Veuillez importer un fichier CSV ou XLSX.');
        event.target.value = '';
        return;
      }
  
      setSelectedFile(file);
  
      if (isXLSX) {
        // Handle XLSX file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON to get headers
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: '',
              range: 0 // Start from first row
            });
  
            if (jsonData.length === 0) {
              setError('Le fichier XLSX est vide ou ne contient pas de données.');
              setSelectedFile(null);
              event.target.value = '';
              return;
            }
  
            const headers = jsonData[0] as string[];
            
            if (headers && headers.length > 0) {
              // Filter out empty headers and convert to strings
              const validHeaders = headers
                .map(header => String(header).trim())
                .filter(header => header !== '');
              
              if (validHeaders.length === 0) {
                setError('Aucun en-tête valide trouvé dans le fichier XLSX.');
                setSelectedFile(null);
                event.target.value = '';
                return;
              }
  
              setCsvColumns(validHeaders);
              setColumnMapping({});
              setShowMappingModal(true);
            } else {
              setError('Échec de la lecture des en-têtes XLSX. Veuillez vérifier le format du fichier.');
              setSelectedFile(null);
              event.target.value = '';
            }
          } catch (error) {
            console.error('Erreur d\'analyse XLSX:', error);
            setError('Échec de l\'analyse du fichier XLSX. Veuillez vérifier le format du fichier.');
            setSelectedFile(null);
            event.target.value = '';
          }
        };
  
        reader.onerror = () => {
          setError('Erreur lors de la lecture du fichier XLSX.');
          setSelectedFile(null);
          event.target.value = '';
        };
  
        reader.readAsArrayBuffer(file);
        
      } else {
        // Handle CSV file (existing logic)
        Papa.parse(file, {
          preview: 1,
          complete: (result) => {
            const headers = result.data[0] as string[];
            if (headers && headers.length > 0) {
              // Filter out empty headers
              const validHeaders = headers
                .map(header => String(header).trim())
                .filter(header => header !== '');
              
              if (validHeaders.length === 0) {
                setError('Aucun en-tête valide trouvé dans le fichier CSV.');
                setSelectedFile(null);
                event.target.value = '';
                return;
              }
  
              setCsvColumns(validHeaders);
              setColumnMapping({});
              setShowMappingModal(true);
            } else {
              setError('Échec de la lecture des en-têtes CSV. Veuillez vérifier le format du fichier.');
              setSelectedFile(null);
              event.target.value = '';
            }
          },
          error: (error) => {
            console.error('Erreur d\'analyse CSV:', error);
            setError('Échec de l\'analyse du fichier CSV. Veuillez vérifier le format du fichier.');
            setSelectedFile(null);
            event.target.value = '';
          },
        });
      }
  
      event.target.value = ''; // Reset file input
    },
    []
  );

  const handleMappingChange = (dbField: string, csvColumn: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [dbField]: csvColumn || '',
    }));
  };

  const handleConfirmMapping = () => {
    if (!columnMapping || !columnMapping.numTel || !columnMapping.num_client) {
      setError('Les mappages pour Numéro de Téléphone (numTel) et Numéro Client (num_client) sont requis.');
      return;
    }
    setShowMappingModal(false);
    setShowConfirmModal(true);
  };

  const handleCancelMapping = () => {
    setShowMappingModal(false);
    setSelectedFile(null);
    setCsvColumns([]);
    setColumnMapping({});
  };

  const handleConfirmImport = useCallback(async () => {
    if (!selectedFile || !columnMapping) return;

    setIsLoading(true);
    setError(null);
    setImportResult(null);
    setShowConfirmModal(false);
    setImportStatus('uploading');

    const formData = new FormData();
    formData.append('file', selectedFile);
    const mappingToSend = JSON.stringify(columnMapping);
    formData.append('columnMapping', mappingToSend);

    try {
      // Start async import - returns immediately with job ID
      const startResponse = await axios.post(`${ApiUrls.BASE_URL}contact/import-async`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 1 minute timeout just for the upload
      });

      const { jobId } = startResponse.data;
      setImportStatus('processing');

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await axios.get(
            `${ApiUrls.BASE_URL}contact/import-progress/${jobId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const progress = progressResponse.data;

          if (progress.status === 'completed') {
            clearInterval(pollInterval);
            setImportStatus('completed');
            setImportResult({
              totalRecords: progress.totalRecords,
              successfulImports: progress.successfulImports,
              failedImports: progress.failedImports,
              duplicatePhoneNumbers: progress.duplicatePhoneNumbers,
              failedDueToMissingNumClient: progress.failedDueToMissingNumClient,
              failedDueToDuplicateNumClient: progress.failedDueToDuplicateNumClient,
              failedDueToInvalidPhone: progress.failedDueToInvalidPhone,
              failedDueToInvalidEmail: progress.failedDueToInvalidEmail,
              failedDueToDuplicateEmail: progress.failedDueToDuplicateEmail,
              failedDueToOtherErrors: progress.failedDueToOtherErrors,
              otherErrorsDetails: progress.otherErrorsDetails,
            });
            setIsLoading(false);
            setFilters({ page: 1, limit: Math.max(filters.limit, 100) });
            await fetchClients();
          } else if (progress.status === 'failed') {
            clearInterval(pollInterval);
            setImportStatus('failed');
            setError(progress.errorMessage || 'L\'importation a échoué');
            setIsLoading(false);
          }
          // If still processing, continue polling
        } catch (pollError) {
          console.error('Error polling progress:', pollError);
          // Don't stop polling on transient errors
        }
      }, 2000); // Poll every 2 seconds

      // Stop polling after 30 minutes max
      setTimeout(() => {
        clearInterval(pollInterval);
        if (importStatus === 'processing') {
          setError('L\'importation a pris trop de temps. Veuillez vérifier les résultats plus tard.');
          setIsLoading(false);
        }
      }, 30 * 60 * 1000);

    } catch (error: any) {
      console.error('Échec de l\'importation CSV:', error);
      setImportStatus('failed');
      setError(
        error.response?.data?.message ||
        'Échec de l\'importation du fichier CSV. Veuillez vérifier le format du fichier et le mappage.'
      );
      setIsLoading(false);
    } finally {
      setSelectedFile(null);
      setColumnMapping({});
      setCsvColumns([]);
    }
  }, [selectedFile, columnMapping, token, fetchClients, filters.limit, importStatus]);

  const handleCancelImport = useCallback(() => {
    setShowConfirmModal(false);
    setSelectedFile(null);
    setCsvColumns([]);
    setColumnMapping({});
  }, []);

  return (
    <div className="w-full py-2">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold text-slate-800">Clients</h1>
        <div className="flex gap-2 items-center">
          {/* Invoice Filter Dropdown - Admin only */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="invoice-filter" className="text-xs font-medium text-slate-600">
                Factures:
              </label>
              <select
                id="invoice-filter"
                value={filters.hasInvoices || 'with'}
                onChange={(e) => {
                  const value = e.target.value as 'with' | 'without' | 'all';
                  setFilters(prev => ({ ...prev, hasInvoices: value, page: 1 }));
                }}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="all">Tous</option>
                <option value="with">Avec</option>
                <option value="without">Sans</option>
              </select>
            </div>
          )}
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => document.getElementById('csv-upload')?.click()}
                disabled={isLoading}
                className="text-xs px-3 py-1.5"
              >
                {isLoading ? 'Traitement...' : 'Importer'}
              </Button>
              <input
                id="csv-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportFile}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-medium"
          >
            ×
          </button>
        </div>
      )}

      {/* Custom Filters Panel */}
      <div className="mb-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Filter Header - Clickable to toggle */}
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
            {/* Active filter count badge */}
            {(() => {
              const activeCount = [
                filters.status,
                filters.raisonSociale,
                filters.num_client,
                filters.departement,
                filters.code_postal,
                filters.adresse_site,
                filters.montant_ttc_min,
                filters.montant_ttc_max,
                filters.conso_annuelle_min,
                filters.conso_annuelle_max,
              ].filter(Boolean).length;
              return activeCount > 0 ? (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary-500 text-white">
                  {activeCount}
                </span>
              ) : null;
            })()}
          </div>
          <div className="flex items-center gap-2">
            {/* Reset button - prevent event bubbling */}
            <span
              onClick={(e) => {
                e.stopPropagation();
                setFilters({ page: 1, limit: filters.limit, hasInvoices: 'with' });
              }}
              className="text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              Réinitialiser
            </span>
            {/* Chevron icon */}
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
          </div>
        </button>
        
        {/* Filters Grid - Collapsible */}
        <div className={`transition-all duration-200 ease-in-out overflow-hidden ${isFiltersOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Statut
                </label>
                <select
                  id="status-filter"
                  value={filters.status || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined, page: 1 }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
                >
                  <option value="">Tous</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Raison Sociale Filter */}
              <div>
                <label htmlFor="raison-sociale-filter" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Raison Sociale
                </label>
                <input
                  id="raison-sociale-filter"
                  type="text"
                  placeholder="Rechercher..."
                  value={filters.raisonSociale || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, raisonSociale: e.target.value || undefined, page: 1 }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
              </div>

              {/* Numéro Client Filter */}
              <div>
                <label htmlFor="num-client-filter" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  N° Client
                </label>
                <input
                  id="num-client-filter"
                  type="text"
                  placeholder="Rechercher..."
                  value={filters.num_client || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, num_client: e.target.value || undefined, page: 1 }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
              </div>

              {/* Département Filter */}
              <div>
                <label htmlFor="departement-filter" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Département
                </label>
                <select
                  id="departement-filter"
                  value={filters.departement || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, departement: e.target.value || undefined, page: 1 }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
                >
                  <option value="">Tous</option>
                  {Array.from({ length: 95 }, (_, i) => {
                    const dept = String(i + 1).padStart(2, '0');
                    return <option key={dept} value={dept}>{dept}</option>;
                  })}
                  <option value="2A">2A</option>
                  <option value="2B">2B</option>
                  {Array.from({ length: 5 }, (_, i) => {
                    const dept = String(971 + i);
                    return <option key={dept} value={dept}>{dept}</option>;
                  })}
                </select>
              </div>

              {/* Code Postal Filter */}
              <div>
                <label htmlFor="code-postal-filter" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Code Postal
                </label>
                <input
                  id="code-postal-filter"
                  type="text"
                  placeholder="75001"
                  value={filters.code_postal || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, code_postal: e.target.value || undefined, page: 1 }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
              </div>

              {/* Adresse du Site Filter */}
              <div>
                <label htmlFor="adresse-site-filter" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Adresse
                </label>
                <input
                  id="adresse-site-filter"
                  type="text"
                  placeholder="Rechercher..."
                  value={filters.adresse_site || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, adresse_site: e.target.value || undefined, page: 1 }))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
              </div>

              {/* Montant TTC Min/Max */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Montant (€)
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.montant_ttc_min ?? ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, montant_ttc_min: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.montant_ttc_max ?? ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, montant_ttc_max: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>

              {/* Consommation Annuelle Min/Max */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Conso (kWh)
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.conso_annuelle_min ?? ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, conso_annuelle_min: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.conso_annuelle_max ?? ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, conso_annuelle_max: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
                    className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Processing Indicator */}
      {importStatus === 'processing' && (
        <div className="mb-8 card-premium overflow-hidden animate-fade-in">
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500 animate-pulse"></div>
            <div className="p-8 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-6"></div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Importation en cours...</h2>
              <p className="text-slate-500 text-center max-w-md">
                Votre fichier est en cours de traitement. Cette opération peut prendre plusieurs minutes pour les fichiers volumineux.
              </p>
              <p className="text-sm text-blue-600 mt-4 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                Ne fermez pas cette page
              </p>
            </div>
          </div>
        </div>
      )}

      {importResult && (
        <div className="mb-8 card-premium overflow-hidden animate-fade-in">
          {/* Header with gradient accent */}
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500"></div>
            <div className="p-6 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Résultats de l'importation</h2>
                    <p className="text-sm text-slate-500">Fichier CSV/XLSX traité avec succès</p>
                  </div>
                </div>
                <button
                  onClick={() => setImportResult(null)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Total Records */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-blue-700">Total traité</span>
                </div>
                <p className="text-3xl font-extrabold text-blue-900">{importResult.totalRecords}</p>
                <p className="text-xs text-blue-600 mt-1">enregistrements</p>
              </div>

              {/* Successful */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-emerald-700">Réussies</span>
                </div>
                <p className="text-3xl font-extrabold text-emerald-900">{importResult.successfulImports}</p>
                <p className="text-xs text-emerald-600 mt-1">importations</p>
              </div>

              {/* Failed */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-rose-500 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-rose-700">Échouées</span>
                </div>
                <p className="text-3xl font-extrabold text-rose-900">{importResult.failedImports}</p>
                <p className="text-xs text-rose-600 mt-1">erreurs</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6 p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">Taux de réussite</span>
                <span className="text-lg font-bold text-emerald-600">
                  {importResult.totalRecords > 0
                    ? `${((importResult.successfulImports / importResult.totalRecords) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${
                      importResult.totalRecords > 0
                        ? (importResult.successfulImports / importResult.totalRecords) * 100
                        : 0
                    }%`
                  }}
                ></div>
              </div>
            </div>

            {/* Failure Details */}
            {importResult.failedImports > 0 && (
              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100">
                <h3 className="text-sm font-bold text-amber-800 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                  </svg>
                  Détails des échecs
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {importResult.duplicatePhoneNumbers > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-amber-200">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{importResult.duplicatePhoneNumbers}</span>
                      <span className="text-slate-600">Tél. en double</span>
                    </div>
                  )}
                  {importResult.failedDueToMissingNumClient > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-amber-200">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{importResult.failedDueToMissingNumClient}</span>
                      <span className="text-slate-600">N° client manquant</span>
                    </div>
                  )}
                  {importResult.failedDueToDuplicateNumClient > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-amber-200">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{importResult.failedDueToDuplicateNumClient}</span>
                      <span className="text-slate-600">N° client en double</span>
                    </div>
                  )}
                  {importResult.failedDueToInvalidPhone > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-amber-200">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{importResult.failedDueToInvalidPhone}</span>
                      <span className="text-slate-600">Tél. invalide</span>
                    </div>
                  )}
                  {importResult.failedDueToInvalidEmail > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-amber-200">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{importResult.failedDueToInvalidEmail}</span>
                      <span className="text-slate-600">Email invalide</span>
                    </div>
                  )}
                  {importResult.failedDueToDuplicateEmail > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-amber-200">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{importResult.failedDueToDuplicateEmail}</span>
                      <span className="text-slate-600">Email en double</span>
                    </div>
                  )}


                  {importResult.failedDueToOtherErrors > 0 && (
                    <div className="flex flex-col gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-amber-200 col-span-full">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{importResult.failedDueToOtherErrors}</span>
                        <span className="text-slate-600">Autres erreurs</span>
                      </div>
                      {importResult.otherErrorsDetails && importResult.otherErrorsDetails.length > 0 && (
                        <ul className="list-disc pl-8 text-xs text-slate-500 mt-1 space-y-1">
                          {importResult.otherErrorsDetails.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={clients}
        onPaginationChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageCount={Math.ceil(totalCount / (filters.limit || 10))}
        currentPage={filters.page || 1}
        pageSize={filters.limit || 10}
        isLoading={isLoading}
        hideFilters={true}
      />

      <EditClientModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedClient(null);
        }}
        onSave={handleSaveClient}
        client={selectedClient}
      />

      {showMappingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Mapper les champs de la base de données aux colonnes CSV</h2>
            <p className="mb-4 text-gray-600">Sélectionnez une colonne CSV pour chaque champ de la base de données. Le numéro de téléphone et le numéro de client sont requis.</p>
            {dbFields.map((field) => (
              <div key={field.value} className="mb-3 flex items-center">
                <label className="w-1/2 text-sm font-medium text-gray-700">
                  {field.label}{field.required && <span className="text-red-500">*</span>}
                </label>
                <select
                  className="w-1/2 p-2 border rounded-md"
                  value={columnMapping[field.value] || ''}
                  onChange={(e) => handleMappingChange(field.value, e.target.value)}
                >
                  <option value="">Aucun</option>
                  {csvColumns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={handleCancelMapping}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmMapping}
                disabled={isLoading}
              >
                Continuer
              </Button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Confirmer l'importation CSV</h2>
            <p className="mb-6">
              Êtes-vous sûr de vouloir importer le fichier "{selectedFile?.name || 'inconnu'}" ?
              Cela traitera les contacts en utilisant les mappages de colonnes sélectionnés.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancelImport}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isLoading}
              >
                {isLoading ? 'Téléchargement...' : 'Importer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
