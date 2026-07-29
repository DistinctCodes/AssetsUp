import { PartialType } from '@nestjs/mapped-types';
import { CreateLicenseDto } from './create-license.dto';

export class UpdateLicenseDto extends PartialType(CreateLicenseDto) {}
