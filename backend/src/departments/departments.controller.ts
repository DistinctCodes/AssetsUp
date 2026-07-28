import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly deptService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  findAll() {
    return this.deptService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a department' })
  create(@Body() dto: any) {
    return this.deptService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department details' })
  findOne(@Param('id') id: string) {
    return this.deptService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a department' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.deptService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a department' })
  delete(@Param('id') id: string) {
    return this.deptService.delete(id);
  }
}
