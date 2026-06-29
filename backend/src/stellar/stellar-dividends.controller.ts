import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StellarService } from './stellar.service';

@Controller('stellar')
@UseGuards(AuthGuard('jwt'))
export class StellarDividendsController {
  constructor(private readonly stellarService: StellarService) {}

  @Post('assets/:id/dividends/distribute')
  distributeDividends(
    @Param('id') id: string,
    @Body() body: { amount: number; recipients: string[] },
  ) {
    return this.stellarService.distributeDividends(
      id,
      body.amount,
      body.recipients,
    );
  }

  @Post('assets/:id/voting/proposals')
  createProposal(
    @Param('id') id: string,
    @Body() body: { title: string; description: string; options: string[] },
  ) {
    return this.stellarService.createVotingProposal(
      id,
      body.title,
      body.description,
      body.options,
    );
  }

  @Post('assets/:id/voting/proposals/:proposalId/vote')
  castVote(
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
    @Body() body: { vote: string },
    @Req() _req: any,
  ) {
    return this.stellarService.castVote(id, proposalId, body.vote);
  }

  @Get('assets/:id/voting/proposals/:proposalId/results')
  getResults(@Param('id') id: string, @Param('proposalId') proposalId: string) {
    return this.stellarService.getVotingResults(id, proposalId);
  }
}
