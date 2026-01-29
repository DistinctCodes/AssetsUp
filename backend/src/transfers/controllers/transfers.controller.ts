// src/transfers/controllers/transfer.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApprovalRuleService } from '../services/approval-rule.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApproveTransferDto } from '../dto/approve-transfer.dto';
import { CreateApprovalRuleDto } from '../dto/create-approval-rule.dto';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { QueryTransfersDto } from '../dto/query-transfers.dto';
import { RejectTransferDto } from '../dto/reject-transfer.dto';
import { UpdateApprovalRuleDto } from '../dto/update-approval-rule.dto';
import { TransferService } from '../services/transfers.service';

@Controller('api/v1/transfers')
@UseGuards(JwtAuthGuard)
export class TransferController {
  constructor(
    private readonly transferService: TransferService,
    private readonly approvalRuleService: ApprovalRuleService,
  ) {}

  @Post()
  async create(@Body() createTransferDto: CreateTransferDto, @Request() req) {
    return this.transferService.create(createTransferDto, req.user.id);
  }

  @Get()
  async findAll(@Query() query: QueryTransfersDto) {
    return this.transferService.findAll(query);
  }

  @Get('pending-approval')
  async getPendingApprovals(@Request() req) {
    return this.transferService.getPendingApprovals(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.transferService.findOne(id);
  }

  @Put(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveTransferDto,
    @Request() req,
  ) {
    return this.transferService.approve(id, req.user.id, dto);
  }

  @Put(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectTransferDto,
    @Request() req,
  ) {
    return this.transferService.reject(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@Param('id') id: string, @Request() req) {
    await this.transferService.cancel(id, req.user.id);
  }

  @Post(':id/execute')
  async execute(@Param('id') id: string, @Request() req) {
    return this.transferService.executeTransfer(id, req.user.id);
  }

  @Post(':id/undo')
  async undo(@Param('id') id: string, @Request() req) {
    return this.transferService.undoTransfer(id, req.user.id);
  }

  // Approval Rules endpoints
  @Post('approval-rules')
  async createRule(@Body() dto: CreateApprovalRuleDto) {
    return this.approvalRuleService.create(dto);
  }

  @Get('approval-rules')
  async findAllRules() {
    return this.approvalRuleService.findAll();
  }

  @Put('approval-rules/:id')
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateApprovalRuleDto,
  ) {
    return this.approvalRuleService.update(id, dto);
  }

  @Delete('approval-rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Param('id') id: string) {
    await this.approvalRuleService.remove(id);
  }
}
