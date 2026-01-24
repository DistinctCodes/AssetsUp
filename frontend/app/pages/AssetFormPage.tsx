import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assetSchema, AssetFormData } from "../schemas/assetSchema";
import FormStep1 from "../../components/form/FormStep1";
import FormStep2 from "../components/form/FormStep2";
import FormStep3 from "../components/form/FormStep3";
import FormStep4 from "../components/form/FormStep4";
import ProgressBar from "../components/ProgressBar";
import { saveToStorage, getFromStorage, clearStorage } from "../utils/storage";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createAsset } from "../utils/api";

const steps = [FormStep1, FormStep2, FormStep3, FormStep4];

const AssetFormPage = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const methods = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: getFromStorage("assetForm") || {},
    mode: "onChange",
  });

  const CurrentStepComponent = steps[currentStep];

  useEffect(() => {
    const subscription = methods.watch((data) => saveToStorage("assetForm", data));
    return () => subscription.unsubscribe();
  }, [methods]);

  const nextStep = async () => {
    const isValid = await methods.trigger();
    if (isValid) setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const onSubmit = async (data: AssetFormData) => {
    try {
      await createAsset(data);
      toast.success("Asset created successfully!");
      clearStorage("assetForm");
      methods.reset();
      setCurrentStep(0);
    } catch (error: any) {
      toast.error(error.message || "Failed to create asset");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <ProgressBar step={currentStep + 1} total={steps.length} />
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <CurrentStepComponent />
          <div className="flex justify-between mt-4">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Back
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="ml-auto px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="ml-auto px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
              >
                Submit
              </button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default AssetFormPage;
