import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AssetAssignment } from './entities/asset-assignment.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssetAssignmentsService {
  constructor(
    @InjectRepository(AssetAssignment)
    private readonly assignmentRepository: Repository<AssetAssignment>,
  ) {}

  async assign(createDto: CreateAssignmentDto): Promise<AssetAssignment> {
    // 1. Check if the asset is already actively assigned
    const existingAssignment = await this.assignmentRepository.findOne({
      where: {
        assetId: createDto.assetId,
        unassignmentDate: IsNull(),
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        `Asset with ID "${createDto.assetId}" is already assigned.`,
      );
    }

    if (!createDto.assignedToUserId && !createDto.assignedToDepartmentId) {
      throw new ConflictException(
        'An assignment must have either a user ID or a department ID.',
      );
    }

    // 2. Create the new assignment record
    const newAssignment = this.assignmentRepository.create({
      ...createDto,
      assignmentDate: new Date(),
    });

    return this.assignmentRepository.save(newAssignment);
  }

  async unassign(assetId: string): Promise<AssetAssignment> {
    // Find the current active assignment for the asset
    const currentAssignment = await this.assignmentRepository.findOne({
      where: {
        assetId,
        unassignmentDate: IsNull(),
      },
    });

    if (!currentAssignment) {
      throw new NotFoundException(
        `No active assignment found for asset with ID "${assetId}".`,
      );
    }

    // Mark the assignment as historical by setting the unassignment date
    currentAssignment.unassignmentDate = new Date();
    return this.assignmentRepository.save(currentAssignment);
  }

  async getHistoryForAsset(assetId: string): Promise<AssetAssignment[]> {
    return this.assignmentRepository.find({
      where: { assetId },
      order: { assignmentDate: 'DESC' }, // Show the most recent first
    });
  }

  async getCurrentAssignmentForAsset(
    assetId: string,
  ): Promise<AssetAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { assetId, unassignmentDate: IsNull() },
    });
    if (!assignment) {
      throw new NotFoundException(
        `No active assignment found for asset ID "${assetId}".`,
      );
    }
    return assignment;
  }
}
