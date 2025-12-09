// create-contact.dto.ts
export class CreateContactDto {
  num_client: string;
  nom: string;
  prenom: string;
  raisonSociale: string;
  fonction: string;
  email: string;
  numTel: string;
  profile?: string;  // NEW: Can be mapped from CSV
  status?: string;   // NEW: Can be mapped from CSV
}
