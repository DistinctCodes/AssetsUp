import {
  IsOptional,
  IsUUID,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'atLeastOneTransferTarget', async: false })
class AtLeastOneTransferTarget implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments): boolean {
    const object = args.object as TransferAssetDto;
    return !!(
      object.assignedTo ||
      object.departmentId ||
      object.locationId
    );
  }

  defaultMessage(): string {
    return 'At least one of assignedTo, departmentId, or locationId must be provided';
  }
}

export class TransferAssetDto {
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @Validate(AtLeastOneTransferTarget)
  _atLeastOneChecker?: boolean;
}
