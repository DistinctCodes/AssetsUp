@Enitity()
export class CategoryEntity {
  @PrimaryGenarated()
  id: number;

  @string()
  description: string;

  @string()
  performerdBy: string;
}
