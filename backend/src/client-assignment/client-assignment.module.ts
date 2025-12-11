import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientAssignment } from './entities/client-assignment.entity';
import { ClientAssignmentService } from './client-assignment.service';
import { ClientAssignmentController } from './client-assignment.controller';
import { ClientModule } from '../client/client.module';
import { UsersModule } from '../users/users.module';
import { Facture } from '../facture/entities/facture.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([ClientAssignment, Facture]),
        ClientModule,
        UsersModule
    ],
    controllers: [ClientAssignmentController],
    providers: [ClientAssignmentService],
    exports: [ClientAssignmentService]
})
export class ClientAssignmentModule { }
