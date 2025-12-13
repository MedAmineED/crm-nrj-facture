import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Facture } from './entities/facture.entity';
import { Express } from 'express';
import { PDFExtract, PDFExtractResult } from 'pdf.js-extract';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Multer } from 'multer';
import { FilterFactureDto } from './dto/filter-facture.dto';
import { UpdateFactureDto } from './dto/update-facture.dto';
import * as util from 'util';

@Injectable()
export class FactureService {
    private readonly uploadDir = 'uploads/pdfs'; // Configure this path as needed

    constructor(
        @InjectRepository(Facture)
        private factureRepository: Repository<Facture>,
    ) {
        // Ensure upload directory exists
        this.ensureUploadDirExists();
    }

    private ensureUploadDirExists() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    private async savePdfFile(file: Express.Multer.File): Promise<{
        filePath: string;
        originalFilename: string;
    }> {
        try {
            // Generate unique filename
            const fileExtension = path.extname(file.originalname);
            const uniqueFilename = `${uuidv4()}${fileExtension}`;
            const filePath = path.join(this.uploadDir, uniqueFilename);

            // Write file to disk
            await fs.promises.writeFile(filePath, file.buffer);

            return {
                filePath,
                originalFilename: file.originalname,
            };
        } catch (error) {
            console.error('Error saving PDF file:', error);
            throw new Error('Failed to save PDF file');
        }
    }

    async processFiles(files: Express.Multer.File[]) {
        console.log('Processing files ---- ');
        console.log('Processing files:', files.length);
        const results = [];
        const skippedFiles: { filename: string; error: string }[] = [];

        for (let i = 0; i < files.length; i++) {
            let filePath: string | null = null;
            try {
                // Extract PDF data first
                const { fullText, prixUnitaire, textItems } = await this.extractPdfData(
                    files[i],
                );

                console.log('Full Text:', fullText);
                console.log('Text Items (Full):',
                    util.inspect(textItems, {
                        showHidden: false, // Don't show hidden properties
                        depth: null,       // Recursively inspect objects until a limit (null = infinite)
                        maxArrayLength: null, // Display all array elements (null = infinite)
                        // You can also add 'colors: true' if you want colored output
                    })
                );
                console.log('Prix Unitaire:', prixUnitaire);

                const extractedData = this.extractDataFromText(
                    fullText,
                    textItems,
                    prixUnitaire,
                );

                // Save PDF file only if extraction is successful
                const { filePath: savedFilePath, originalFilename } =
                    await this.savePdfFile(files[i]);
                filePath = savedFilePath;

                // Add PDF file information to extracted data
                extractedData['pdf_path'] = filePath;
                extractedData['original_filename'] = originalFilename;
                extractedData['upload_date'] = new Date();

                console.log('Extracted Data:', extractedData);

                // Attempt to save to database
                const facture = this.factureRepository.create(extractedData);
                await this.factureRepository.save(facture);

                results.push(extractedData);
            } catch (error) {
                // Log the error and add to skipped files
                const errorMessage =
                    error instanceof Error ? error.message : 'Unknown error';
                console.error(`Error processing file ${files[i].originalname}:`, error);
                skippedFiles.push({
                    filename: files[i].originalname,
                    error: errorMessage,
                });

                // Clean up the saved PDF file if it exists
                if (filePath && fs.existsSync(filePath)) {
                    try {
                        await fs.promises.unlink(filePath);
                        console.log(`Cleaned up file: ${filePath}`);
                    } catch (cleanupError) {
                        console.error(`Error cleaning up file ${filePath}:`, cleanupError);
                    }
                }
            }
        }

        return {
            countInserted: results.length,
            countSkipped: skippedFiles.length,
            skippedFiles: skippedFiles,
        };
    }

