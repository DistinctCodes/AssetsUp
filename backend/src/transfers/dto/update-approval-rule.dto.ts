import { PartialType } from '@nestjs/mapped-types';
import { CreateApprovalRuleDto } from './create-approval-rule.dto';

export class UpdateApprovalRuleDto extends PartialType(CreateApprovalRuleDto) {}
