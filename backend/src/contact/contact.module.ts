import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { Contact } from './entities/contact.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserContactAssignment } from '../admin/entities/user-contact-assignment.entity';
import { ClientModule } from '../client/client.module';
import { ImportProgressService } from './import-progress.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact, UserContactAssignment]),
    ClientModule,
  ],
  controllers: [ContactController],
  providers: [ContactService, ImportProgressService],
})
export class ContactModule { }
