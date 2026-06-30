
"use client";

import { useState } from "react";
import { X, Download, Upload, FileCheck, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as ExcelJS from "exceljs";
import { AssetStatus, AssetCondition } from "@/lib/query/types/asset";
import { assetApiClient } from "@/lib/api/assets";
import { Button } from "@/components/ui/button";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

const STEPS = {
  DOWNLOAD_TEMPLATE: 1,
  UPLOAD_FILE: 2,
  PREVIEW: 3,
  CONFIRM: 4,
};

export function ImportAssetModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState(STEPS.DOWNLOAD_TEMPLATE);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleDownloadTemplate = () => {
    const headers = [
      "Name",
      "Category",
      "Department",
      "Serial Number",
      "Manufacturer",
      "Model",
      "Location",
      "Condition",
      "Status",
      "Purchase Price",
      "Notes",
    ];
    const csv = Papa.unparse([headers]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "asset_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateData = (data: any[]) => {
    const validationErrors: any[] = [];
    const validRows: any[] = [];

    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      if (!row.Name) {
        rowErrors.push("Name is required");
      }
      if (!row.Category) {
        rowErrors.push("Category is required");
      }
      if (!row.Department) {
        rowErrors.push("Department is required");
      }
      if (row.Status && !Object.values(AssetStatus).includes(row.Status.toUpperCase() as AssetStatus)) {
        rowErrors.push("Invalid status value");
      }
      if (row.Condition && !Object.values(AssetCondition).includes(row.Condition.toUpperCase() as AssetCondition)) {
        rowErrors.push("Invalid condition value");
      }

      if (rowErrors.length > 0) {
        validationErrors.push({ rowIndex: index, errors: rowErrors });
      } else {
        validRows.push(row);
      }
    });

    setErrors(validationErrors);
    setParsedData(data);
    setStep(STEPS.PREVIEW);
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const droppedFile = acceptedFiles[0];
    setFile(droppedFile);

    if (droppedFile.type === "text/csv") {
      Papa.parse(droppedFile, {
        header: true,
        complete: (results) => {
          validateData(results.data);
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result;
        if (buffer) {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer as ArrayBuffer);
          const worksheet = workbook.worksheets[0];
          const jsonData: any[] = [];
          const headerRow = worksheet.getRow(1);
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
              const rowData: any = {};
              row.eachCell((cell, colNumber) => {
                const headerCell = headerRow.getCell(colNumber);
                rowData[headerCell.value as string] = cell.value;
              });
              jsonData.push(rowData);
            }
          });
          validateData(jsonData);
        }
      };
      reader.readAsArrayBuffer(droppedFile);
    }
  };

  const handleImport = async () => {
    if (file) {
      setImporting(true);
      try {
        const result = await assetApiClient.importAssets(file);
        setImportResult(result);
        setStep(STEPS.CONFIRM);
      } catch (error) {
        console.error("Import failed:", error);
        // Handle error state
      } finally {
        setImporting(false);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const renderStep = () => {
    switch (step) {
      case STEPS.DOWNLOAD_TEMPLATE:
        return (
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Download Template</h3>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              Download the template file to ensure your data is in the correct format.
            </p>
            <Button onClick={handleDownloadTemplate}>
              <Download size={16} className="mr-2" />
              Download Template
            </Button>
            <Button onClick={() => setStep(STEPS.UPLOAD_FILE)} variant="outline" className="ml-4">
              Next
            </Button>
          </div>
        );
      case STEPS.UPLOAD_FILE:
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload File</h3>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer ${
                isDragActive ? "border-gray-900 bg-gray-50" : "border-gray-300"
              }`}
            >
              <input {...getInputProps()} />
              <Upload size={48} className="mx-auto text-gray-400" />
              <p className="mt-4 text-sm text-gray-600">
                {isDragActive
                  ? "Drop the files here ..."
                  : "Drag 'n' drop a CSV or XLSX file here, or click to select a file"}
              </p>
              <p className="text-xs text-gray-500 mt-1">Max file size: 5MB</p>
            </div>
          </div>
        );
      case STEPS.PREVIEW:
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preview & Validate</h3>
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex">
                  <AlertCircle size={20} className="mr-2" />
                  <div>
                    <p className="font-bold">{errors.length} rows have errors</p>
                    <p className="text-sm">
                      Please fix the errors in your file and re-upload.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {Object.keys(parsedData[0] || {}).map((header) => (
                      <th key={header} className="text-left px-4 py-3 font-medium text-gray-500">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, i) => {
                    const rowErrors = errors.find((e) => e.rowIndex === i);
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-100 ${
                          rowErrors ? "bg-red-50" : ""
                        }`}
                      >
                        {Object.values(row).map((cell: any, j) => (
                          <td key={j} className="px-4 py-3 text-gray-600">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(STEPS.UPLOAD_FILE)} variant="outline">
                Back
              </Button>
              <Button
                onClick={handleImport}
                className="ml-4"
                disabled={errors.length > 0 || importing}
                loading={importing}
              >
                Confirm Import
              </Button>
            </div>
          </div>
        );
      case STEPS.CONFIRM:
        return (
          <div className="text-center">
            <FileCheck size={48} className="mx-auto text-green-500" />
            <h3 className="text-lg font-medium text-gray-900 mt-4">Import Complete</h3>
            <p className="text-sm text-gray-500 mt-2">
              Successfully imported {importResult?.importedCount} assets.{" "}
              {importResult?.errorCount} rows had errors.
            </p>
            <div className="flex justify-center mt-6">
              <Button onClick={onClose}>Close</Button>
              {importResult?.errorCount > 0 && (
                <Button variant="outline" className="ml-4">
                  Download Error Report
                </Button>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Import Assets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{renderStep()}</div>
      </div>
    </div>
  );
}