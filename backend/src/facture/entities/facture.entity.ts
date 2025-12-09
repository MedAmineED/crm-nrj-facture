import { Contact } from 'src/contact/entities/contact.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BeforeInsert,
  ManyToOne,
} from 'typeorm';

@Entity()
export class Facture {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  type_facture: string;

  @Column({ type: 'float', nullable: true, default: 0 })
  montant_ttc: number;

  @Column({ nullable: true })
  num_client: string;

  @Column({ nullable: true })
  siret: string;

  @Column({ nullable: true })
  code_naf: string;

  @Column({ nullable: true })
  adresse_site: string;

  @Column({ nullable: true })
  code_postal: string;

  @Column({ nullable: true, type: 'date' })
  echeance: string;

  @Column({ nullable: true })
  pdl: string;

  @Column({ nullable: true })
  conso_annuelle: string;

  @Column({ type: 'float', nullable: true })
  prix_unitaire: number;

  @Column({ type: 'date' })
  creation_date: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdf_path: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  original_filename: string;

  // Optional ManyToOne relationship without foreign key constraint
  @ManyToOne(() => Contact, (contact) => contact.factures, { nullable: true })
  contact?: Contact;

  @BeforeInsert()
  setDateOnly() {
    this.creation_date = new Date().toISOString().slice(0, 10);
  }
}
