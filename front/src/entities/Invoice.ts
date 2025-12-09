export interface Invoice {
    id: number;
    type_document?: string;
    montant_ttc?: string;
    num_client?: string;
    siret?: string;
    code_naf?: string;
    adresse_site?: string;
    code_postal?: string;
    echeance?: string; // Date in YYYY-MM-DD format
    pdl?: string;
    conso_annuelle?: string;
    prix_unitaire?: number; 
    creation_date: string; 
    pdf_path?: string;
    original_filename?: string; 
}

export interface InvoiceUpload 
/*multiple pdf files*/
/*the extraction of data from the pdf files is done in the backend using pdf-parse and pdf-lib*/ 
{
    files: File[]; // Array of File objects for multiple PDF uploads
}

export interface UpdateFactureDto {
  type_facture?: string;
  montant_ttc?: number;
  num_client?: string;
  siret?: string;
  code_naf?: string;
  adresse_site?: string;
  code_postal?: string;
  echeance?: string;
  pdl?: string;
  conso_annuelle?: string;
  prix_unitaire?: number;
}