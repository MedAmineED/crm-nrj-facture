export class FilterFactureDto {
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
  conso_annuelle_min?: number;
  conso_annuelle_max?: number;
  prix_unitaire_min?: number;
  prix_unitaire_max?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
