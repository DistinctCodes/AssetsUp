'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Asset } from '@/lib/query/types';

interface TransferFormData {
  assetIds: string[];
  transferType: 'change_user' | 'change_department' | 'change_location' | 'all';
  destinationUserId?: string;
  destinationDepartmentId?: number;
  destinationLocation?: string;
  reason: string;
  notes?: string;
  approvalRequired: boolean;
  scheduledDate?: string;
}

interface TransferFormProps {
  assets: Asset[];
  users: any[];
  departments: any[];
  onSubmit: (data: TransferFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TransferForm: React.FC<TransferFormProps> = ({
  assets,
  users,
  departments,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  
  const { control, handleSubmit, watch, formState: { errors } } = useForm<TransferFormData>({
    defaultValues: {
      assetIds: [],
      transferType: 'change_user',
      approvalRequired: false
    }
  });

  const transferType = watch('transferType');
  const approvalRequired = watch('approvalRequired');

  const totalSteps = 4;

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Assets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {assets.map(asset => (
                  <div
                    key={asset.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedAssets.includes(asset.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleAssetToggle(asset.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedAssets.includes(asset.id)}
                        onChange={() => {}}
                        className="mr-3 h-4 w-4 text-blue-600"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{asset.name}</h4>
                        <p className="text-sm text-gray-500">{asset.category}</p>
                        <p className="text-xs text-gray-400">ID: {asset.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {errors.assetIds && (
                <p className="mt-2 text-sm text-red-600">{errors.assetIds.message}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Transfer Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Type *
                  </label>
                  <Controller
                    name="transferType"
                    control={control}
                    rules={{ required: 'Transfer type is required' }}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="change_user">Change User</option>
                        <option value="change_department">Change Department</option>
                        <option value="change_location">Change Location</option>
                        <option value="all">All Changes</option>
                      </select>
                    )}
                  />
                </div>

                {transferType === 'change_user' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination User *
                    </label>
                    <Controller
                      name="destinationUserId"
                      control={control}
                      rules={{ required: 'Destination user is required' }}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a user</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>
                )}

                {transferType === 'change_department' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination Department *
                    </label>
                    <Controller
                      name="destinationDepartmentId"
                      control={control}
                      rules={{ required: 'Destination department is required' }}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a department</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>
                )}

                {transferType === 'change_location' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination Location *
                    </label>
                    <Controller
                      name="destinationLocation"
                      control={control}
                      rules={{ required: 'Destination location is required' }}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="Enter location"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Date
                  </label>
                  <Controller
                    name="scheduledDate"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reason and Notes</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Transfer *
                  </label>
                  <Controller
                    name="reason"
                    control={control}
                    rules={{ required: 'Reason is required' }}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={4}
                        placeholder="Please provide a reason for this transfer..."
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  />
                  {errors.reason && (
                    <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={3}
                        placeholder="Any additional information..."
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  />
                </div>

                <div className="flex items-center">
                  <Controller
                    name="approvalRequired"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    )}
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Requires Approval (for high-value assets)
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Review Transfer</h3>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Selected Assets ({selectedAssets.length})</h4>
                  <ul className="mt-2 space-y-1">
                    {selectedAssets.map(assetId => {
                      const asset = assets.find(a => a.id === assetId);
                      return (
                        <li key={assetId} className="text-sm text-gray-600">
                          • {asset?.name}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Transfer Type:</span>
                    <p className="text-gray-600 capitalize">
                      {transferType.replace('_', ' ')}
                    </p>
                  </div>
                  
                  {watch('destinationUserId') && (
                    <div>
                      <span className="font-medium text-gray-700">Destination User:</span>
                      <p className="text-gray-600">
                        {users.find(u => u.id === watch('destinationUserId'))?.name}
                      </p>
                    </div>
                  )}
                  
                  {watch('destinationDepartmentId') && (
                    <div>
                      <span className="font-medium text-gray-700">Destination Dept:</span>
                      <p className="text-gray-600">
                        {departments.find(d => d.id === watch('destinationDepartmentId'))?.name}
                      </p>
                    </div>
                  )}
                  
                  {watch('destinationLocation') && (
                    <div>
                      <span className="font-medium text-gray-700">Destination:</span>
                      <p className="text-gray-600">{watch('destinationLocation')}</p>
                    </div>
                  )}

                  <div>
                    <span className="font-medium text-gray-700">Reason:</span>
                    <p className="text-gray-600">{watch('reason')}</p>
                  </div>

                  {watch('scheduledDate') && (
                    <div>
                      <span className="font-medium text-gray-700">Scheduled Date:</span>
                      <p className="text-gray-600">
                        {new Date(watch('scheduledDate')).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="font-medium text-gray-700">Approval Required:</span>
                    <p className="text-gray-600">
                      {approvalRequired ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    if (currentStep === 1) {
      return selectedAssets.length > 0;
    }
    if (currentStep === 2) {
      if (transferType === 'change_user') {
        return !!watch('destinationUserId');
      }
      if (transferType === 'change_department') {
        return !!watch('destinationDepartmentId');
      }
      if (transferType === 'change_location') {
        return !!watch('destinationLocation');
      }
    }
    if (currentStep === 3) {
      return !!watch('reason');
    }
    return true;
  };

  const handleFormSubmit = (data: TransferFormData) => {
    onSubmit({
      ...data,
      assetIds: selectedAssets
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Asset Transfer Request</h2>
          <span className="text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        
        <div className="flex items-center">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`flex-1 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={currentStep === 1 ? onCancel : prevStep}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!isStepValid()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Transfer Request'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TransferForm;