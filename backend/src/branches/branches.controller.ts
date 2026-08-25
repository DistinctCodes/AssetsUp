import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { BranchesService } from './branches.service';

@ApiTags('branches')
@ApiBearerAuth('JWT-auth')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List all branches' })
  @ApiResponse({ status: 200, description: 'List of branches' })
  findAll() {
    return this.branchesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a branch' })
  @ApiResponse({ status: 201, description: 'Branch created' })
  create(@Body() dto: any) {
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
  update(@Param('id') id: string, @Body() dto: any) {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiResponse({ status: 200, description: 'Branch deleted' })
  delete(@Param('id') id: string) {
    return this.branchesService.delete(id);
  }
}
