import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FactureController } from './facture.controller';
import { FactureService } from './facture.service';
import { Facture } from './entities/facture.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Facture])],
  controllers: [FactureController],
  providers: [FactureService],
})
export class FactureModule {}
