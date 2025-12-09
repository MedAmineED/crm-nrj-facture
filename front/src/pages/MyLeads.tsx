import { useState, useCallback, useEffect } from 'react';
import type { ColumnFiltersState, ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/ui/Table';
import type { Invoice, InvoiceUpload, UpdateFactureDto } from '@/entities/Invoice';
import Button from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import InvoiceServices from '@/API/InvoiceServices';
import ApiUrls from '@/API/Urls';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAuth } from '@/hooks/useAuth';
import PDFModal from '@/components/PDFModal';

type Column = ColumnDef<Invoice> & {
  filterType?: 'text' | 'number' | 'dateRange' | 'select';
  filterOptions?: string[];
  enableColumnFilter?: boolean;
};

interface FilterState {
  type_facture?: string;
  montant_ttc?: string;
  montant_ttc_min?: number;
  montant_ttc_max?: number;
  num_client?: string;
  siret?: string;
  code_naf?: string;
  code_postal?: string;
  echeance_start?: string;
  echeance_end?: string;
  creation_date_start?: string;
  creation_date_end?: string;
  pdl?: string;
  conso_annuelle?: string;
  prix_unitaire_min?: number;
  prix_unitaire_max?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface ModalProps {
  isOpen: boolean;
  token: string;
  onClose: () => void;
  onFilesSelected: (files: File[]) => void;
}

interface EditModalProps {
  isOpen: boolean;
  token: string | null;
  onClose: () => void;
  invoice: Invoice | null;
  onUpdate: () => void;
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const Modal = ({ isOpen, token, onClose, onFilesSelected }: ModalProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files).filter(file => file.type === 'application/pdf') : [];
    setSelectedFiles(files);
    setUploadProgress(0);
    setError(null);
  };

  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const uploadBatch = async (batch: File[], batchIndex: number, totalBatches: number) => {
    const pdfInvoice: InvoiceUpload = { files: batch };
    try {
      const result = await InvoiceServices.UploadInvoices(ApiUrls.UPLOAD_INV, token, pdfInvoice);
      setUploadProgress((batchIndex / totalBatches) * 100);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      throw new Error(`Lot ${batchIndex + 1} échoué : ${errorMessage}`);
    }
  };

