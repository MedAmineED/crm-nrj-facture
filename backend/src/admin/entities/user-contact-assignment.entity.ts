// user-contact-assignment.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Contact } from '../../contact/entities/contact.entity';

@Entity('user_contact_assignments')
export class UserContactAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Contact, { eager: true })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column({ name: 'assigned_by_admin_id' })
  assignedByAdminId: number;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'notes', nullable: true, length: 500 })
  notes?: string;
}
