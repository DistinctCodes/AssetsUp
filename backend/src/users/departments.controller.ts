import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';

@Controller('departments')
@UseGuards(AuthGuard('jwt'))
export class DepartmentsController {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  @Get()
  async findAll() {
    return this.departmentRepository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.departmentRepository.findOne({ where: { id } });
  }

  @Post()
  async create(@Body() dto: CreateDepartmentDto) {
    const department = this.departmentRepository.create(dto);
    return this.departmentRepository.save(department);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    await this.departmentRepository.update(id, dto);
    return this.departmentRepository.findOne({ where: { id } });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.departmentRepository.delete(id);
    return { message: 'Department deleted' };
  }
}
