import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, DataSource } from 'typeorm';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Contact } from './entities/contact.entity';
import { UserContactAssignment } from 'src/admin/entities/user-contact-assignment.entity';
import { ClientService } from '../client/client.service';
import { Readable, Transform } from 'stream';
import { parse } from 'csv-parse';
import { pipeline } from 'stream/promises';

import * as XLSX from 'xlsx';

interface FilterOptions {
  page: number;
  limit: number;
  filters: Record<string, string>;
}

interface ImportResult {
  totalRecords: number;
  successfulImports: number;
  failedImports: number;
  duplicatePhoneNumbers: number;
  failedDueToMissingNumClient: number;
  failedDueToDuplicateNumClient: number;
  failedDueToInvalidPhone: number;
  failedDueToInvalidEmail: number;
  failedDueToDuplicateEmail: number;
  failedDueToOtherErrors: number;
  otherErrorsDetails: string[];
}

@Injectable()
export class ContactService {
  private readonly BATCH_SIZE = 500; // Increased batch size
  private readonly MAX_CONCURRENT_BATCHES = 3;
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    private dataSource: DataSource,
    @InjectRepository(UserContactAssignment)
    private userContactAssignmentRepository: Repository<UserContactAssignment>,
    private clientService: ClientService,
  ) { }

  async findAll(
    options: FilterOptions,
  ): Promise<{ contacts: Contact[]; totalCount: number }> {
    const { page, limit, filters } = options;

    const query = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.factures', 'factures');

    // Apply filters
    if (filters.num_client) {
      query.andWhere('contact.num_client LIKE :num_client', {
        num_client: `%${filters.num_client}%`,
      });
    }
    if (filters.nom) {
      query.andWhere('contact.nom LIKE :nom', { nom: `%${filters.nom}%` });
    }
    if (filters.prenom) {
      query.andWhere('contact.prenom LIKE :prenom', {
        prenom: `%${filters.prenom}%`,
      });
    }
    if (filters.raisonSociale) {
      query.andWhere('contact.raisonSociale LIKE :raisonSociale', {
        raisonSociale: `%${filters.raisonSociale}%`,
      });
    }
    if (filters.fonction) {
      query.andWhere('contact.fonction LIKE :fonction', {
        fonction: `%${filters.fonction}%`,
      });
    }
    if (filters.email) {
      query.andWhere('contact.email LIKE :email', {
        email: `%${filters.email}%`,
      });
    }
    if (filters.numTel) {
      query.andWhere('contact.numTel LIKE :numTel', {
        numTel: `%${filters.numTel}%`,
      });
    }

    // Filter by invoice existence
    if (filters.hasInvoices === 'with') {
      // Only contacts with at least one invoice
      query.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from('facture', 'f')
          .where('f.num_client = contact.num_client')
          .getQuery();
        return `EXISTS ${subQuery}`;
      });
    } else if (filters.hasInvoices === 'without') {
      // Only contacts without any invoices
      query.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from('facture', 'f')
          .where('f.num_client = contact.num_client')
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      });
    }
    // If hasInvoices is undefined or 'all', no additional filter is applied

    // Apply pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [contacts, totalCount] = await query.getManyAndCount();

    return { contacts, totalCount };
  }

  async findContactsByUserId(
    userId: number,
    options: FilterOptions,
  ): Promise<{ contacts: Contact[]; totalCount: number }> {
    const { page, limit, filters } = options;

    const query = this.userContactAssignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.contact', 'contact')
      .leftJoinAndSelect('contact.factures', 'factures')
      .where('assignment.user_id = :userId', { userId })
      .andWhere('assignment.isActive = :isActive', { isActive: true });

    // Apply filters
    if (filters.num_client) {
      query.andWhere('contact.num_client LIKE :num_client', {
        num_client: `%${filters.num_client}%`,
      });
    }
    if (filters.nom) {
      query.andWhere('contact.nom LIKE :nom', { nom: `%${filters.nom}%` });
    }
    if (filters.prenom) {
      query.andWhere('contact.prenom LIKE :prenom', {
        prenom: `%${filters.prenom}%`,
      });
    }
    if (filters.raisonSociale) {
      query.andWhere('contact.raisonSociale LIKE :raisonSociale', {
        raisonSociale: `%${filters.raisonSociale}%`,
      });
    }
    if (filters.fonction) {
      query.andWhere('contact.fonction LIKE :fonction', {
        fonction: `%${filters.fonction}%`,
      });
    }
    if (filters.email) {
      query.andWhere('contact.email LIKE :email', {
        email: `%${filters.email}%`,
      });
    }
    if (filters.numTel) {
      query.andWhere('contact.numTel LIKE :numTel', {
        numTel: `%${filters.numTel}%`,
      });
    }

    // Filter by invoice existence
    if (filters.hasInvoices === 'with') {
      // Only contacts with at least one invoice
      query.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from('facture', 'f')
          .where('f.num_client = contact.num_client')
          .getQuery();
        return `EXISTS ${subQuery}`;
      });
    } else if (filters.hasInvoices === 'without') {
      // Only contacts without any invoices
      query.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from('facture', 'f')
          .where('f.num_client = contact.num_client')
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      });
    }
    // If hasInvoices is undefined or 'all', no additional filter is applied

    // Apply pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const assignments = await query.getMany();
    const contacts = assignments.map((assignment) => assignment.contact);
    const totalCount = await query.getCount();

    return { contacts, totalCount };
  }
  async create(createContactDto: CreateContactDto): Promise<Contact> {
    const contact = this.contactRepository.create(createContactDto);
    return await this.contactRepository.save(contact);
  }

  async findOne(id: number): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { id },
      relations: ['factures'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact #${id} not found`);
    }

    return contact;
  }

  async update(
    id: number,
    updateContactDto: UpdateContactDto,
  ): Promise<Contact> {
    const contact = await this.findOne(id);

    const updatedContact = this.contactRepository.merge(
      contact,
      updateContactDto,
    );
    return await this.contactRepository.save(updatedContact);
  }

  async remove(id: number): Promise<void> {
    const contact = await this.findOne(id);
    await this.contactRepository.remove(contact);
  }

  async findUnassignedContactsForUser(
    userId: number,
    options: FilterOptions,
  ): Promise<{ contacts: Contact[]; totalCount: number }> {
    const { page, limit, filters } = options;

    // Get all contact IDs assigned to the user
    const assignments = await this.userContactAssignmentRepository.find({
      where: { user: { id: userId }, isActive: true },
      select: ['contact'],
    });

    // Extract assigned contact IDs
    const assignedContactIds = assignments.map(
      (assignment) => assignment.contact.id,
    );

    // Build query for unassigned contacts
    const query = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.factures', 'factures')
      .where({
        id: Not(In(assignedContactIds.length > 0 ? assignedContactIds : [0])),
      });

    // Apply filters
    if (filters.num_client) {
      query.andWhere('contact.num_client LIKE :num_client', {
        num_client: `%${filters.num_client}%`,
      });
    }
    if (filters.nom) {
      query.andWhere('contact.nom LIKE :nom', { nom: `%${filters.nom}%` });
    }
    if (filters.prenom) {
      query.andWhere('contact.prenom LIKE :prenom', {
        prenom: `%${filters.prenom}%`,
      });
    }
    if (filters.raisonSociale) {
      query.andWhere('contact.raisonSociale LIKE :raisonSociale', {
        raisonSociale: `%${filters.raisonSociale}%`,
      });
    }
    if (filters.fonction) {
      query.andWhere('contact.fonction LIKE :fonction', {
        fonction: `%${filters.fonction}%`,
      });
    }
    if (filters.email) {
      query.andWhere('contact.email LIKE :email', {
        email: `%${filters.email}%`,
      });
    }
    if (filters.numTel) {
      query.andWhere('contact.numTel LIKE :numTel', {
        numTel: `%${filters.numTel}%`,
      });
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [contacts, totalCount] = await query.getManyAndCount();

    return { contacts, totalCount };
  }

  /// accespt csv file to extract data and create contacts
  async importContactsFromFile(
    file: Express.Multer.File,
    columnMapping: Record<string, string>,
    profile: string,
    status: string = 'active',
  ): Promise<ImportResult> {
    console.log('Starting high-performance file import');
    console.time('Total Import Time');

    const { isCSV, isXLSX } = this.detectFileType(file);
    if (!isCSV && !isXLSX) {
      throw new BadRequestException(
        'Invalid file format. Please upload a CSV or XLSX file',
      );
    }

    const parsedColumnMapping = this.parseColumnMapping(columnMapping);
    this.validateColumnMapping(parsedColumnMapping);

    const importResult: ImportResult = this.initializeImportResult();

    // Pre-fetch removed for performance optimization (duplicates allowed)
    const existingPhoneNumbers = new Set<string>();
    const existingClientNumbers = new Set<string>();

    const processedInBatch = {
      phoneNumbers: new Set<string>(),
      clientNumbers: new Set<string>(),
    };

    try {
      if (isXLSX) {
        await this.processXLSXStream(
          file,
          parsedColumnMapping,
          importResult,
          existingPhoneNumbers,
          existingClientNumbers,
          processedInBatch,
          profile,
          status,
        );
      } else {
        await this.processCSVStream(
          file,
          parsedColumnMapping,
          importResult,
          existingPhoneNumbers,
          existingClientNumbers,
          processedInBatch,
          profile,
          status,
        );
      }
    } catch (error) {
      console.error('File processing error:', error);
      throw new BadRequestException(`Error processing file: ${error.message}`);
    }

    console.timeEnd('Total Import Time');
    console.log('Import completed with results:', importResult);
    return importResult;
  }

  /// Async version for large files with progress tracking
  async importContactsFromFileAsync(
    file: Express.Multer.File,
    columnMapping: Record<string, string>,
    profile: string,
    status: string = 'active',
    jobId: string,
    progressService: any, // ImportProgressService
  ): Promise<void> {
    console.log(`Starting async file import for job: ${jobId}`);
    console.time(`Total Import Time - ${jobId}`);

    const { isCSV, isXLSX } = this.detectFileType(file);
    if (!isCSV && !isXLSX) {
      progressService.failJob(jobId, 'Invalid file format. Please upload a CSV or XLSX file');
      return;
    }

    const parsedColumnMapping = this.parseColumnMapping(columnMapping);
    try {
      this.validateColumnMapping(parsedColumnMapping);
    } catch (error) {
      progressService.failJob(jobId, error.message);
      return;
    }

    const importResult: ImportResult = this.initializeImportResult();

    // Pre-fetch removed for performance optimization (duplicates allowed)
    const existingPhoneNumbers = new Set<string>();
    const existingClientNumbers = new Set<string>();

    const processedInBatch = {
      phoneNumbers: new Set<string>(),
      clientNumbers: new Set<string>(),
    };

    // Set job to processing status
    progressService.updateJob(jobId, { status: 'processing' });

    try {
      // Use existing processing methods - progress will be updated after completion
      if (isXLSX) {
        await this.processXLSXStream(
          file,
          parsedColumnMapping,
          importResult,
          existingPhoneNumbers,
          existingClientNumbers,
          processedInBatch,
          profile,
          status,
        );
      } else {
        await this.processCSVStream(
          file,
          parsedColumnMapping,
          importResult,
          existingPhoneNumbers,
          existingClientNumbers,
          processedInBatch,
          profile,
          status,
        );
      }

      // Mark job as completed
      progressService.completeJob(jobId, {
        totalRecords: importResult.totalRecords,
        processedRecords: importResult.totalRecords,
        successfulImports: importResult.successfulImports,
        failedImports: importResult.failedImports,
        duplicatePhoneNumbers: importResult.duplicatePhoneNumbers,
        failedDueToMissingNumClient: importResult.failedDueToMissingNumClient,
        failedDueToDuplicateNumClient: importResult.failedDueToDuplicateNumClient,
        failedDueToInvalidPhone: importResult.failedDueToInvalidPhone,
        failedDueToInvalidEmail: importResult.failedDueToInvalidEmail,
        failedDueToDuplicateEmail: importResult.failedDueToDuplicateEmail,
        failedDueToOtherErrors: importResult.failedDueToOtherErrors,
      });

    } catch (error) {
      console.error('File processing error:', error);
      progressService.failJob(jobId, `Error processing file: ${error.message}`);
    }

    console.timeEnd(`Total Import Time - ${jobId}`);
    console.log('Async import completed with results:', importResult);
  }

  private async processCSVStream(
    file: Express.Multer.File,
    columnMapping: Record<string, string>,
    importResult: ImportResult,
    existingPhoneNumbers: Set<string>,
    existingClientNumbers: Set<string>,
    processedInBatch: { phoneNumbers: Set<string>; clientNumbers: Set<string> },
    profile: string,
    status: string,
  ): Promise<void> {
    const stream = Readable.from(file.buffer);
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false, // Keep as strings for better performance
    });

    await this.processBatchedStream(
      stream.pipe(parser),
      columnMapping,
      importResult,
      existingPhoneNumbers,
      existingClientNumbers,
      processedInBatch,
      profile,
      status,
    );
  }

  private async processXLSXStream(
    file: Express.Multer.File,
    columnMapping: Record<string, string>,
    importResult: ImportResult,
    existingPhoneNumbers: Set<string>,
    existingClientNumbers: Set<string>,
    processedInBatch: { phoneNumbers: Set<string>; clientNumbers: Set<string> },
    profile: string,
    status: string,
  ): Promise<void> {
    console.time('XLSX Parse');
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Use streaming approach for XLSX
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false, // Ensure strings for consistency
    });
    console.timeEnd('XLSX Parse');

    if (jsonData.length < 2) {
      throw new BadRequestException(
        'File must contain at least a header row and one data row',
      );
    }

    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1);

    // Convert to stream-like processing
    const xlsxStream = new Readable({
      objectMode: true,
      read() {
        if (dataRows.length > 0) {
          const rowData = dataRows.shift() as any[];
          const rowObject: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowObject[header] = rowData[index] || '';
          });
          this.push(rowObject);
        } else {
          this.push(null);
        }
      },
    });

    await this.processBatchedStream(
      xlsxStream,
      columnMapping,
      importResult,
      existingPhoneNumbers,
      existingClientNumbers,
      processedInBatch,
      profile,
      status,
    );
  }

  private async processBatchedStream(
    sourceStream: Readable,
    columnMapping: Record<string, string>,
    importResult: ImportResult,
    existingPhoneNumbers: Set<string>,
    existingClientNumbers: Set<string>,
    processedInBatch: { phoneNumbers: Set<string>; clientNumbers: Set<string> },
    profile: string,
    status: string,
  ): Promise<void> {
    let batch: CreateContactDto[] = [];
    let batchPromises: Promise<void>[] = [];

    const batchProcessor = new Transform({
      objectMode: true,
      transform: async (row: any, encoding, callback) => {
        try {
          importResult.totalRecords++;

          const contactDto = this.mapRowToDto(row, columnMapping);
          const validationResult = this.validateContact(
            contactDto,
            existingPhoneNumbers,
            existingClientNumbers,
            processedInBatch,
          );

          if (validationResult.isValid) {
            batch.push(contactDto);

            // Add to processed sets to prevent duplicates within the same import
            // processedInBatch.phoneNumbers.add(contactDto.numTel);
            // REMOVED: Don't track client numbers anymore - duplicates are allowed
            // processedInBatch.clientNumbers.add(contactDto.num_client);
          } else {
            this.handleValidationError(validationResult.error!, importResult);
          }

          // Process batch when it reaches the limit
          if (batch.length >= this.BATCH_SIZE) {
            const batchToProcess = [...batch];
            batch = [];

            // Limit concurrent batch processing
            if (batchPromises.length >= this.MAX_CONCURRENT_BATCHES) {
              await Promise.all(batchPromises);
              batchPromises = [];
            }

            batchPromises.push(this.processBatch(batchToProcess, importResult, profile, status));
          }

          callback();
        } catch (error) {
          callback(error);
        }
      },

      flush: async (callback) => {
        try {
          // Process remaining batch
          if (batch.length > 0) {
            batchPromises.push(this.processBatch(batch, importResult, profile, status));
          }

          // Wait for all batch processing to complete
          await Promise.all(batchPromises);
          callback();
        } catch (error) {
          callback(error);
        }
      },
    });

    await pipeline(sourceStream, batchProcessor);
  }

  private async processBatch(
    batch: CreateContactDto[],
    importResult: ImportResult,
    defaultProfile: string,
    defaultStatus: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.time(`Batch Insert ${batch.length} records`);

      // Step 1: Create/update clients for each unique num_client
      const uniqueClients = batch.reduce((acc, contact) => {
        if (!acc[contact.num_client]) {
          acc[contact.num_client] = contact;
        }
        return acc;
      }, {} as Record<string, CreateContactDto>);

      const clientsData = Object.values(uniqueClients).map((contact) => ({
        num_client: contact.num_client,
        profile: contact.profile || defaultProfile,
        status: contact.status || defaultStatus,
        raisonSociale: contact.raisonSociale,
      }));

      await this.clientService.createOrUpdateBatch(clientsData);

      // Step 2: Use bulk insert for contacts
      const contacts = batch.map((dto) => this.contactRepository.create(dto));
      await queryRunner.manager.save(Contact, contacts, { chunk: 100 });

      importResult.successfulImports += batch.length;
      console.timeEnd(`Batch Insert ${batch.length} records`);

      await queryRunner.commitTransaction();
    } catch (error) {
      console.log(`Batch processing error: ${error.message}`);
      await queryRunner.rollbackTransaction();

      // Fallback: process individually to identify specific failures
      console.log(
        `Batch failed, processing ${batch.length} records individually`,
      );
      await this.processIndividualRecords(batch, importResult, queryRunner, defaultProfile, defaultStatus);
    } finally {
      await queryRunner.release();
    }
  }

  private async processIndividualRecords(
    batch: CreateContactDto[],
    importResult: ImportResult,
    queryRunner: any,
    defaultProfile: string,
    defaultStatus: string,
  ): Promise<void> {
    for (const contactDto of batch) {
      try {
        await queryRunner.startTransaction();

        // Create/update client first
        await this.clientService.createOrUpdate(
          contactDto.num_client,
          contactDto.profile || defaultProfile,      // Use contact's profile or default
          contactDto.status || defaultStatus,        // Use contact's status or default
          contactDto.raisonSociale,
        );

        // Then create contact
        const contact = this.contactRepository.create(contactDto);
        await queryRunner.manager.save(contact);
        await queryRunner.commitTransaction();
        importResult.successfulImports++;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        importResult.failedImports++;

        if (error.code === 'ER_DUP_ENTRY') {
          if (error.message.includes('numTel')) {
            importResult.duplicatePhoneNumbers++;
          } else if (error.message.includes('email')) {
            importResult.failedDueToDuplicateEmail++;
          }
          // REMOVED: No longer checking for duplicate num_client
        } else {
          importResult.failedDueToOtherErrors++;
        }
      }
    }
  }

  private validateContact(
    contactDto: CreateContactDto,
    existingPhoneNumbers: Set<string>,
    existingClientNumbers: Set<string>,
    processedInBatch: { phoneNumbers: Set<string>; clientNumbers: Set<string> },
  ): { isValid: boolean; error?: string } {
    // if (!contactDto.numTel) {
    //   return { isValid: false, error: 'MISSING_PHONE' };
    // }

    if (!contactDto.num_client) {
      return { isValid: false, error: 'MISSING_CLIENT_NUMBER' };
    }

    // Relaxed validation: Allow duplicates and invalid formats
    // if (
    //   existingPhoneNumbers.has(contactDto.numTel) ||
    //   processedInBatch.phoneNumbers.has(contactDto.numTel)
    // ) {
    //   return { isValid: false, error: 'DUPLICATE_PHONE' };
    // }

    // if (contactDto.email) {
    //   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    //   if (!emailRegex.test(contactDto.email)) {
    //     return { isValid: false, error: 'INVALID_EMAIL' };
    //   }
    // }

    return { isValid: true };
  }

  private async getExistingPhoneNumbers(): Promise<Set<string>> {
    const result = await this.contactRepository
      .createQueryBuilder('contact')
      .select('contact.numTel')
      .getRawMany();

    return new Set(result.map((r) => r.contact_numTel).filter(Boolean));
  }

  private async getExistingClientNumbers(): Promise<Set<string>> {
    const result = await this.contactRepository
      .createQueryBuilder('contact')
      .select('contact.num_client')
      .getRawMany();

    return new Set(result.map((r) => r.contact_num_client).filter(Boolean));
  }

  private mapRowToDto(
    row: any,
    columnMapping: Record<string, string>,
  ): CreateContactDto {
    const createContactDto: CreateContactDto = {
      num_client: '',
      nom: '',
      prenom: '',
      raisonSociale: '',
      fonction: '',
      email: '',
      numTel: '',
      profile: undefined,    // NEW: Allow mapping from CSV
      status: undefined,     // NEW: Allow mapping from CSV
    };

    for (const [dbField, csvColumn] of Object.entries(columnMapping)) {
      if (
        dbField in createContactDto &&
        csvColumn &&
        row[csvColumn] !== undefined
      ) {
        createContactDto[dbField as keyof CreateContactDto] =
          String(row[csvColumn]).trim() || '';
      }
    }

    return createContactDto;
  }



  // Helper methods remain the same...
  private detectFileType(file: Express.Multer.File) {
    const isCSV =
      file.mimetype.includes('csv') ||
      file.originalname.toLowerCase().endsWith('.csv');
    const isXLSX =
      file.mimetype.includes('spreadsheet') ||
      file.mimetype.includes('excel') ||
      file.originalname.toLowerCase().endsWith('.xlsx') ||
      file.originalname.toLowerCase().endsWith('.xls');
    return { isCSV, isXLSX };
  }

  private parseColumnMapping(
    columnMapping: Record<string, string>,
  ): Record<string, string> {
    if (typeof columnMapping === 'string') {
      try {
        return JSON.parse(columnMapping);
      } catch (error) {
        throw new Error('Invalid JSON in column mapping ' + error.message);
        throw new BadRequestException('Invalid column mapping format');
      }
    }
    return columnMapping || {};
  }

  private validateColumnMapping(columnMapping: Record<string, string>): void {
    // if (!columnMapping.numTel) {
    //   throw new BadRequestException(
    //     'Missing mapping for required field: numTel',
    //   );
    // }
    if (!columnMapping.num_client) {
      throw new BadRequestException(
        'Missing mapping for required field: num_client',
      );
    }
  }

  private handleValidationError(
    error: string,
    importResult: ImportResult,
  ): void {
    importResult.failedImports++;

    switch (error) {
      case 'MISSING_PHONE':
        importResult.failedDueToInvalidPhone++;
        break;
      case 'MISSING_CLIENT_NUMBER':
        importResult.failedDueToMissingNumClient++;
        break;
      case 'DUPLICATE_PHONE':
        importResult.duplicatePhoneNumbers++;
        break;
      case 'DUPLICATE_CLIENT_NUMBER':
        importResult.failedDueToDuplicateNumClient++;
        break;
      case 'INVALID_EMAIL':
        importResult.failedDueToInvalidEmail++;
        break;
      default:
        importResult.failedDueToOtherErrors++;
        // Store unique error messages to avoid flooding
        if (!importResult.otherErrorsDetails.includes(error)) {
          importResult.otherErrorsDetails.push(error);
        }
    }
  }

  private initializeImportResult(): ImportResult {
    return {
      totalRecords: 0,
      successfulImports: 0,
      failedImports: 0,
      duplicatePhoneNumbers: 0,
      failedDueToMissingNumClient: 0,
      failedDueToDuplicateNumClient: 0,
      failedDueToInvalidPhone: 0,
      failedDueToInvalidEmail: 0,
      failedDueToDuplicateEmail: 0,
      failedDueToOtherErrors: 0,
      otherErrorsDetails: [],
    };
  }
}
