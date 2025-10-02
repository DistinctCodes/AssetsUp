import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Patch,
  Delete,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { VendorContractsService } from './vendor-contracts.service';
import { CreateVendorContractDto } from './dto/create-vendor-contract.dto';
import { UpdateVendorContractDto } from './dto/update-vendor-contract.dto';
import { QueryVendorContractDto } from './dto/query-vendor-contract.dto';

@Controller('vendor-contracts')
export class VendorContractsController {
  constructor(private readonly service: VendorContractsService) {}

  @Post()
  async create(@Body() dto: CreateVendorContractDto) {
    return this.service.create(dto);
  }

  @Get()
  async findAll(@Query() q: QueryVendorContractDto) {
    const page = q.page ? parseInt(q.page, 10) : 1;
    const limit = q.limit ? parseInt(q.limit, 10) : 20;
    return this.service.findAll({
      supplierId: q.supplierId,
      search: (q as any).search,
      page,
      limit,
    });
  }

  @Get('expiring-soon')
  async expiringSoon(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.service.findExpiringWithin(days);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateVendorContractDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
