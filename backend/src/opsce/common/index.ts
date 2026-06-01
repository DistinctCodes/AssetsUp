import { FindManyOptions, Repository, ObjectLiteral } from 'typeorm';
import { PaginationDto } from './dto/pagination.dto';
import { PaginatedResponseDto } from './dto/paginated-response.dto';

export async function paginate<T extends ObjectLiteral>(
  repository: Repository<T>,
  paginationDto: PaginationDto,
  options?: FindManyOptions<T>,
): Promise<PaginatedResponseDto<T>> {
  const { page = 1, limit = 20 } = paginationDto;

  const [data, total] = await repository.findAndCount({
    ...options,
    skip: (page - 1) * limit,
    take: limit,
  });

  return new PaginatedResponseDto<T>(data, total, page, limit);
}

export { PaginationDto, PaginatedResponseDto };