    async getPdfFile(factureId: number): Promise<{
        filePath: string;
        originalFilename: string;
    } | null> {
        try {
            const facture = await this.factureRepository.findOne({
                where: { id: factureId },
                select: ['pdf_path', 'original_filename'],
            });

            if (!facture || !facture.pdf_path) {
                return null;
            }

            // Check if file exists at the path
            if (!fs.existsSync(facture.pdf_path)) {
                console.warn(`PDF file not found at path: ${facture.pdf_path}`);
                return null;
            }

            console.log(
                facture,
                `PDF file found at path: ${facture.pdf_path}, original filename: ${facture.original_filename}`,
            );
            return {
                filePath: facture.pdf_path,
                originalFilename: facture.original_filename || 'document.pdf',
            };
        } catch (error) {
            console.error('Error retrieving PDF file:', error);
            return null;
        }
    }

    async getListFactures(filters?: FilterFactureDto) {
        try {
            const queryBuilder = this.factureRepository.createQueryBuilder('facture');

            if (filters) {
                if (filters.type_facture) {
                    queryBuilder.andWhere('facture.type_facture = :type_facture', {
                        type_facture: filters.type_facture,
                    });
                }
                if (filters.num_client) {
                    queryBuilder.andWhere('facture.num_client LIKE :num_client', {
                        num_client: `%${filters.num_client}%`,
                    });
                }
                if (filters.siret) {
                    queryBuilder.andWhere('facture.siret LIKE :siret', {
                        siret: `%${filters.siret}%`,
                    });
                }
                if (filters.code_naf) {
                    queryBuilder.andWhere('facture.code_naf = :code_naf', {
                        code_naf: filters.code_naf,
                    });
                }
                if (filters.code_postal) {
                    queryBuilder.andWhere('facture.code_postal LIKE :code_postal', {
                        code_postal: `%${filters.code_postal}%`,
                    });
                }
                if (filters.pdl) {
                    queryBuilder.andWhere('facture.pdl LIKE :pdl', {
                        pdl: `%${filters.pdl}%`,
                    });
                }
                if (filters.conso_annuelle) {
                    queryBuilder.andWhere('facture.conso_annuelle LIKE :conso_annuelle', {
                        conso_annuelle: `%${filters.conso_annuelle}%`,
                    });
                }
                if (filters.conso_annuelle_min !== undefined && filters.conso_annuelle_min !== null) {
                    queryBuilder.andWhere('CAST(REGEXP_REPLACE(facture.conso_annuelle, \'[^0-9]\', \'\') AS UNSIGNED) >= :conso_annuelle_min', {
                        conso_annuelle_min: filters.conso_annuelle_min,
                    });
                }
                if (filters.conso_annuelle_max !== undefined && filters.conso_annuelle_max !== null) {
                    queryBuilder.andWhere('CAST(REGEXP_REPLACE(facture.conso_annuelle, \'[^0-9]\', \'\') AS UNSIGNED) <= :conso_annuelle_max', {
                        conso_annuelle_max: filters.conso_annuelle_max,
                    });
                }
                if (filters.montant_ttc_min) {
                    queryBuilder.andWhere('facture.montant_ttc >= :montant_ttc_min', {
                        montant_ttc_min: filters.montant_ttc_min,
                    });
                }
                if (filters.montant_ttc_max) {
                    queryBuilder.andWhere('facture.montant_ttc <= :montant_ttc_max', {
                        montant_ttc_max: filters.montant_ttc_max,
                    });
                }
                if (filters.prix_unitaire_min) {
                    queryBuilder.andWhere('facture.prix_unitaire >= :prix_unitaire_min', {
                        prix_unitaire_min: filters.prix_unitaire_min,
                    });
                }
                if (filters.prix_unitaire_max) {
                    queryBuilder.andWhere('facture.prix_unitaire <= :prix_unitaire_max', {
                        prix_unitaire_max: filters.prix_unitaire_max,
                    });
                }
                if (filters.echeance_start && filters.echeance_end) {
                    queryBuilder.andWhere(
                        'facture.echeance BETWEEN :echeance_start AND :echeance_end',
                        {
                            echeance_start: filters.echeance_start,
                            echeance_end: filters.echeance_end,
                        },
                    );
                }
                if (filters.creation_date_start && filters.creation_date_end) {
                    queryBuilder.andWhere(
                        'facture.creation_date BETWEEN :creation_date_start AND :creation_date_end',
                        {
                            creation_date_start: filters.creation_date_start,
                            creation_date_end: filters.creation_date_end,
                        },
                    );
                }

                if (filters.sortBy) {
                    queryBuilder.orderBy(
                        `facture.${filters.sortBy}`,
                        filters.sortOrder || 'ASC',
                    );
                }

                if (filters.page && filters.limit) {
                    queryBuilder
                        .skip((filters.page - 1) * filters.limit)
                        .take(filters.limit);
                }
            }

            const total = await queryBuilder.getCount();
            const factures = await queryBuilder.getMany();
            return {
                data: factures,
                total,
                page: filters?.page || 1,
                limit: filters?.limit || total,
            };
        } catch (error) {
            console.error('Error retrieving factures:', error);
            throw error;
        }
    }

