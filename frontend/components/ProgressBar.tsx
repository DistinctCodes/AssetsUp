import { FC } from "react";

interface ProgressBarProps {
  step: number;
  total: number;
}

const ProgressBar: FC<ProgressBarProps> = ({ step, total }) => {
  const percentage = (step / total) * 100;
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
      <div
        className="bg-emerald-500 h-2 rounded-full transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;
