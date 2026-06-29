import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Contract } from './entities/contract.entity';
import { CreateContractDto } from './dtos/create-contract.dto';
import { UpdateContractDto } from './dtos/update-contract.dto';
import { ContractQueryDto } from './dtos/contract-query.dto';

@Injectable()
export class ContractsService {
  private nextNumber: number;

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    private readonly configService: ConfigService,
  ) {
    this.nextNumber = parseInt(
      configService.get<string>('CONTRACT_ID_START', '500'),
      10,
    );
  }

  async create(dto: CreateContractDto, _userId?: string): Promise<Contract> {
    const prefix = this.configService.get<string>('CONTRACT_ID_PREFIX', 'CTR');
    const contractId = `${prefix}-${this.nextNumber++}`;
    const contract = this.contractRepository.create({
      ...dto,
      contractId,
      createdById: _userId,
    });
    return this.contractRepository.save(contract);
  }

  async findAll(
    query: ContractQueryDto,
  ): Promise<{ data: Contract[]; total: number }> {
    const { search, status, vendor, assignedToId, page, limit } = query;
    const qb = this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.createdBy', 'createdBy')
      .leftJoinAndSelect('contract.assignedTo', 'assignedTo');

    if (search) {
      qb.andWhere(
        '(contract.title ILIKE :search OR contract.vendor ILIKE :search OR contract.contractId ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) qb.andWhere('contract.status = :status', { status });
    if (vendor)
      qb.andWhere('contract.vendor ILIKE :vendor', { vendor: `%${vendor}%` });
    if (assignedToId)
      qb.andWhere('contract.assignedToId = :assignedToId', { assignedToId });

    qb.orderBy('contract.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);
    return qb.getManyAndCount().then(([data, total]) => ({ data, total }));
  }

  async findById(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['createdBy', 'assignedTo'],
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async update(
    id: string,
    dto: UpdateContractDto,
    _userId?: string,
  ): Promise<Contract> {
    const contract = await this.findById(id);
    Object.assign(contract, dto);
    return this.contractRepository.save(contract);
  }

  async remove(id: string): Promise<void> {
    const contract = await this.findById(id);
    await this.contractRepository.softDelete(contract.id);
  }
}
