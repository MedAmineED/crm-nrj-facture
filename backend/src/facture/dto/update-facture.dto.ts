import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class UpdateFactureDto {
  @IsOptional()
  @IsString()
  type_facture?: string;

  @IsOptional()
  @IsNumber()
  montant_ttc?: number;

  @IsOptional()
  @IsString()
  num_client?: string;

  @IsOptional()
  @IsString()
  siret?: string;

  @IsOptional()
  @IsString()
  code_naf?: string;

  @IsOptional()
  @IsString()
  adresse_site?: string;

  @IsOptional()
  @IsString()
  code_postal?: string;

  @IsOptional()
  @IsDateString()
  echeance?: string;

  @IsOptional()
  @IsString()
  pdl?: string;

  @IsOptional()
  @IsString()
  conso_annuelle?: string;

  @IsOptional()
  @IsNumber()
  prix_unitaire?: number;

  @IsOptional()
  @IsDateString()
  creation_date?: string;

  @IsOptional()
  @IsString()
  pdf_path?: string;

  @IsOptional()
  @IsString()
  original_filename?: string;
}
