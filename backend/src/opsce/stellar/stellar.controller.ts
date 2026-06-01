import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { StellarService } from './stellar.service';
import { TokenizeAssetDto } from './dto/tokenize-asset.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard'; // Assuming JWT auth guard exists
import { RolesGuard } from '../users/guards/roles.guard'; // Assuming roles guard exists
import { Roles } from '../users/decorators/roles.decorator'; // Assuming roles decorator exists
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Asset Tokenization')
@Controller('api/assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StellarController {
  private readonly logger = new Logger(StellarController.name);

  constructor(private readonly stellarService: StellarService) {}

  @Post(':id/tokenize')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Tokenize an asset on Stellar network' })
  @ApiParam({ name: 'id', description: 'Asset UUID', type: 'string' })
  @ApiResponse({
    status: 201,
    description: 'Asset successfully tokenized',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        transactionHash: { type: 'string' },
        contractId: { type: 'string' },
        totalShares: { type: 'string' },
        assetId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async tokenizeAsset(
    @Param('id', ParseUUIDPipe) assetId: string,
    @Body() tokenizeDto: TokenizeAssetDto,
  ) {
    try {
      this.logger.log(`Initiating tokenization for asset: ${assetId}`);

      const result = await this.stellarService.tokenizeAsset(
        assetId,
        tokenizeDto.symbol,
        tokenizeDto.totalShares,
        tokenizeDto.pricePerShare,
        tokenizeDto.metadata,
      );

      this.logger.log(`Tokenization completed for asset: ${assetId}`);

      return {
        success: true,
        message: 'Asset tokenized successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Tokenization failed for asset ${assetId}: ${error.message}`);
      throw new BadRequestException({
        success: false,
        message: 'Failed to tokenize asset',
        error: error.message,
      });
    }
  }

  @Get(':id/tokenization')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get tokenization information for an asset' })
  @ApiParam({ name: 'id', description: 'Asset UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Tokenization information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalSupply: { type: 'string' },
            tokenHoldersCount: { type: 'number' },
            tokensInCirculation: { type: 'string' },
            symbol: { type: 'string' },
            decimals: { type: 'number' },
            tokenizer: { type: 'string' },
            valuation: { type: 'string' },
            holders: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Asset not tokenized' })
  async getTokenizationInfo(@Param('id', ParseUUIDPipe) assetId: string) {
    try {
      this.logger.log(`Fetching tokenization info for asset: ${assetId}`);

      // Check if asset is tokenized
      const isTokenized = await this.stellarService.isAssetTokenized(assetId);
      if (!isTokenized) {
        return {
          success: false,
          message: 'Asset is not tokenized',
          data: null,
        };
      }

      // Get tokenization info
      const tokenInfo = await this.stellarService.getTokenizationInfo(assetId);
      
      // Get token holders
      const holders = await this.stellarService.getTokenHolders(assetId);

      this.logger.log(`Tokenization info retrieved for asset: ${assetId}`);

      return {
        success: true,
        data: {
          ...tokenInfo,
          holders,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get tokenization info for asset ${assetId}: ${error.message}`);
      throw new BadRequestException({
        success: false,
        message: 'Failed to retrieve tokenization information',
        error: error.message,
      });
    }
  }

  @Get(':id/tokenization/holders')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get token holders for an asset' })
  @ApiParam({ name: 'id', description: 'Asset UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Token holders retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getTokenHolders(@Param('id', ParseUUIDPipe) assetId: string) {
    try {
      this.logger.log(`Fetching token holders for asset: ${assetId}`);

      const holders = await this.stellarService.getTokenHolders(assetId);

      return {
        success: true,
        data: holders,
      };
    } catch (error) {
      this.logger.error(`Failed to get token holders for asset ${assetId}: ${error.message}`);
      throw new BadRequestException({
        success: false,
        message: 'Failed to retrieve token holders',
        error: error.message,
      });
    }
  }

  @Get(':id/tokenization/balance/:holderAddress')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get token balance for a specific holder' })
  @ApiParam({ name: 'id', description: 'Asset UUID', type: 'string' })
  @ApiParam({ name: 'holderAddress', description: 'Stellar address of the holder', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Token balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            holderAddress: { type: 'string' },
            balance: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getTokenBalance(
    @Param('id', ParseUUIDPipe) assetId: string,
    @Param('holderAddress') holderAddress: string,
  ) {
    try {
      this.logger.log(`Fetching token balance for asset ${assetId}, holder ${holderAddress}`);

      const balance = await this.stellarService.getTokenBalance(assetId, holderAddress);

      return {
        success: true,
        data: {
          holderAddress,
          balance,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get token balance for asset ${assetId}, holder ${holderAddress}: ${error.message}`,
      );
      throw new BadRequestException({
        success: false,
        message: 'Failed to retrieve token balance',
        error: error.message,
      });
    }
  }
}

