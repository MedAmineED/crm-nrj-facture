import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Contact } from '../../contact/entities/contact.entity';

@Entity()
export class Client {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    num_client: string;

    @Column({ length: 100, nullable: true })
    profile: string;

    @Column({ length: 50, nullable: true, default: 'active' })
    status: string;

    @Column({ name: 'raison_sociale', length: 150, nullable: true })
    raisonSociale: string;

    // One Client can have many Contacts
    @OneToMany(() => Contact, (contact) => contact.client)
    contacts: Contact[];
}
