import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { Asset } from '../assets/entities/asset.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

export interface LocationWithCounts extends Location {
  assetCount: number;
  totalAssetCount: number;
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  async findAll(): Promise<LocationWithCounts[]> {
    const locations = await this.locationRepo.find();
    const counts = await this.assetRepo
      .createQueryBuilder('asset')
      .select('asset.locationId', 'locationId')
      .addSelect('COUNT(*)', 'count')
      .where('asset.locationId IS NOT NULL')
      .groupBy('asset.locationId')
      .getRawMany<{ locationId: string; count: string }>();

    const directCounts = new Map<string, number>(
      counts.map((c) => [c.locationId, Number(c.count)]),
    );

    const childrenByParent = new Map<string, string[]>();
    for (const loc of locations) {
      const key = loc.parentLocationId ?? '';
      childrenByParent.set(key, [...(childrenByParent.get(key) ?? []), loc.id]);
    }

    const totalCache = new Map<string, number>();
    const computeTotal = (id: string): number => {
      if (totalCache.has(id)) return totalCache.get(id) as number;
      const own = directCounts.get(id) ?? 0;
      const children = childrenByParent.get(id) ?? [];
      const total =
        own + children.reduce((sum, childId) => sum + computeTotal(childId), 0);
      totalCache.set(id, total);
      return total;
    };

    return locations.map((loc) => ({
      ...loc,
      assetCount: directCounts.get(loc.id) ?? 0,
      totalAssetCount: computeTotal(loc.id),
    }));
  }

  async findById(id: string) {
    const loc = await this.locationRepo.findOne({ where: { id } });
    if (!loc) throw new NotFoundException(`Location ${id} not found`);
    return loc;
  }

  async create(dto: CreateLocationDto) {
    if (dto.parentLocationId) {
      await this.findById(dto.parentLocationId);
    }
    const loc = this.locationRepo.create(dto);
    return this.locationRepo.save(loc);
  }

  async update(id: string, dto: UpdateLocationDto) {
    const loc = await this.findById(id);
    if (dto.parentLocationId) {
      if (dto.parentLocationId === id) {
        throw new BadRequestException('A location cannot be its own parent');
      }
      await this.assertNotDescendant(id, dto.parentLocationId);
    }
    Object.assign(loc, dto);
    return this.locationRepo.save(loc);
  }

  async delete(id: string) {
    const loc = await this.findById(id);

    const childCount = await this.locationRepo.count({
      where: { parentLocationId: id },
    });
    if (childCount > 0) {
      throw new ConflictException(
        'This location has child locations. Delete or move them before deleting this location.',
      );
    }

    const assetCount = await this.assetRepo.count({
      where: { locationId: id },
    });
    if (assetCount > 0) {
      throw new ConflictException(
        `This location still has ${assetCount} asset(s) assigned to it. Reassign them before deleting.`,
      );
    }

    return this.locationRepo.remove(loc);
  }

  /** Prevent moving a location underneath one of its own descendants. */
  private async assertNotDescendant(id: string, candidateParentId: string) {
    let current: string | undefined = candidateParentId;
    const visited = new Set<string>();
    while (current) {
      if (current === id) {
        throw new BadRequestException(
          'Cannot move a location under its own descendant',
        );
      }
      if (visited.has(current)) break;
      visited.add(current);
      const parent: Location | null = await this.locationRepo.findOne({
        where: { id: current },
      });
      current = parent?.parentLocationId;
    }
  }
}
