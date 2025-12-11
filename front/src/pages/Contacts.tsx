import Button from '@/components/ui/Button';
import { DataTable } from '@/components/ui/Table';
import type { Contact } from '@/entities/Contact';
import type { Invoice } from '@/entities/Invoice';
import type { ColumnDef } from '@tanstack/react-table';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ApiUrls from '@/API/Urls';
import ModalCst from '@/components/ModalCst';
import { useAuth } from '@/hooks/useAuth';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import InvoiceServices from '@/API/InvoiceServices';
import { formatCurrency, formatDate } from '@/lib/utils';


type Column = ColumnDef<Contact> & {
  filterType?: 'text' | 'number' | 'dateRange' | 'select';
  filterOptions?: string[];
  enableColumnFilter?: boolean;
};

interface FilterState {
  page: number;
  limit: number;
  [key: string]: any;
}



const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [modalTableIsOpen, setModalTableIsOpen] = useState(false);
  const [selectedNumClient, setSelectedNumClient] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ page: 1, limit: 10, hasInvoices: 'with' });
  const { isAdmin, isLoading: isAuthLoading, token } = useAuth();

  const defaultText = (id: keyof Contact, header: string): Column => ({
    accessorKey: id,
    header,
    filterType: 'text',
    enableColumnFilter: true,
  });

  const columns: Column[] = [
    defaultText('num_client', 'Numéro Client'),
    defaultText('nom', 'Nom'),
    defaultText('prenom', 'Prénom'),
    defaultText('raisonSociale', 'Raison Sociale'),
    defaultText('fonction', 'Fonction'),
    defaultText('email', 'Email'),
    defaultText('numTel', 'Téléphone'),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1.5">
          <button
            onClick={() => handleFacture(row.original.num_client)}
            className="px-2 py-1 text-[10px] font-medium rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-200"
          >
            Factures
          </button>
        </div>
      ),
    },
  ];

