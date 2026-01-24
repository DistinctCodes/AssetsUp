import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import Select from "./Select";
import FileUpload from "./FileUpload";

const statusOptions = ["active", "inactive"];
const conditionOptions = ["new", "good", "fair", "poor"];

const FormStep4 = () => {
  const { control, formState: { errors } } = useFormContext();
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div>
      <Controller
        control={control}
        name="additional.status"
        render={({ field }) => (
          <Select
            label="Status"
            options={statusOptions}
            {...field}
            error={errors.additional?.status}
          />
        )}
      />
      <Controller
        control={control}
        name="additional.condition"
        render={({ field }) => (
          <Select
            label="Condition"
            options={conditionOptions}
            {...field}
            error={errors.additional?.condition}
          />
        )}
      />
      <Controller
        control={control}
        name="additional.tags"
        render={({ field }) => (
          <input
            type="text"
            placeholder="Comma-separated tags"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200"
            value={field.value?.join(",") || ""}
            onChange={(e) => field.onChange(e.target.value.split(",").map((t) => t.trim()))}
          />
        )}
      />
      <FileUpload
        label="Asset Images"
        onChange={(files) => {
          setFiles(files);
          control.setValue("additional.images", files);
        }}
        error={errors.additional?.images}
      />
    </div>
  );
};

export default FormStep4;
