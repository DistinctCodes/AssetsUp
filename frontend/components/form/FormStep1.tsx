import { useFormContext } from "react-hook-form";
import Input from "./Input";
import Select from "./Select";

const categories = ["Laptop", "Monitor", "Furniture", "Other"];

const FormStep1 = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div>
      <Input
        label="Asset Name"
        {...register("basic.name")}
        error={errors.basic?.name}
      />
      <Input
        label="Asset ID / Serial Number"
        {...register("basic.serialNumber")}
        error={errors.basic?.serialNumber}
      />
      <Select
        label="Category"
        options={categories}
        {...register("basic.category")}
        error={errors.basic?.category}
      />
    </div>
  );
};

export default FormStep1;
