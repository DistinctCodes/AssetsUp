import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('departments')
@ApiBearerAuth('JWT-auth')
@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly deptService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  @ApiResponse({ status: 200, description: 'List of departments' })
  findAll() {
    return this.deptService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a department' })
  @ApiResponse({ status: 201, description: 'Department created' })
  create(@Body() dto: any) {
    return this.deptService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department details' })
  @ApiResponse({ status: 200, description: 'Department details' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  findOne(@Param('id') id: string) {
    return this.deptService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a department' })
  @ApiResponse({ status: 200, description: 'Department updated' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.deptService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a department' })
  @ApiResponse({ status: 200, description: 'Department deleted' })
  delete(@Param('id') id: string) {
    return this.deptService.delete(id);
  }
}
