import { Controller, Get, Post, Body, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { LicensesService } from './services/licenses.service';
import { CreateLicenseDto } from './dto/create-license.dto';

@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createDto: CreateLicenseDto) {
    return this.licensesService.create(createDto);
  }

  @Get('asset/:assetId')
  findAllForAsset(@Param('assetId') assetId: string) {
    return this.licensesService.findAllForAsset(assetId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.licensesService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.licensesService.remove(id);
  }
}