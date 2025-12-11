import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Role } from '../../auth/role.enum';
import { UserContactAssignment } from '../../admin/entities/user-contact-assignment.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column('simple-array')
  roles: Role[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Relationship to assignments
  @OneToMany(() => UserContactAssignment, (assignment) => assignment.user)
  contactAssignments: UserContactAssignment[];
}
