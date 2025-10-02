import { Controller, Get, Post, Body, Param, Patch, UsePipes, ValidationPipe } from '@nestjs/common';
import { AssetAssignmentsService } from './asset-assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Controller('asset-assignments')
export class AssetAssignmentsController {
  constructor(private readonly assignmentsService: AssetAssignmentsService) {}

  @Post('assign')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  assign(@Body() createDto: CreateAssignmentDto) {
    return this.assignmentsService.assign(createDto);
  }

  @Patch('unassign/:assetId')
  unassign(@Param('assetId') assetId: string) {
    return this.assignmentsService.unassign(assetId);
  }

  @Get('history/:assetId')
  getHistory(@Param('assetId') assetId: string) {
    return this.assignmentsService.getHistoryForAsset(assetId);
  }
  
  @Get('current/:assetId')
  getCurrentAssignment(@Param('assetId') assetId: string) {
      return this.assignmentsService.getCurrentAssignmentForAsset(assetId);
  }
}