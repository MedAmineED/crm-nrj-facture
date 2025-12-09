import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';

import { Contact } from '../contact/entities/contact.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Client, Contact])],
    controllers: [ClientController],
    providers: [ClientService],
    exports: [ClientService, TypeOrmModule],
})
export class ClientModule { }
