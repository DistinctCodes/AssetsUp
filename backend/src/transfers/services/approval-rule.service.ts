// src/transfers/services/approval-rule.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferApprovalRule } from '../entities/transfer-approval-rule.entity';
import { Transfer } from '../entities/transfer.entity';
import { Role } from '../../roles/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { CreateApprovalRuleDto } from '../dto/create-approval-rule.dto';
import { UpdateApprovalRuleDto } from '../dto/update-approval-rule.dto';

@Injectable()
export class ApprovalRuleService {
  constructor(
    @InjectRepository(TransferApprovalRule)
    private ruleRepository: Repository<TransferApprovalRule>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(dto: CreateApprovalRuleDto): Promise<TransferApprovalRule> {
    const approverRole = await this.roleRepository.findOne({
      where: { id: dto.approverRoleId },
    });
    if (!approverRole) {
      throw new NotFoundException('Approver role not found');
    }

    let approverUser = null;
    if (dto.approverUserId) {
      approverUser = await this.userRepository.findOne({
        where: { id: dto.approverUserId },
      });
      if (!approverUser) {
        throw new NotFoundException('Approver user not found');
      }
    }

    const rule = this.ruleRepository.create({
      name: dto.name,
      description: dto.description,
      conditions: dto.conditions,
      approverRole,
      approverUser,
      isActive: dto.isActive ?? true,
      priority: dto.priority ?? 0,
    });

    return this.ruleRepository.save(rule);
  }

  async findAll(): Promise<TransferApprovalRule[]> {
    return this.ruleRepository.find({
      relations: ['approverRole', 'approverUser'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TransferApprovalRule> {
    const rule = await this.ruleRepository.findOne({
      where: { id },
      relations: ['approverRole', 'approverUser'],
    });

    if (!rule) {
      throw new NotFoundException('Approval rule not found');
    }

    return rule;
  }

  async update(
    id: string,
    dto: UpdateApprovalRuleDto,
  ): Promise<TransferApprovalRule> {
    const rule = await this.findOne(id);

    if (dto.approverRoleId) {
      const approverRole = await this.roleRepository.findOne({
        where: { id: dto.approverRoleId },
      });
      if (!approverRole) {
        throw new NotFoundException('Approver role not found');
      }
      rule.approverRole = approverRole;
    }

    if (dto.approverUserId) {
      const approverUser = await this.userRepository.findOne({
        where: { id: dto.approverUserId },
      });
      if (!approverUser) {
        throw new NotFoundException('Approver user not found');
      }
      rule.approverUser = approverUser;
    }

    Object.assign(rule, {
      name: dto.name ?? rule.name,
      description: dto.description ?? rule.description,
      conditions: dto.conditions ?? rule.conditions,
      isActive: dto.isActive ?? rule.isActive,
      priority: dto.priority ?? rule.priority,
    });

    return this.ruleRepository.save(rule);
  }

  async remove(id: string): Promise<void> {
    const rule = await this.findOne(id);
    await this.ruleRepository.remove(rule);
  }

  async evaluateRules(transfer: Transfer): Promise<boolean> {
    const activeRules = await this.ruleRepository.find({
      where: { isActive: true },
      relations: ['approverRole', 'approverUser'],
      order: { priority: 'DESC' },
    });

    if (activeRules.length === 0) {
      return false; // No rules = no approval required
    }

    for (const rule of activeRules) {
      if (await this.matchesRule(transfer, rule)) {
        return true; // At least one rule matched
      }
    }

    return false;
  }

  async getMatchingRules(transfer: Transfer): Promise<TransferApprovalRule[]> {
    const activeRules = await this.ruleRepository.find({
      where: { isActive: true },
      relations: ['approverRole', 'approverUser'],
      order: { priority: 'DESC' },
    });

    const matchingRules = [];
    for (const rule of activeRules) {
      if (await this.matchesRule(transfer, rule)) {
        matchingRules.push(rule);
      }
    }

    return matchingRules;
  }

  private async matchesRule(
    transfer: Transfer,
    rule: TransferApprovalRule,
  ): Promise<boolean> {
    const conditions = rule.conditions;
    const requiresAll = conditions.requiresAllConditions ?? false;

    const checks: boolean[] = [];

    // Check minimum value
    if (conditions.minValue !== undefined && conditions.minValue !== null) {
      const totalValue = transfer.assets.reduce(
        (sum, asset) => sum + (asset.value || 0),
        0,
      );
      checks.push(totalValue >= conditions.minValue);
    }

    // Check maximum value
    if (conditions.maxValue !== undefined && conditions.maxValue !== null) {
      const totalValue = transfer.assets.reduce(
        (sum, asset) => sum + (asset.value || 0),
        0,
      );
      checks.push(totalValue <= conditions.maxValue);
    }

    // Check categories
    if (conditions.categories && conditions.categories.length > 0) {
      const hasMatchingCategory = transfer.assets.some((asset) =>
        conditions.categories.includes(asset.category?.name),
      );
      checks.push(hasMatchingCategory);
    }

    // Check departments
    if (conditions.departments && conditions.departments.length > 0) {
      const matchesDepartment =
        (transfer.fromDepartment &&
          conditions.departments.includes(transfer.fromDepartment.name)) ||
        (transfer.toDepartment &&
          conditions.departments.includes(transfer.toDepartment.name));
      checks.push(matchesDepartment);
    }

    // If no conditions were checked, return false
    if (checks.length === 0) {
      return false;
    }

    // Apply AND or OR logic
    return requiresAll ? checks.every((c) => c) : checks.some((c) => c);
  }
}
