import Button from '@/components/ui/Button';
import { DataTable } from '@/components/ui/Table';
import type { ColumnDef } from '@tanstack/react-table';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ClientServices, { type Client } from '@/API/ClientServices';
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
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ page: 1, limit: 10, hasInvoices: 'with' });
  const { isAdmin, isLoading: isAuthLoading, token } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Import State
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

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
    filterType: 'text',
    enableColumnFilter: true,
  });

  const navigate = useNavigate();

  const columns: Column[] = [
    {
        accessorKey: 'num_client',
        header: 'Numéro Client',
        cell: ({ row }) => (
            <span 
                className="text-blue-600 hover:underline cursor-pointer"
                onClick={() => navigate(`/dashboard/clients/${row.original.id}`)}
            >
                {row.original.num_client}
            </span>
        )
    },
    defaultText('raisonSociale', 'Raison Sociale'),
    defaultText('profile', 'Profil'),
    defaultText('status', 'Statut'),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/clients/${row.original.id}`)}
            >
                Détails
            </Button>
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(row.original)}
              >
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(row.original.id)}
              >
                Supprimer
              </Button>
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
      const response = await ClientServices.getClients(token, filters);
      setClients(response.clients);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error('Échec de la récupération des clients:', error);
      setError('Échec du chargement des clients. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, isAuthLoading, token]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

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

  const handleFilterChange = useCallback((newFilters: Array<{ id: string; value: any }>) => {
    // If no filters, reset to default state (preserving page and limit)
    if (!newFilters || newFilters.length === 0) {
      setFilters(prev => ({ 
        page: prev.page, 
        limit: prev.limit,
        hasInvoices: prev.hasInvoices // Preserve invoice filter
      }));
      return;
    }

    const cleanedFilters = newFilters.reduce((acc, filter) => {
      if (filter.value !== '' && filter.value != null) {
        // Special handling for global search
        if (filter.id === 'global') {
            acc['search'] = filter.value;
        } else {
            acc[filter.id] = filter.value;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    setFilters(prev => ({ 
        ...prev, // Keep existing filters like hasInvoices
        ...cleanedFilters, 
        page: 1 // Reset to first page on filter change
    }));
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

    const formData = new FormData();
    formData.append('file', selectedFile);
    const mappingToSend = JSON.stringify(columnMapping);
    formData.append('columnMapping', mappingToSend);

    try {
      const response = await axios.post(`${ApiUrls.BASE_URL}contact/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: (60000 * 5), // Délai de 30s pour les imports volumineux
      });
      setImportResult(response.data);
      // Réinitialiser les filtres pour s'assurer que les nouveaux clients sont récupérés
      setFilters({ page: 1, limit: Math.max(filters.limit, 100) });
      await fetchClients();
    } catch (error: any) {
      console.error('Échec de l\'importation CSV:', error);
      console.error('Réponse d\'erreur:', error.response?.data);
      setError(
        error.response?.data?.message ||
        'Échec de l\'importation du fichier CSV. Veuillez vérifier le format du fichier et le mappage.'
      );
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
      setColumnMapping({});
      setCsvColumns([]);
    }
  }, [selectedFile, columnMapping, token, fetchClients, filters.limit]);

  const handleCancelImport = useCallback(() => {
    setShowConfirmModal(false);
    setSelectedFile(null);
    setCsvColumns([]);
    setColumnMapping({});
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des Clients</h1>
        <div className="flex gap-2 items-center">
          {/* Invoice Filter Dropdown */}
          <div className="flex items-center gap-2 mr-4">
            <label htmlFor="invoice-filter" className="text-sm font-medium text-gray-700">
              Factures:
            </label>
            <select
              id="invoice-filter"
              value={filters.hasInvoices || 'with'}
              onChange={(e) => {
                const value = e.target.value;
                setFilters(prev => ({ ...prev, hasInvoices: value, page: 1 }));
              }}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">Tous</option>
              <option value="with">Avec factures</option>
              <option value="without">Sans factures</option>
            </select>
          </div>
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => document.getElementById('csv-upload')?.click()}
                disabled={isLoading}
              >
                {isLoading ? 'Traitement...' : 'Importer CSV'}
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
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <Button
            variant="outline"
            size="sm"
            className="mt-2 ml-4"
            onClick={() => setError(null)}
          >
            Fermer
          </Button>
        </div>
      )}

      {importResult && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Résultats de l'importation CSV</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportResult(null)}
            >
              Fermer
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-blue-700">Total des enregistrements traités</p>
              <p className="text-2xl font-bold text-blue-900">{importResult.totalRecords}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-md">
              <p className="text-sm font-medium text-green-700">Importations réussies</p>
              <p className="text-2xl font-bold text-green-900">{importResult.successfulImports}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-md">
              <p className="text-sm font-medium text-red-700">Importations échouées</p>
              <p className="text-2xl font-bold text-red-900">{importResult.failedImports}</p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600">Taux de réussite</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-green-600 h-2.5 rounded-full"
                style={{
                  width: `${
                    importResult.totalRecords > 0
                      ? (importResult.successfulImports / importResult.totalRecords) * 100
                      : 0
                  }%`
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {importResult.totalRecords > 0
                ? `${((importResult.successfulImports / importResult.totalRecords) * 100).toFixed(1)}%`
                : '0%'} d'enregistrements importés avec succès
            </p>
          </div>
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Détails des échecs</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>Numéros de téléphone en double: {importResult.duplicatePhoneNumbers}</li>
              <li>Numéros de client manquants: {importResult.failedDueToMissingNumClient}</li>
              <li>Numéros de client en double: {importResult.failedDueToDuplicateNumClient}</li>
              <li>Numéros de téléphone manquants: {importResult.failedDueToInvalidPhone}</li>
              <li>Emails invalides: {importResult.failedDueToInvalidEmail}</li>
              <li>Emails en double: {importResult.failedDueToDuplicateEmail}</li>
              <li>Autres erreurs: {importResult.failedDueToOtherErrors}</li>
            </ul>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={clients}
        onPaginationChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onFilterChange={handleFilterChange}
        pageCount={Math.ceil(totalCount / (filters.limit || 10))}
        currentPage={filters.page || 1}
        pageSize={filters.limit || 10}
        isLoading={isLoading}
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
