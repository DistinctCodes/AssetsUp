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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dtos/create-contract.dto';
import { UpdateContractDto } from './dtos/update-contract.dto';
import { ContractQueryDto } from './dtos/contract-query.dto';
import { StorageService } from '../storage/storage.service';

@Controller('contracts')
@UseGuards(AuthGuard('jwt'))
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  async create(@Body() dto: CreateContractDto, @Req() _req: any) {
    return this.contractsService.create(dto, _req.user?.id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() _req: any) {
    const key = `contracts/${Date.now()}-${file.originalname}`;
    await this.storageService.upload(file, key);
    const url = await this.storageService.getSignedUrl(key);
    return { key, url };
  }

  @Get()
  async findAll(@Query() query: ContractQueryDto) {
    return this.contractsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contractsService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @Req() _req: any,
  ) {
    return this.contractsService.update(id, dto, _req.user?.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.contractsService.remove(id);
    return { message: 'Contract deleted successfully' };
  }
}
