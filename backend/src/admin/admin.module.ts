import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { UserContactAssignment } from './entities/user-contact-assignment.entity';
import { Facture } from 'src/facture/entities/facture.entity';
import { Contact } from 'src/contact/entities/contact.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      UserContactAssignment,
      Facture,
      Contact,
      User,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