    async getListFacturesByNumClient(
        num_client: string,
        filters?: FilterFactureDto,
    ) {
        try {
            const queryBuilder = this.factureRepository.createQueryBuilder('facture');
            queryBuilder.andWhere('facture.num_client LIKE :num_client', {
                num_client: `%${num_client}%`,
            });
            if (filters) {
                if (filters.type_facture) {
                    queryBuilder.andWhere('facture.type_facture = :type_facture', {
                        type_facture: filters.type_facture,
                    });
                }
                if (filters.num_client) {
                }
                if (filters.siret) {
                    queryBuilder.andWhere('facture.siret LIKE :siret', {
                        siret: `%${filters.siret}%`,
                    });
                }
                if (filters.code_naf) {
                    queryBuilder.andWhere('facture.code_naf = :code_naf', {
                        code_naf: filters.code_naf,
                    });
                }
                if (filters.code_postal) {
                    queryBuilder.andWhere('facture.code_postal LIKE :code_postal', {
                        code_postal: `%${filters.code_postal}%`,
                    });
                }
                if (filters.pdl) {
                    queryBuilder.andWhere('facture.pdl LIKE :pdl', {
                        pdl: `%${filters.pdl}%`,
                    });
                }
                if (filters.conso_annuelle) {
                    queryBuilder.andWhere('facture.conso_annuelle LIKE :conso_annuelle', {
                        conso_annuelle: `%${filters.conso_annuelle}%`,
                    });
                }
                if (filters.conso_annuelle_min !== undefined && filters.conso_annuelle_min !== null) {
                    queryBuilder.andWhere('CAST(REGEXP_REPLACE(facture.conso_annuelle, \'[^0-9]\', \'\') AS UNSIGNED) >= :conso_annuelle_min', {
                        conso_annuelle_min: filters.conso_annuelle_min,
                    });
                }
                if (filters.conso_annuelle_max !== undefined && filters.conso_annuelle_max !== null) {
                    queryBuilder.andWhere('CAST(REGEXP_REPLACE(facture.conso_annuelle, \'[^0-9]\', \'\') AS UNSIGNED) <= :conso_annuelle_max', {
                        conso_annuelle_max: filters.conso_annuelle_max,
                    });
                }
                if (filters.montant_ttc_min) {
                    queryBuilder.andWhere('facture.montant_ttc >= :montant_ttc_min', {
                        montant_ttc_min: filters.montant_ttc_min,
                    });
                }
                if (filters.montant_ttc_max) {
                    queryBuilder.andWhere('facture.montant_ttc <= :montant_ttc_max', {
                        montant_ttc_max: filters.montant_ttc_max,
                    });
                }
                if (filters.prix_unitaire_min) {
                    queryBuilder.andWhere('facture.prix_unitaire >= :prix_unitaire_min', {
                        prix_unitaire_min: filters.prix_unitaire_min,
                    });
                }
                if (filters.prix_unitaire_max) {
                    queryBuilder.andWhere('facture.prix_unitaire <= :prix_unitaire_max', {
                        prix_unitaire_max: filters.prix_unitaire_max,
                    });
                }
                if (filters.echeance_start && filters.echeance_end) {
                    queryBuilder.andWhere(
                        'facture.echeance BETWEEN :echeance_start AND :echeance_end',
                        {
                            echeance_start: filters.echeance_start,
                            echeance_end: filters.echeance_end,
                        },
                    );
                }
                if (filters.creation_date_start && filters.creation_date_end) {
                    queryBuilder.andWhere(
                        'facture.creation_date BETWEEN :creation_date_start AND :creation_date_end',
                        {
                            creation_date_start: filters.creation_date_start,
                            creation_date_end: filters.creation_date_end,
                        },
                    );
                }

                if (filters.sortBy) {
                    queryBuilder.orderBy(
                        `facture.${filters.sortBy}`,
                        filters.sortOrder || 'ASC',
                    );
                }

                if (filters.page && filters.limit) {
                    queryBuilder
                        .skip((filters.page - 1) * filters.limit)
                        .take(filters.limit);
                }
            }

            const total = await queryBuilder.getCount();
            const factures = await queryBuilder.getMany();
            return {
                data: factures,
                total,
                page: filters?.page || 1,
                limit: filters?.limit || total,
            };
        } catch (error) {
            console.error('Error retrieving factures:', error);
            throw error;
        }
    }

