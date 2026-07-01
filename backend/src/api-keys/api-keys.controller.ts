import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeysService } from './api-keys.service';

@Controller('api-keys')
@UseGuards(AuthGuard('jwt'))
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  create(
    @Body() body: { name: string; scopes: string[]; expiresAt?: Date },
    @Req() req: any,
  ) {
    return this.apiKeysService.create(
      req.user?.id,
      body.name,
      body.scopes,
      body.expiresAt,
    );
  }

  @Get()
  findAll(@Req() req: any) {
    return this.apiKeysService.findByUser(req.user?.id);
  }

  @Delete(':id')
  revoke(@Param('id') id: string, @Req() req: any) {
    return this.apiKeysService.revoke(id, req.user?.id);
  }
}
