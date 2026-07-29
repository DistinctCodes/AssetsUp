import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@ApiBearerAuth('JWT-auth')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  create(@Body() dto: any) {
    return this.categoriesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category details' })
  @ApiResponse({ status: 200, description: 'Category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
