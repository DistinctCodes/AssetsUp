import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Asset, AssetStatus, AssetCondition } from '../entities/asset.entity';
import { ImportAssetDto } from './dtos/import-asset.dto';
import { Category } from '../../categories/entities/category.entity';
import { Department } from '../../users/entities/department.entity';
import * as Papa from 'papaparse';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AssetsImportService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly entityManager: EntityManager,
  ) {}

  async import(file: Express.Multer.File, userId: string) {
    const assetsToCreate: ImportAssetDto[] = [];
    const errors = [];

    if (file.mimetype === 'text/csv') {
      const parsed = Papa.parse(file.buffer.toString(), { header: true });
      assetsToCreate.push(...parsed.data as ImportAssetDto[]);
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];
      const headerRow = worksheet.getRow(1);
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const rowData: any = {};
          row.eachCell((cell, colNumber) => {
            const headerCell = headerRow.getCell(colNumber);
            rowData[headerCell.value as string] = cell.value;
          });
          assetsToCreate.push(rowData);
        }
      });
    }

    let importedCount = 0;

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      for (const [index, assetData] of assetsToCreate.entries()) {
        try {
          const category = await this.categoryRepository.findOne({ where: { name: assetData.category } });
          const department = await this.departmentRepository.findOne({ where: { name: assetData.department } });

          if (!category || !department) {
            errors.push({ rowIndex: index, message: 'Invalid category or department' });
            continue;
          }

          const newAsset = this.assetRepository.create({
            ...assetData,
            categoryId: category.id,
            departmentId: department.id,
            createdBy: userId,
            status: assetData.status || AssetStatus.ACTIVE,
            condition: assetData.condition || AssetCondition.NEW,
          });

          await transactionalEntityManager.save(newAsset);
          importedCount++;
        } catch (error) {
          errors.push({ rowIndex: index, message: error.message });
        }
      }
    });

    return {
      importedCount,
      errorCount: errors.length,
      errors,
    };
  }
}