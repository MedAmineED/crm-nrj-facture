// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FactureModule } from './facture/facture.module';
import { ContactModule } from './contact/contact.module';
import { ClientModule } from './client/client.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes env vars available everywhere
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'], // auto-loads all entities
      synchronize: true, // turn OFF in production!
    }),
    FactureModule,
    ContactModule,
    ClientModule,
    AuthModule,
    UsersModule,
    AdminModule, // Ensure AdminModule is imported
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
