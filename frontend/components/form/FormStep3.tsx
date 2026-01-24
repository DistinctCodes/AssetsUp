import { useFormContext } from "react-hook-form";
import Input from "./Input";
import Select from "./Select";

const departments = ["IT", "HR", "Finance", "Marketing"];
const locations = ["HQ", "Branch 1", "Branch 2"];

const FormStep3 = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div>
      <Select
        label="Department"
        options={departments}
        {...register("assignment.department")}
        error={errors.assignment?.department}
      />
      <Select
        label="Location"
        options={locations}
        {...register("assignment.location")}
        error={errors.assignment?.location}
      />
      <Input
        label="Assigned User (optional)"
        {...register("assignment.assignedUser")}
        error={errors.assignment?.assignedUser}
      />
    </div>
  );
};

export default FormStep3;
