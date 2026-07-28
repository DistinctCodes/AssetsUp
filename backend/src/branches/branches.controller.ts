import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BranchesService } from './branches.service';

@ApiTags('branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List all branches' })
  findAll() {
    return this.branchesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a branch' })
  create(@Body() dto: any) {
    return this.branchesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch details' })
  findOne(@Param('id') id: string) {
    return this.branchesService.findById(id);
  }
}
