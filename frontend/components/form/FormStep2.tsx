import { useFormContext } from "react-hook-form";
import Input from "./Input";
import TextArea from "./TextArea";
import DatePicker from "./DatePicker";

const FormStep2 = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div>
      <TextArea
        label="Description"
        {...register("details.description")}
        error={errors.details?.description}
      />
      <DatePicker
        label="Purchase Date"
        {...register("details.purchaseDate")}
        error={errors.details?.purchaseDate}
      />
      <Input
        label="Purchase Price"
        type="number"
        step="0.01"
        {...register("details.purchasePrice", { valueAsNumber: true })}
        error={errors.details?.purchasePrice}
      />
      <DatePicker
        label="Warranty Expiration"
        {...register("details.warrantyExpiration")}
        error={errors.details?.warrantyExpiration}
      />
    </div>
  );
};

export default FormStep2;
