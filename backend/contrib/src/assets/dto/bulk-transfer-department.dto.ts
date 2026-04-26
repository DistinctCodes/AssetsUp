import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class BulkTransferDepartmentDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];

  @IsUUID('4')
  departmentId: string;
}
