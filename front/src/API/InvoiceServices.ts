import type { Invoice, InvoiceUpload } from '@/entities/Invoice';
import axios from 'axios';
import ApiUrls from './Urls';
import type { UploadResponse } from '@/entities/upload-progress';

class InvoiceServices {
  async UploadInvoices(endpoint: string, token: string, pdfInvoice: InvoiceUpload): Promise<UploadResponse> {
    console.log("Uploading invoices:", pdfInvoice);
    try {
      const formData = new FormData();

      pdfInvoice.files.forEach((file: File) => {
        formData.append('files', file);
      });

      const response = await axios.post<UploadResponse>(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log("Response from backend:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error saving invoices:", error);
      throw error;
    }
  }
  async UpdateInvoice(url: string, token: string | null, data: InvoiceUpload) {
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Include the token in the headers
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }
  async GetInvoicesByClient(endpoint: string, numClient: string, token: string, filters?: {
    type_facture?: string;
    montant_ttc?: string;
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
  }): Promise<{ data: Invoice[], total: number, page: number, limit: number }> {
    try {
      console.log(numClient, " Fetching invoices for client : ", numClient);
      console.log(`${endpoint}api/${numClient}/factures`);
      const response = await axios.get(`${endpoint}api/${numClient}/factures`, {
        params: filters
        , headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Include the token in the headers
        }
      });
      console.log("Fetched invoices by client:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }


  async GetInvoicesList(endpoint: string, token: string, filters?: {
    type_facture?: string;
    montant_ttc?: string;
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
  }): Promise<{ data: Invoice[], total: number, page: number, limit: number }> {
    try {
      const response = await axios.get(endpoint, {
        params: filters
        , headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Include the token in the headers
        }
      }

      );
      console.log("Fetched invoices:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }

  async getPdfFile(invoiceId: number, token: string): Promise<string> {
    try {
      const response = await axios.get(`${ApiUrls.BASE_URL}api/${invoiceId}/pdf`, {
        responseType: 'blob', // Important: Fetch as Blob
        headers: {
          'Accept': 'application/pdf',
          'Authorization': `Bearer ${token}`,
        },
      });

      // Create a Blob URL from the response
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      return pdfUrl;
    } catch (error) {
      console.error('Error fetching PDF:', error);
      throw new Error('Failed to fetch PDF');
    }
  }

  async DeleteInvoice(url: string, token: string) {
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Include the token in the headers
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }
}

export default new InvoiceServices();
