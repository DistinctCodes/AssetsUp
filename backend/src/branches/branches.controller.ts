import { Controller, Get, Patch, Post, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@ApiTags('branches')
@ApiBearerAuth('JWT-auth')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List all branches' })
  @ApiResponse({ status: 200, description: 'Paginated list of branches' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.branchesService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a branch' })
  @ApiResponse({ status: 201, description: 'Branch created' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch details' })
  @ApiResponse({ status: 200, description: 'Branch details' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  findOne(@Param('id') id: string) {
    return this.branchesService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiResponse({ status: 200, description: 'Branch updated' })
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }
}