    async updateFacture(
        id: number,
        updateData: Partial<UpdateFactureDto>,
    ): Promise<Facture> {
        const facture = await this.factureRepository.findOne({
            where: { id },
        });

        if (!facture) {
            throw new NotFoundException(`Facture with ID ${id} not found`);
        }

        // Merge the existing entity with the update data
        Object.assign(facture, updateData);

        // Save the updated facture
        return await this.factureRepository.save(facture);
    }

    async deletePdfFile(factureId: number): Promise<boolean> {
        try {
            const facture = await this.factureRepository.findOne({
                where: { id: factureId },
                select: ['pdf_path'],
            });

            if (facture && facture.pdf_path) {
                // Delete file from filesystem
                if (fs.existsSync(facture.pdf_path)) {
                    await fs.promises.unlink(facture.pdf_path);
                }
            }

            // Update database record to remove PDF path
            await this.factureRepository.delete(factureId);

            return true;
        } catch (error) {
            console.error('Error deleting PDF file:', error);
            return false;
        }
    }

    async getAllFacturesWithPdfs() {
        try {
            return await this.factureRepository.find({
                select: [
                    'id',
                    'type_facture',
                    'montant_ttc',
                    'num_client',
                    'siret',
                    'code_naf',
                    'adresse_site',
                    'code_postal',
                    'echeance',
                    'pdl',
                    'conso_annuelle',
                    'prix_unitaire',
                    'pdf_path',
                    'original_filename',
                ],
            });
        } catch (error) {
            console.error('Error retrieving factures:', error);
            throw error;
        }
    }