  const handleSave = useCallback(async () => {
    if (selectedFiles.length === 0) {
      setError('Aucun fichier PDF sélectionné');
      return;
    }

    setIsUploading(true);
    setError(null);

    const BATCH_SIZE = 50;
    const MAX_CONCURRENT = 3;
    const batches = chunkArray(selectedFiles, BATCH_SIZE);

    try {
      for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
        const batchGroup = batches.slice(i, i + MAX_CONCURRENT);
        await Promise.all(batchGroup.map((batch, index) =>
          uploadBatch(batch, i + index, batches.length)
        ));
      }
      setUploadProgress(100);
      onFilesSelected(selectedFiles);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, onFilesSelected]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Importer des fichiers PDF</h2>
        <input
          type="file"
          multiple
          accept="application/pdf"
          onChange={handleFileChange}
          className="mb-4 w-full"
          disabled={isUploading}
        />
        {selectedFiles.length > 0 && (
          <div className="mb-4">
            <p>Sélectionnés : {selectedFiles.length} fichiers PDF</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{Math.round(uploadProgress)}% Téléchargés</p>
          </div>
        )}
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? 'Téléchargement...' : 'Enregistrer PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const EditModal = ({ isOpen, onClose, invoice, onUpdate, token }: EditModalProps) => {
  const [formData, setFormData] = useState<UpdateFactureDto>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setFormData({
        type_facture: invoice.type_facture,
        montant_ttc: invoice.montant_ttc,
        num_client: invoice.num_client,
        siret: invoice.siret,
        code_naf: invoice.code_naf,
        adresse_site: invoice.adresse_site,
        code_postal: invoice.code_postal,
        echeance: invoice.echeance,
        pdl: invoice.pdl,
        conso_annuelle: invoice.conso_annuelle,
        prix_unitaire: invoice.prix_unitaire,
      });
    }
  }, [invoice]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'montant_ttc' || name === 'prix_unitaire' ? Number(value) : value,
    }));
  };

  const handleSubmit = async () => {
    if (!invoice) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await InvoiceServices.UpdateInvoice(ApiUrls.UPDATE_INV(invoice.id), token, formData);
      onUpdate();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Modifier la Facture</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Type</label>
            <input
              type="text"
              name="type_facture"
              value={formData.type_facture || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Montant TTC</label>
            <input
              type="number"
              name="montant_ttc"
              value={formData.montant_ttc || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Numéro Client</label>
            <input
              type="text"
              name="num_client"
              value={formData.num_client || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">SIRET</label>
            <input
              type="text"
              name="siret"
              value={formData.siret || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Code NAF</label>
            <input
              type="text"
              name="code_naf"
              value={formData.code_naf || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Adresse du Site</label>
            <input
              type="text"
              name="adresse_site"
              value={formData.adresse_site || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Code Postal</label>
            <input
              type="text"
              name="code_postal"
              value={formData.code_postal || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Échéance</label>
            <input
              type="date"
              name="echeance"
              value={formData.echeance ? new Date(formData.echeance).toISOString().split('T')[0] : ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">PDL/PCE</label>
            <input
              type="text"
              name="pdl"
              value={formData.pdl || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Consommation Annuelle</label>
            <input
              type="text"
              name="conso_annuelle"
              value={formData.conso_annuelle || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Prix Unitaire</label>
            <input
              type="number"
              name="prix_unitaire"
              value={formData.prix_unitaire || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const DeleteModal = ({ isOpen, onClose, onConfirm, isDeleting }: DeleteModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Confirmer la suppression</h2>
        <p className="mb-4">Voulez-vous vraiment supprimer cette facture ? Cette action est irréversible.</p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function MyLeads() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    page: 1,
    limit: 10,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceIdToDelete, setInvoiceIdToDelete] = useState<number | null>(null);
  const { isAdmin, isLoading: isAuthLoading, token } = useAuth();

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState(false);
  

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiFilters = {
        ...filters,
        montant_ttc_min: filters.montant_ttc_min !== undefined ? Number(filters.montant_ttc_min) : undefined,
        montant_ttc_max: filters.montant_ttc_max !== undefined ? Number(filters.montant_ttc_max) : undefined,
        prix_unitaire_min: filters.prix_unitaire_min !== undefined ? Number(filters.prix_unitaire_min) : undefined,
        prix_unitaire_max: filters.prix_unitaire_max !== undefined ? Number(filters.prix_unitaire_max) : undefined,
      };

      console.log('Fetching invoices with filters:', apiFilters);
      const response = await InvoiceServices.GetInvoicesList(ApiUrls.GET_INVS, token, apiFilters);
      console.log('Response received:', { total: response.total, count: response.data.length });
      setInvoices(response.data);
      setTotalCount(response.total);
    } catch (error) {
      console.error('Erreur lors de la récupération des factures :', error);
      setError('Échec du chargement des factures. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, token]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setFilters(prev => ({ ...prev, limit: size, page: 1 }));
  }, []);

  const handleFilterChange = useCallback((columnFilters: ColumnFiltersState) => {
    const newFilters: FilterState = {
      ...filters,
      page: 1,
    };

    Object.keys(newFilters).forEach(key => {
      if (key !== 'page' && key !== 'limit' && key !== 'sortBy' && key !== 'sortOrder') {
        delete newFilters[key as keyof FilterState];
      }
    });

    columnFilters.forEach(filter => {
      const { id, value } = filter;

      if (value === undefined || value === '' || value === null) return;

      switch (id) {
        case 'echeance':
          if (Array.isArray(value)) {
            const [start, end] = value;
            if (start) newFilters.echeance_start = new Date(start).toISOString();
            if (end) newFilters.echeance_end = new Date(end).toISOString();
          }
          break;

        case 'montant_ttc':
          if (Array.isArray(value)) {
            const [min, max] = value;
            if (min !== undefined) newFilters[`${id}_min` as keyof FilterState] = Number(min);
            if (max !== undefined) newFilters[`${id}_max` as keyof FilterState] = Number(max);
          } else if (value !== undefined) {
            newFilters[id as keyof FilterState] = String(value);
          }
          break;
        case 'prix_unitaire':
          if (Array.isArray(value)) {
            const [min, max] = value;
            if (min !== undefined) newFilters[`${id}_min` as keyof FilterState] = Number(min);
            if (max !== undefined) newFilters[`${id}_max` as keyof FilterState] = Number(max);
          } else if (value !== undefined) {
            newFilters[id as keyof FilterState] = String(value);
          }
          break;

        default:
          newFilters[id as keyof FilterState] = String(value);
          break;
      }
    });

    setFilters(newFilters);
  }, [filters]);

  const handleEdit = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setEditModalIsOpen(true);
  }, []);

  const handleDelete = useCallback((id: number) => {
    setInvoiceIdToDelete(id);
    setDeleteModalIsOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (invoiceIdToDelete === null) return;
    setIsLoading(true);
    setError(null);
    try {
      await InvoiceServices.DeleteInvoice(ApiUrls.UPDATE_INV(invoiceIdToDelete)+ "/pdf", token);
      setDeleteModalIsOpen(false);
      setInvoiceIdToDelete(null);
      fetchInvoices();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Échec de la suppression de la facture. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceIdToDelete, fetchInvoices]);

  const handleUpdate = useCallback(() => {
    setEditModalIsOpen(false);
    setSelectedInvoice(null);
    fetchInvoices();
  }, [fetchInvoices]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setIsModalOpen(false);
    fetchInvoices();
  }, [fetchInvoices]);

      // Updated function to fetch PDF for a specific invoice
    const handleShowPDF = async (invoice: Invoice) => {
      setLoadingPdf(true);
      try {
        // Get the blob URL from the service
        const pdfBlobUrl = await InvoiceServices.getPdfFile(invoice.id, token);
        setPdfUrl(pdfBlobUrl);
        setPdfModalOpen(true);
      } catch (error) {
        console.error('Error fetching PDF:', error);
        setError('Failed to load PDF. Please try again.');
      } finally {
        setLoadingPdf(false);
      }
    };

  const defaultText = (id: keyof Invoice, header: string): Column => ({
    accessorKey: id,
    header,
    filterType: 'text',
    enableColumnFilter: true,
  });

  const columns: Column[] = [
    {
      accessorKey: 'type_facture',
      header: 'Type',
      filterType: 'text',
      enableColumnFilter: true,
    },
    {
      accessorKey: 'montant_ttc',
      header: 'Montant TTC',
      cell: ({ getValue }) => formatCurrency(parseFloat(getValue<string>() || '0')),
      filterType: 'number',
      enableColumnFilter: true,
    },
    defaultText('num_client', 'Numéro Client'),
    defaultText('siret', 'SIRET'),
    defaultText('code_naf', 'Code NAF'),
    defaultText('adresse_site', 'Adresse du Site'),
    defaultText('code_postal', 'Code Postal'),
    {
      accessorKey: 'echeance',
      header: 'Échéance',
      cell: ({ getValue }) => formatDate(getValue<string>()),
      filterType: 'dateRange',
      enableColumnFilter: true,
    },
    defaultText('pdl', 'PDL/PCE'),
    defaultText('conso_annuelle', 'Consommation Annuelle'),
    {
      accessorKey: 'prix_unitaire',
      header: 'Prix Unitaire',
      cell: ({ getValue }) => formatCurrency(getValue<number>()),
      filterType: 'number',
      enableColumnFilter: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShowPDF(row.original)}
            disabled={loadingPdf}
          >
            {loadingPdf ? 'Loading...' : 'PDF'}
          </Button>
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
        </div>
      ),
    },
  ];

  const handleClosePDFModal = () => {
    setPdfModalOpen(false);
    // Clean up the blob URL to prevent memory leaks
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
    }
  };

  const downloadZipWithDataAndPdfs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const zip = new JSZip();

      const headers = columns
        .filter(column => column.id !== 'actions')
        .map(column => ({
          key: column.accessorKey as string,
          label: String(column.header),
        }));

      const csvContent = `${headers.map(header => `"${header.label}"`).join(',')}\n${
        invoices.map((invoice: any) =>
          headers.map(header => {
            const value = invoice[header.key];
            if (value === undefined || value === null) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        ).join('\n')
      }`;

      zip.file('factures.csv', csvContent);

      const invoicesWithPdfs = invoices.filter(invoice => invoice.pdf_path);

      if (invoicesWithPdfs.length > 0) {
        const pdfFolder = zip.folder('pdfs');
        if (!pdfFolder) throw new Error('Impossible de créer le dossier PDF dans le ZIP');

        let successfulPdfs = 0;
        const pdfPromises = invoicesWithPdfs.map(async (invoice) => {
          try {
            const response = await fetch(ApiUrls.BASE_URL + `api/${invoice.id}/pdf`, {
              headers: {
                'Accept': 'application/pdf',
                Authorization: `Bearer ${token}`
              },
            });

            if (!response.ok) throw new Error('Échec de la récupération du PDF');

            const blob = await response.blob();
            const filename = invoice.original_filename ||
                             `facture_${invoice.id}_${invoice.num_client || 'inconnu'}.pdf`;

            pdfFolder.file(filename, blob);
            successfulPdfs++;
          } catch (error) {
            console.error(`Erreur lors de la récupération du PDF pour la facture ${invoice.id} :`, error);
          }
        });

        await Promise.all(pdfPromises);

        if (successfulPdfs < invoicesWithPdfs.length) {
          zip.file('_notes.txt',
            `Note : ${invoicesWithPdfs.length - successfulPdfs} PDF(s) n'ont pas pu être téléchargés.`);
        }
      } else {
        zip.file('_notes.txt', 'Note : Aucune des factures sélectionnées n\'a de fichiers PDF attachés.');
      }

      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      saveAs(content, `factures_${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (error) {
      console.error('Erreur lors de la création du fichier ZIP :', error);
      setError('Échec de la création du paquet de téléchargement. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [invoices]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mes Leads</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={downloadZipWithDataAndPdfs}
            disabled={isLoading || invoices.length === 0}
          >
            {isLoading ? 'Préparation du téléchargement...' : 'Télécharger ZIP'}
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
          >
            Import PDF
          </Button>
        </div>
      </div>
      
      {/* Sorting Section */}
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
          Trier par Montant TTC:
        </label>
        <select
          id="sort-select"
          value={filters.sortBy === 'montant_ttc' ? filters.sortOrder || 'DESC' : ''}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '') {
              // Remove sorting
              setFilters(prev => {
                const newFilters = { ...prev };
                delete newFilters.sortBy;
                delete newFilters.sortOrder;
                return { ...newFilters, page: 1 };
              });
            } else {
              setFilters(prev => ({ 
                ...prev, 
                sortBy: 'montant_ttc', 
                sortOrder: value as 'ASC' | 'DESC',
                page: 1 
              }));
            }
          }}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Sans tri</option>
          <option value="DESC">Du plus élevé au plus bas</option>
          <option value="ASC">Du plus bas au plus élevé</option>
        </select>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      <DataTable
        columns={columns}
        data={invoices}
        onPaginationChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onFilterChange={handleFilterChange}
        pageCount={Math.ceil(totalCount / (filters.limit || 10))}
        currentPage={filters.page || 1}
        pageSize={filters.limit || 10}
        isLoading={isLoading}
      />
      {token && <Modal
        isOpen={isModalOpen}
        token={token}
        onClose={() => setIsModalOpen(false)}
        onFilesSelected={handleFilesSelected}
      />}
     {token && <EditModal
        isOpen={editModalIsOpen}
        onClose={() => {
          setEditModalIsOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onUpdate={handleUpdate}
        token={token}
      />}
      <DeleteModal
        isOpen={deleteModalIsOpen}
        onClose={() => {
          setDeleteModalIsOpen(false);
          setInvoiceIdToDelete(null);
        }}
        onConfirm={confirmDelete}
        isDeleting={isLoading}
      />
      <PDFModal isOpen={pdfModalOpen} pdfUrl={pdfUrl} onClose={handleClosePDFModal} />
    </div>
  );
}