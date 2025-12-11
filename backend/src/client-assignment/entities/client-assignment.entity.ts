import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Client } from '../../client/entities/client.entity';

@Entity('client_assignments')
export class ClientAssignment {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Client)
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @Column({ default: 'New' })
    status: string;

    @Column({ type: 'text', nullable: true })
    comment: string;

    @CreateDateColumn({ name: 'assigned_at' })
    assignedAt: Date;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;
}
