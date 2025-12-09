import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ContactService } from './contact.service';
import { ImportProgressService, ImportProgress } from './import-progress.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@Controller('contact')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly importProgressService: ImportProgressService,
  ) { }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactService.create(createContactDto);
  }

  @Get('all')
  @Roles(Role.ADMIN)
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query() filters: Record<string, string>,
  ) {
    return this.contactService.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      filters,
    });
  }

  @Get('me')
  @Roles(Role.USER, Role.ADMIN)
  findContactsByUserId(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query() filters: Record<string, string>,
  ) {
    console.log('User ID from request: ', req.user);
    return this.contactService.findContactsByUserId(req.user.userId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      filters,
    });
  }

  @Get('not-sent/:id')
  @Roles(Role.ADMIN)
  findUnassignedContactsForUser(
    @Param('id') id: number,
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query() filters: Record<string, string>,
  ) {
    return this.contactService.findUnassignedContactsForUser(+id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      filters,
    });
  }

  @Get('import-progress/:jobId')
  @Roles(Role.ADMIN)
  getImportProgress(@Param('jobId') jobId: string): ImportProgress {
    const progress = this.importProgressService.getJob(jobId);
    if (!progress) {
      throw new NotFoundException(`Import job ${jobId} not found`);
    }
    return progress;
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.contactService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.contactService.update(+id, updateContactDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.contactService.remove(+id);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit for large files
      },
    }),
  )
  @Roles(Role.ADMIN)
  async importContacts(
    @UploadedFile() file: Express.Multer.File,
    @Body('columnMapping') columnMapping: Record<string, string>,
    @Body('profile') profile: string,
    @Body('status') status: string,
    @Res() response: Response,
  ): Promise<void> {
    if (!columnMapping) {
      throw new BadRequestException('Column mapping is required');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = await this.contactService.importContactsFromFile(
        file,
        columnMapping,
        profile || 'imported',
        status || 'active',
      );
      response.json(result);
    } catch (error) {
      console.error('Import error:', error);
      response.status(error.status || 500).json({
        message: error.message || 'Internal server error',
        error: error.name || 'Error',
      });
    }
  }

  @Post('import-async')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit for large files
      },
    }),
  )
  @Roles(Role.ADMIN)
  async importContactsAsync(
    @UploadedFile() file: Express.Multer.File,
    @Body('columnMapping') columnMapping: Record<string, string>,
    @Body('profile') profile: string,
    @Body('status') status: string,
  ): Promise<{ jobId: string; message: string }> {
    if (!columnMapping) {
      throw new BadRequestException('Column mapping is required');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Create a job ID immediately
    const jobId = this.importProgressService.createJob();

    // Start processing in background (don't await)
    this.contactService.importContactsFromFileAsync(
      file,
      columnMapping,
      profile || 'imported',
      status || 'active',
      jobId,
      this.importProgressService,
    ).catch((error) => {
      console.error('Async import error:', error);
      this.importProgressService.failJob(jobId, error.message);
    });

    // Return immediately with job ID
    return {
      jobId,
      message: 'Import started. Use the jobId to track progress.',
    };
  }
}
