import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetAssignment } from './entities/asset-assignment.entity';
import { AssetAssignmentsService } from './asset-assignments.service';
import { AssetAssignmentsController } from './asset-assignments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AssetAssignment])],
  controllers: [AssetAssignmentsController],
  providers: [AssetAssignmentsService],
})
export class AssetAssignmentsModule {}