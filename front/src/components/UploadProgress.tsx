import React from 'react';
import type { UploadProgress as UploadProgressType } from '@/entities/upload-progress';

interface UploadProgressProps {
  progress: UploadProgressType | null;
  isUploading: boolean;
  onCancel: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ progress, isUploading, onCancel }) => {
  if (!progress || !isUploading) return null;

  const successCount = progress.files.filter(f => f.status === 'success').length;
  const errorCount = progress.files.filter(f => f.status === 'error').length;
  const percentage = (progress.processedFiles / progress.totalFiles) * 100;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white shadow-lg rounded-lg p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-700">Uploading Files</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
        <div>
          <span className="font-medium">{progress.processedFiles}</span>/{progress.totalFiles} Files
        </div>
        <div className="text-green-600">
          <span className="font-medium">{successCount}</span> Success
        </div>
        <div className="text-red-600">
          <span className="font-medium">{errorCount}</span> Failed
        </div>
      </div>

      {/* Batch info */}
      <div className="text-sm text-gray-500">
        Batch {progress.currentBatch} of {progress.totalBatches}
      </div>

      {/* Error list */}
      {errorCount > 0 && (
        <div className="mt-2">
          <div className="text-sm font-medium text-red-600 mb-1">Failed Files:</div>
          <div className="max-h-32 overflow-y-auto">
            {progress.files
              .filter(f => f.status === 'error')
              .map(f => (
                <div key={f.fileName} className="text-sm text-gray-600 mb-1">
                  {f.fileName}
                  {f.error && (
                    <span className="text-xs text-red-500 block">
                      Error: {f.error}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
