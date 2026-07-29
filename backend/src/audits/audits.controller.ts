import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditsService } from './audits.service';
import { CreateAuditSessionDto } from './dto/create-audit-session.dto';
import { RecordAuditItemDto } from './dto/record-audit-item.dto';

@ApiTags('audits')
@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  @ApiOperation({
    summary: 'List audit sessions with scope, status and progress',
  })
  findAll() {
    return this.auditsService.findAll();
  }

  @Post()
  @ApiOperation({
    summary: 'Start an audit session (generates the expected-assets checklist)',
  })
  create(@Body() dto: CreateAuditSessionDto) {
    return this.auditsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an audit session with its checklist and discrepancy summary',
  })
  findOne(@Param('id') id: string) {
    return this.auditsService.findById(id);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({
    summary:
      'Record a checklist item result (Found / Missing / Wrong location / Damaged)',
  })
  recordItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: RecordAuditItemDto,
  ) {
    return this.auditsService.recordItem(id, itemId, dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete the audit session (becomes immutable)' })
  complete(@Param('id') id: string) {
    return this.auditsService.complete(id);
  }
}
