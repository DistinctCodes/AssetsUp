"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateCategory, useUpdateCategory } from "@/lib/query/hooks/useAssets";
import { CategoryWithCount } from "@/lib/api/assets";

const schema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  category?: CategoryWithCount;
  onClose: () => void;
}

export function CategoryModal({ category, onClose }: Props) {
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name || "",
      description: category?.description || "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (category) {
        await updateCat.mutateAsync({ id: category.id, data: values });
      } else {
        await createCat.mutateAsync(values);
      }
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Something went wrong.";
      setError("root", { message });
    }
  };

  const isPending = createCat.isPending || updateCat.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {category ? "Edit Category" : "Create Category"}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <Input
            id="name"
            label="Category Name *"
            placeholder="e.g. Laptops"
            {...register("name")}
            error={errors.name?.message}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Optional description..."
              {...register("description")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          {errors.root && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errors.root.message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={isPending}>
              {category ? "Save Changes" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
