import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LicensesService } from './licenses.service';
import { CreateLicenseDto } from './dtos/create-license.dto';
import { UpdateLicenseDto } from './dtos/update-license.dto';
import { LicenseQueryDto } from './dtos/license-query.dto';

@Controller('licenses')
@UseGuards(AuthGuard('jwt'))
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Post()
  async create(@Body() dto: CreateLicenseDto, @Req() req: any) {
    return this.licensesService.create(dto, req.user?.id);
  }

  @Get()
  async findAll(@Query() query: LicenseQueryDto) {
    return this.licensesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.licensesService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLicenseDto,
    @Req() req: any,
  ) {
    return this.licensesService.update(id, dto, req.user?.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.licensesService.remove(id);
    return { message: 'License deleted successfully' };
  }
}