    async extractPdfData(file: Express.Multer.File) {
        const pdfExtract = new PDFExtract();
        const data: PDFExtractResult = await pdfExtract.extractBuffer(
            file.buffer,
            {},
        );
        let prixUnitaire = 0;
        const textItems: { text: string; x: number; y: number; page: number }[] =
            [];
        let fullText = '';

        for (let pageNum = 0; pageNum < data.pages.length; pageNum++) {
            const page = data.pages[pageNum];

            // Collect text items
            page.content.forEach((item) => {
                textItems.push({
                    text: item.str,
                    x: item.x,
                    y: item.y,
                    page: pageNum + 1,
                });
            });

            // Find prix unitaire
            let prixUnitaireX: number | null = null;
            page.content.forEach((item) => {
                if (item.str.trim() === 'Prix unitaire') {
                    prixUnitaireX = item.x;
                }
            });

            if (prixUnitaireX !== null) {
                for (const item of page.content) {
                    if (item.x > prixUnitaireX) {
                        const valuePU = item.str.split(' ')[0];
                        const normalized = valuePU.replace(',', '.');
                        if (
                            !isNaN(parseFloat(normalized)) &&
                            !isNaN(parseFloat(normalized)) &&
                            /^[-+]?[0-9]*[,.]?[0-9]+$/.test(valuePU)
                        ) {
                            prixUnitaire = parseFloat(normalized);
                            break;
                        }
                    }
                }
                if (prixUnitaire > 0) break; // Exit early if found
            }

            // Build full text
            const textByY: { [key: number]: { text: string; x: number }[] } = {};
            page.content.forEach((item) => {
                const yPos = Math.round(item.y);
                textByY[yPos] = textByY[yPos] || [];
                textByY[yPos].push({ text: item.str, x: item.x });
            });
            Object.keys(textByY)
                .sort((a, b) => Number(b) - Number(a))
                .forEach((yPos) => {
                    const lineText = textByY[yPos]
                        .sort((a, b) => a.x - b.x)
                        .map((item) => item.text)
                        .join(' ');
                    fullText += lineText + '\n';
                });
        }

        return { fullText, prixUnitaire, textItems };
    }

