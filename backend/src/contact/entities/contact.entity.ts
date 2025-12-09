// contact.entity.ts
import { Facture } from 'src/facture/entities/facture.entity';
import { Client } from 'src/client/entities/client.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  num_client: string;

  @Column({ length: 100 })
  nom: string;

  @Column({ length: 100 })
  prenom: string;

  @Column({ name: 'raison_sociale', length: 150, nullable: true })
  raisonSociale: string;

  @Column({ length: 100 })
  fonction: string;

  @Column({ length: 100, unique: false })
  email: string;

  @Column({ name: 'num_tel', length: 20, unique: false, nullable: true })
  numTel: string;

  // Many Contacts can belong to one Client
  // No FK constraint at DB level to avoid migration issues
  @ManyToOne(() => Client, (client) => client.contacts, {
    eager: true,
    createForeignKeyConstraints: false  // This prevents DB-level FK
  })
  client: Client;

  // One Contact can have many Factures
  @OneToMany(() => Facture, (facture) => facture.contact)
  factures: Facture[];
}
