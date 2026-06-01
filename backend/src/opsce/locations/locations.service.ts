import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Asset, AssetStatus } from '../assets/entities/asset.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async create(createLocationDto: CreateLocationDto): Promise<Location> {
    // Validate parent exists if parentId is provided
    if (createLocationDto.parentId) {
      const parent = await this.locationRepository.findOne({
        where: { id: createLocationDto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent location not found');
      }
    }

    const location = this.locationRepository.create(createLocationDto);
    return this.locationRepository.save(location);
  }

  async findAll(type?: string): Promise<(Location & { childCount: number })[]> {
    const queryBuilder = this.locationRepository.createQueryBuilder('location');

    if (type) {
      queryBuilder.andWhere('location.type = :type', { type });
    }

    const locations = await queryBuilder
      .orderBy('location.name', 'ASC')
      .getMany();

    // Add childCount to each location
    return locations.map((loc) => {
      const childCount = locations.filter((l) => l.parentId === loc.id).length;
      return { ...loc, childCount } as Location & { childCount: number };
    });
  }

  async findOne(id: string): Promise<Location & { assetCount: number }> {
    const location = await this.locationRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    // Get asset count for this location
    const assetCount = await this.assetRepository.count({
      where: { locationId: id, status: AssetStatus.ACTIVE },
    });

    return { ...location, assetCount } as Location & { assetCount: number };
  }

  async update(
    id: string,
    updateLocationDto: UpdateLocationDto,
  ): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    // Validate parent exists if parentId is being updated
    if (updateLocationDto.parentId) {
      // Prevent setting parent to itself
      if (updateLocationDto.parentId === id) {
        throw new BadRequestException('Location cannot be its own parent');
      }

      const parent = await this.locationRepository.findOne({
        where: { id: updateLocationDto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent location not found');
      }

      // Prevent circular references
      await this.checkCircularReference(id, updateLocationDto.parentId);
    }

    Object.assign(location, updateLocationDto);
    return this.locationRepository.save(location);
  }

  async remove(id: string): Promise<void> {
    const location = await this.locationRepository.findOne({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    // Check if location has active assets
    const activeAssetCount = await this.assetRepository.count({
      where: { locationId: id, status: AssetStatus.ACTIVE },
    });

    if (activeAssetCount > 0) {
      throw new ConflictException(
        `Cannot delete location with ${activeAssetCount} active asset(s)`,
      );
    }

    await this.locationRepository.remove(location);
  }

  /**
   * Check for circular references in location hierarchy
   */
  private async checkCircularReference(
    locationId: string,
    newParentId: string,
  ): Promise<void> {
    let currentParentId: string | null = newParentId;

    while (currentParentId) {
      if (currentParentId === locationId) {
        throw new BadRequestException(
          'Circular reference detected: cannot set parent to a child location',
        );
      }

      const parent = await this.locationRepository.findOne({
        where: { id: currentParentId },
      });

      currentParentId = parent?.parentId ?? null;
    }
  }
}