    private extractDataFromText(
        text: string,
        textItems: any[],
        prixUnitaire: number,
    ) {
        const extractedData: any = {};
        const extractValue = (pattern: RegExp, defaultValue = '') => {
            const match = text.match(pattern);
            return match ? match[1].trim() : defaultValue;
        };

        let count = 0;
        let tccIndex = 0;
        textItems.forEach((item, index) => {
            //console only the first montant ttc
            if (item.text.includes('Montant TTC') && count < 1) {
                tccIndex = index;
                count++;
            }
        });

        extractedData['type_facture'] =
            text.includes('électricité') || text.includes('Electricité')
                ? 'Électricité'
                : text.includes('gaz') || text.includes('Gaz')
                    ? 'Gaz'
                    : 'Inconnu';
        const ttcMatch = text.match(/Montant TTC\s*(\d+[,.]\d+\s*)/);
        extractedData['num_client'] = extractValue(
            /Numéro de client\s*[:\-]?\s*([\w\d]+)/,
        )
        if (ttcMatch) {
            extractedData['montant_ttc'] =
                ttcMatch[1].replace(/\s/g, '').replace(',', '.') ?? 0;
        }
        else if (tccIndex > 0) {
            extractedData['montant_ttc'] = (textItems[tccIndex + 2].text.replace(/\s/g, '').replace(',', '.')).split('€')[0] ?? 0;
        }
        const siretMatch =
            text.match(/SIRET\s*[:\-]?\s*([0-9\s]+)/) || text.match(/\b\d{14}\b/);
        if (siretMatch)
            extractedData['siret'] =
                siretMatch[1]?.replace(/\s/g, '') || siretMatch[0];
        extractedData['code_naf'] = extractValue(/Code NAF\s*[:\-]?\s*([\dA-Z]+)/);

        const addressStartIndex = textItems.findIndex(
            (item) => item.text.trim() === 'Votre adresse du site de consommation' || item.text.includes('Adresse et coordonn'),
        );

        if (addressStartIndex !== -1) {
            const addressComponents: string[] = [];
            let count = 0;

            // Loop through the items following the header
            for (
                let i = addressStartIndex + 1;
                i < textItems.length && count < 6; // Increased strictly to 4 to capture multi-line addresses safely
                i++
            ) {
                const itemText = textItems[i].text.trim();

                // FIX 1: Stop reading if we hit the next section keyword (prevents pollution)
                if (itemText.includes('Code NAF') || itemText.includes('N° PCE') || itemText.includes('N° de dépannage')) {
                    break;
                }

                if (itemText) {
                    addressComponents.push(itemText);
                    count++;
                }
            }
            extractedData['adresse_site'] = addressComponents.join(', ');
        }

        if (extractedData['adresse_site']) {
            // FIX 2: Priority Regex. 
            // First, try to match 5 digits followed by a City (Space + Letters).
            // This ensures "37000 TOURS" is picked over "12345" if "12345" was just a weird isolated number.
            let cpMatch = extractedData['adresse_site'].match(/\b(\d{5})\s+[a-zA-Z]/);

            // Fallback: If no city found, just look for the 5 digits alone
            if (!cpMatch) {
                cpMatch = extractedData['adresse_site'].match(/\b(\d{5})\b/);
            }

            if (cpMatch) {
                extractedData['code_postal'] = cpMatch[1];
                extractedData['departement'] = cpMatch[1].slice(0, 2);
            }
        }

        const echeanceMatch = text.match(
            /[ÉE]chéance de votre contrat\s*[:\-]?\s*(\d{2}[.\/]\d{2}[.\/]\d{4})/,
        );
        if (echeanceMatch)
            extractedData['echeance'] = echeanceMatch[1]
                .replace(/\./g, '/')
                .split('/')
                .reverse()
                .join('-')
                .slice(0, 10);

        console.log('Text Items (Full):',
            util.inspect(textItems, {
                showHidden: false, // Don't show hidden properties
                depth: null,       // Recursively inspect objects until a limit (null = infinite)
                maxArrayLength: null, // Display all array elements (null = infinite)
                // You can also add 'colors: true' if you want colored output
            })
        );

        count = 0;
        textItems.forEach((item, index) => {
            if (item.text.includes('N° de PCE') && count < 1) {
                console.log("----FIND pce ---");
                console.log(item.text);
                extractedData['pdl'] = "PCE: " + textItems[index + 2].text;
                console.log("----pce from textItems ---");
                console.log(textItems[index + 2].text);
                extractedData['pdl'] = textItems[index + 2].text;
                count++;
            }
            if (!extractedData['pdl'] && item.text.includes('N° PCE :')) {
                extractedData['pdl'] = "PCE: " + textItems[index - 1].text;
            }
        });


        count = 0;
        textItems.forEach((item, index) => {
            //console only the first montant ttc
            if (item.text.includes('N° de Point de Rel') && count < 1) {
                console.log("----FIND PDL ---");
                console.log(item.text);
                extractedData['pdl'] = "PDL: " + textItems[index + 2].text;
                console.log("----PDL from textItems ---");
                console.log(textItems[index + 2].text);
                extractedData['pdl'] = textItems[index + 2].text;
                count++;
            }
        });

        const consoValues: string[] = [];
        const consoMatch1 = text.match(
            /Consommation annuelle estim[ée]e\s*[:\-]?\s*(\d[\d\s]+)[\s]*kWh/i,
        );
        if (consoMatch1)
            consoValues.push(consoMatch1[1].replace(/\s/g, '') + ' kWh');
        const consoMatch2 = text.match(
            /CAR communiquée par le GRD\s*[:\-]?\s*(\d[\d\s]+)[\s]*kWh/i,
        );
        if (consoMatch2)
            consoValues.push(consoMatch2[1].replace(/\s/g, '') + ' kWh');
        if (consoValues.length)
            extractedData['conso_annuelle'] = consoValues.join(' / ');

        extractedData['prix_unitaire'] = prixUnitaire || 0;

        for (const key in extractedData) {
            if (typeof extractedData[key] === 'string')
                extractedData[key] = extractedData[key].trim();
        }

        return extractedData;
    }
}
