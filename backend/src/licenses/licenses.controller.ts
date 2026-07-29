import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LicensesService } from './licenses.service';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
import { AssignSeatDto } from './dto/assign-seat.dto';

@ApiTags('licenses')
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get()
  @ApiOperation({ summary: 'List software licenses (redacts license keys)' })
  findAll() {
    return this.licensesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a software license' })
  create(@Body() dto: CreateLicenseDto) {
    return this.licensesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get license details' })
  findOne(@Param('id') id: string) {
    return this.licensesService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a license' })
  update(@Param('id') id: string, @Body() dto: UpdateLicenseDto) {
    return this.licensesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a license' })
  delete(@Param('id') id: string) {
    return this.licensesService.delete(id);
  }

  @Post(':id/reveal-key')
  @ApiOperation({
    summary:
      'Reveal the plaintext license key (explicit click-to-reveal action)',
  })
  revealKey(@Param('id') id: string) {
    return this.licensesService.revealKey(id);
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: 'List active seat assignments for a license' })
  getAssignments(@Param('id') id: string) {
    return this.licensesService.getAssignments(id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign a license seat to a user' })
  assign(@Param('id') id: string, @Body() dto: AssignSeatDto) {
    return this.licensesService.assign(id, dto);
  }

  @Post(':id/assignments/:assignmentId/unassign')
  @ApiOperation({ summary: 'Release a seat assignment' })
  unassign(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.licensesService.unassign(id, assignmentId);
  }
}