const fetchContacts = useCallback(async () => {
  if (isAuthLoading || isAdmin === null) return;
  setIsLoading(true);
  setError(null);
  try {
    const endpoint = isAdmin ? 'contact/all' : 'contact/me';
    const response = await axios.get(`${ApiUrls.BASE_URL}${endpoint}`, {
      params: { ...filters }, // Use filters.limit directly
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    setContacts(response.data.contacts || response.data || []);
    setTotalCount(response.data.totalCount || response.data.length || 0);
  } catch (error) {
    console.error('Échec de la récupération des contacts:', error);
    setError('Échec du chargement des contacts. Veuillez réessayer.');
  } finally {
    setIsLoading(false);
  }
}, [filters, isAdmin, isAuthLoading, token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleFacture = useCallback((numClient: string) => {
    setSelectedNumClient(numClient);
    setModalTableIsOpen(true);
  }, []);
/*
  const handleEdit = (contact: Contact) => {
    console.log('Modifier le contact:', contact);
  };

  const handleDelete = (id: number) => {
    console.log('Supprimer le contact:', id);
  };
*/
  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  const handleFilterChange = useCallback((newFilters: Array<{ id: string; value: any }>) => {
    if (!newFilters || newFilters.length === 0) {
      setFilters(prev => ({ page: prev.page, limit: prev.limit }));
      return;
    }

    const cleanedFilters = newFilters.reduce((acc, filter) => {
      if (filter.value !== '' && filter.value != null) {
        acc[filter.id] = filter.value;
      }
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(cleanedFilters).length === 0) {
      setFilters(prev => ({ page: prev.page, limit: prev.limit }));
    } else {
      setFilters(prev => ({ ...prev, ...cleanedFilters, page: 1 }));
    }
  }, []);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      setModalTableIsOpen(false);
      fetchContacts();
    },
    [fetchContacts]
  );



  const downloadZipWithDataAndPdfs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const zip = new JSZip();

      const contactHeaders = [
        { key: 'num_client', label: 'Numéro Client' },
        { key: 'nom', label: 'Nom' },
        { key: 'prenom', label: 'Prénom' },
        { key: 'raisonSociale', label: 'Raison Sociale' },
        { key: 'fonction', label: 'Fonction' },
        { key: 'email', label: 'Email' },
        { key: 'numTel', label: 'Téléphone' },
      ];

      const invoiceHeaders = [
        { key: 'type_facture', label: 'Type de Facture' },
        { key: 'siret', label: 'SIRET' },
        { key: 'code_naf', label: 'Code NAF' },
        { key: 'adresse_site', label: 'Adresse du Site' },
        { key: 'code_postal', label: 'Code Postal' },
        { key: 'echeance', label: 'Échéance' },
        { key: 'pdl', label: 'PDL/PCE' },
        { key: 'conso_annuelle', label: 'Consommation Annuelle' },
        { key: 'prix_unitaire', label: 'Prix Unitaire' },
      ];

      const headers = [...contactHeaders, ...invoiceHeaders];

      const contactInvoiceData: Array<{
        contact: Contact;
        invoices: Invoice[];
      }> = [];

      for (const contact of contacts) {
        try {
          const response = await InvoiceServices.GetInvoicesByClient(ApiUrls.BASE_URL, contact.num_client, token, {});
          contactInvoiceData.push({
            contact,
            invoices: response.data || [],
          });
        } catch (error) {
          console.error(`Échec de la récupération des factures pour le contact ${contact.num_client}:`, error);
        }
      }

      const csvRows: string[] = [];
      csvRows.push(headers.map(header => `"${header.label}"`).join(','));

      for (const { contact, invoices } of contactInvoiceData) {
        if (invoices.length === 0) {
          const contactRow = contactHeaders
            .map(header => {
              const value = contact[header.key as keyof Contact];
              return value ? `"${String(value).replace(/"/g, '""')}"` : '""';
            })
            .concat(invoiceHeaders.map(() => '""'))
            .join(',');
          csvRows.push(contactRow);
        } else {
          invoices.forEach((invoice, index) => {
            const row = headers.map(header => {
              if (index === 0 && contactHeaders.some(h => h.key === header.key)) {
                const value = contact[header.key as keyof Contact];
                return value ? `"${String(value).replace(/"/g, '""')}"` : '""';
              } else if (invoiceHeaders.some(h => h.key === header.key)) {
                const value = invoice[header.key as keyof Invoice];
                if (header.key === 'echeance' && value) {
                  return `"${formatDate(value as string)}"`;
                }
                if (header.key === 'prix_unitaire' && value) {
                  return `"${formatCurrency(value as number)}"`;
                }
                return value ? `"${String(value).replace(/"/g, '""')}"` : '""';
              }
              return '""';
            }).join(',');
            csvRows.push(row);
          });
        }
      }

      const csvContent = csvRows.join('\n');
      zip.file('contacts_factures.csv', csvContent);

      const allInvoices = contactInvoiceData.flatMap(data => data.invoices);
      const invoicesWithPdfs = allInvoices.filter(invoice => invoice.id);

      if (invoicesWithPdfs.length > 0) {
        const pdfFolder = zip.folder('pdfs');
        if (!pdfFolder) throw new Error('Impossible de créer le dossier PDF dans le ZIP');

        let successfulPdfs = 0;
        const pdfPromises = invoicesWithPdfs.map(async (invoice) => {
          try {
            const pdfBlobUrl = await InvoiceServices.getPdfFile(invoice.id, token);
            const response = await fetch(pdfBlobUrl);
            if (!response.ok) throw new Error('Échec de la récupération du PDF');
            const blob = await response.blob();
            const filename = `facture_${invoice.id}_${invoice.num_client || 'inconnu'}.pdf`;
            pdfFolder.file(filename, blob);
            successfulPdfs++;
          } catch (error) {
            console.error(`Erreur lors de la récupération du PDF pour la facture ${invoice.id}:`, error);
          }
        });

        await Promise.all(pdfPromises);

        if (successfulPdfs < invoicesWithPdfs.length) {
          zip.file('_notes.txt', `Note : ${invoicesWithPdfs.length - successfulPdfs} PDF(s) n'ont pas pu être téléchargés.`);
        }
      } else {
        zip.file('_notes.txt', 'Note : Aucune facture avec PDF disponible.');
      }

      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      saveAs(content, `contacts_factures_${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (error) {
      console.error('Erreur lors de la création du fichier ZIP:', error);
      setError('Échec de la création du paquet de téléchargement. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [contacts]);

  return (
    <div className="w-full py-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-slate-800">Contacts</h1>
        <div className="flex gap-2">
          {/* Import moved to Clients page */}
          <Button
            variant="outline"
            onClick={downloadZipWithDataAndPdfs}
            disabled={isLoading || contacts.length === 0}
            className="text-xs px-3 py-1.5"
          >
            {isLoading ? 'Préparation...' : 'ZIP'}
          </Button>
        </div>
      </div>
      
      {/* Invoice Filter Section */}
      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="invoice-filter" className="text-xs font-medium text-gray-600">
          Filtrer:
        </label>
        <select
          id="invoice-filter"
          value={filters.hasInvoices || 'with'}
          onChange={(e) => {
            const value = e.target.value as 'with' | 'without' | 'all';
            setFilters(prev => ({ ...prev, hasInvoices: value, page: 1 }));
          }}
          className="px-2 py-1 text-xs border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="with">Avec factures</option>
          {isAdmin && <option value="without">Sans factures</option>}
          {isAdmin && <option value="all">Tous</option>}
        </select>
        <span className="text-[10px] text-gray-500">
          {filters.hasInvoices === 'with' && '(Défaut)'}
          {filters.hasInvoices === 'without' && '(Sans factures)'}
          {filters.hasInvoices === 'all' && '(Tous)'}
        </span>
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
      <DataTable
        columns={columns}
        data={contacts}
        onPaginationChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onFilterChange={handleFilterChange}
        pageCount={Math.ceil(totalCount / (filters.limit || 10))}
        currentPage={filters.page || 1}
        pageSize={filters.limit || 10}
        isLoading={isLoading}
        isContact={true}
      />
     {token && <ModalCst
        numClient={selectedNumClient || '000'}
        token = {token}
        isOpen={modalTableIsOpen}
        onClose={() => {
          setModalTableIsOpen(false);
          setSelectedNumClient(null);
        }}
        onFilesSelected={handleFilesSelected}
      />}
    </div>
  );
};

export default Contacts;