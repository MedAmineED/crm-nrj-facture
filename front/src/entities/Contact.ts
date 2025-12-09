import type { Invoice } from "./Invoice";

export interface Contact {
  id: number;
  num_client: string; // Unique client number
  nom: string; // Last name
  prenom: string; // First name
  raisonSociale: string; 
  fonction: string; 
  email: string; // Email address
  numTel: string; // Phone number
  factures?: Invoice[];
}
