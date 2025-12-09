export interface Lead {
  id: string;
  type: string;
  amount: number;
  clientNumber: string;
  siret: string;
  nafCode: string;
  address: string;
  postalCode: string;
  contractDueDate: string;
  pdlPce: string;
  estimatedAnnualConsumption: number;
  unitPrice: number;
}

export interface WebsiteLead {
  id: string;
  fullName: string;
  address: string;
  age: number;
  phone: string;
  email: string;
  company: string;
  energyType: string;
}