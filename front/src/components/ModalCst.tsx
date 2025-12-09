import { useCallback, useEffect, useState } from 'react';
import Button from './ui/Button';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import type { Invoice } from '@/entities/Invoice';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from './ui/Table';
import InvoiceServices from '@/API/InvoiceServices';
import ApiUrls from '@/API/Urls';
import PDFModal from './PDFModal';

interface ModalCstProps {
  isOpen: boolean;
  numClient: string;
    token: string;
  onClose: () => void;
  onFilesSelected: (files: File[]) => void;
}

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

const defaultText = (id: keyof Invoice, header: string): Column => ({
  accessorKey: id,
  header,
  filterType: 'text',
  enableColumnFilter: true,
});

const ModalCst: React.FC<ModalCstProps> = ({ numClient, token, isOpen, onClose }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    page: 1,
    limit: 10,
  });
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState(false);

  const fetchInvoices = async () => {
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

      console.log(numClient, token, apiFilters);
      const response = await InvoiceServices.GetInvoicesByClient(ApiUrls.BASE_URL, numClient, token, apiFilters);
      setInvoices(response.data);
      setTotalCount(response.total);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    if (isOpen) {
      console.log(token);
      fetchInvoices();
    }
  }, [numClient, filters, isOpen]);

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

  const handleClose = () => {
    onClose();
  };

  const handleClosePDFModal = () => {
    setPdfModalOpen(false);
    // Clean up the blob URL to prevent memory leaks
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
    }
  };

  const columns: Column[] = [
    {
      accessorKey: 'type_facture',
      header: 'Type',
      filterType: 'text',
      enableColumnFilter: true,
    },
    defaultText('num_client', 'Numéro Client'),
    defaultText('siret', 'SIRET'),
    defaultText('code_naf', 'Code NAF'),
    defaultText('adresse_site', 'Adresse Site'),
    defaultText('code_postal', 'Code Postal'),
    {
      accessorKey: 'echeance',
      header: 'Échéance',
      cell: ({ getValue }) => formatDate(getValue<string>()),
      filterType: 'dateRange',
      enableColumnFilter: true,
    },
    defaultText('pdl', 'PDL/PCE'),
    defaultText('conso_annuelle', 'Conso. Annuelle'),
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
        </div>
      ),
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[80%] rounded-lg p-6 w-full max-w-[1500px]">
        <h2 className="text-xl font-semibold mb-4">Factures for {numClient}</h2>
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
          isModal={true}
        />
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
        <PDFModal isOpen={pdfModalOpen} pdfUrl={pdfUrl} onClose={handleClosePDFModal} />
      </div>
    </div>
  );
};

export default ModalCst;