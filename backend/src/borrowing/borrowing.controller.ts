import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BorrowingService } from './borrowing.service';
import { CheckOutDto } from './dto/check-out.dto';
import { CheckInDto } from './dto/check-in.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@ApiTags('Borrowing')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('borrowing')
export class BorrowingController {
  constructor(private readonly service: BorrowingService) {}

  @Get()
  @ApiOperation({ summary: 'List all borrowing records' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a borrowing record by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Check out an asset' })
  checkOut(@Body() dto: CheckOutDto, @CurrentUser() user: User) {
    return this.service.checkOut(dto, user);
  }

  @Post(':id/checkin')
  @ApiOperation({ summary: 'Check in (return) an asset' })
  checkIn(@Param('id') id: string, @Body() dto: CheckInDto, @CurrentUser() user: User) {
    return this.service.checkIn(id, dto, user);
  }
}
