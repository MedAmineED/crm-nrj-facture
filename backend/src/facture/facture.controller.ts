import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Get,
  Param,
  Res,
  Delete,
  Query,
  Patch,
  ParseIntPipe,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FactureService } from './facture.service';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import { FilterFactureDto } from './dto/filter-facture.dto';
import { UpdateFactureDto } from './dto/update-facture.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('api')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FactureController {
  constructor(private readonly factureService: FactureService) {}

  @Post('process')
  @UseInterceptors(FilesInterceptor('files'))
  async processFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return this.factureService.processFiles(files);
  }

  @Get('factures')
  async getAllFactures(@Query() filters: FilterFactureDto) {
    return this.factureService.getListFactures(filters);
  }

  @Get(':numclient/factures')
  async getFacturesByNumClient(
    @Param('numclient') numClient: string,
    @Query() filters: FilterFactureDto,
  ) {
    return this.factureService.getListFacturesByNumClient(numClient, filters);
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: number, @Res() res: Response) {
    try {
      const pdfInfo = await this.factureService.getPdfFile(id);
      if (!pdfInfo) {
        return res.status(404).send('PDF not found');
      }

      // Verify file exists
      if (!fs.existsSync(pdfInfo.filePath)) {
        return res.status(404).send('PDF file not found on server');
      }

      // Read file as stream
      const fileStream = fs.createReadStream(pdfInfo.filePath);

      // Set proper headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${pdfInfo.originalFilename}"`,
      );

      // Pipe the file to response
      fileStream.pipe(res);

      // Handle stream errors
      fileStream.on('error', (err) => {
        console.error('Error streaming PDF file:', err);
        res.status(500).send('Error streaming PDF file');
      });
    } catch (error) {
      console.error('Error retrieving PDF:', error);
      res.status(500).send('Internal server error');
    }
  }

  @Get(':id/view')
  async viewPdf(@Param('id') id: number, @Res() res: Response) {
    try {
      const pdfInfo = await this.factureService.getPdfFile(id);

      if (!pdfInfo) {
        throw new NotFoundException('PDF file not found');
      }

      // Check if file exists
      if (!fs.existsSync(pdfInfo.filePath)) {
        throw new NotFoundException('PDF file not found on server');
      }

      // Set proper headers for PDF viewing in browser
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');

      // Stream the file
      const fileStream = fs.createReadStream(pdfInfo.filePath);
      fileStream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to view PDF',
        error: error.message,
      });
    }
  }

  @Patch('factures/:id')
  async updateFacture(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFactureDto: UpdateFactureDto,
  ) {
    return this.factureService.updateFacture(id, updateFactureDto);
  }

  @Delete('factures/:id/pdf')
  async deletePdf(@Param('id') id: number) {
    try {
      const deleted = await this.factureService.deletePdfFile(id);

      if (!deleted) {
        throw new NotFoundException('PDF file not found');
      }

      return {
        status: 'success',
        message: 'PDF file deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to delete PDF',
        error: error.message,
      });
    }
  }
}
