import { FC, useState } from "react";
import { FieldError } from "react-hook-form";

interface FileUploadProps {
  label: string;
  onChange: (files: File[]) => void;
  error?: FieldError;
}

const FileUpload: FC<FileUploadProps> = ({ label, onChange, error }) => {
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    onChange(files);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="file"
        multiple
        onChange={handleFiles}
        className={`mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 ${
          error ? "border-red-500" : ""
        }`}
      />
      <div className="flex mt-2 gap-2">
        {previews.map((src, idx) => (
          <img key={idx} src={src} alt={`preview-${idx}`} className="w-16 h-16 object-cover rounded" />
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
    </div>
  );
};

export default FileUpload;
