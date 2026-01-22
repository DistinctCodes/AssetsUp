import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AssetTransfersService } from './asset-transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ApproveTransferDto, RejectTransferDto } from './dto/approve-transfer.dto';
import { TransferFilterDto } from './dto/transfer-filter.dto';

// Mock decorator since we don't have auth implemented yet
const AuthGuard = () => (): any => {};
const GetUser = () => (): any => {};

@Controller('transfers')
export class AssetTransfersController {
  constructor(private readonly assetTransfersService: AssetTransfersService) {}

  @Post()
  @UseGuards(AuthGuard())
  async createTransfer(
    @Body() createTransferDto: CreateTransferDto,
    @GetUser() user: any
  ) {
    return await this.assetTransfersService.createTransfer(createTransferDto, user.id);
  }

  @Get()
  @UseGuards(AuthGuard())
  async getTransfers(
    @Query() filterDto: TransferFilterDto,
    @GetUser() user: any
  ) {
    return await this.assetTransfersService.getTransfers(filterDto, user.id);
  }

  @Get(':id')
  @UseGuards(AuthGuard())
  async getTransferById(@Param('id') id: string) {
    return await this.assetTransfersService.getTransferById(id);
  }

  @Put(':id/approve')
  @UseGuards(AuthGuard())
  async approveTransfer(
    @Param('id') id: string,
    @Body() approveDto: ApproveTransferDto,
    @GetUser() user: any
  ) {
    return await this.assetTransfersService.approveTransfer(id, {
      ...approveDto,
      approvedById: user.id
    });
  }

  @Put(':id/reject')
  @UseGuards(AuthGuard())
  async rejectTransfer(
    @Param('id') id: string,
    @Body() rejectDto: RejectTransferDto,
    @GetUser() user: any
  ) {
    return await this.assetTransfersService.rejectTransfer(id, {
      ...rejectDto,
      rejectedById: user.id
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard())
  async cancelTransfer(@Param('id') id: string, @GetUser() user: any) {
    return await this.assetTransfersService.cancelTransfer(id, user.id);
  }

  @Get('notifications')
  @UseGuards(AuthGuard())
  async getNotifications(@GetUser() user: any) {
    return await this.assetTransfersService.getNotifications(user.id);
  }

  @Put('notifications/:id/read')
  @UseGuards(AuthGuard())
  async markNotificationAsRead(
    @Param('id') notificationId: string,
    @GetUser() user: any
  ) {
    return await this.assetTransfersService.markNotificationAsRead(notificationId, user.id);
  }
}