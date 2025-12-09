import { useState, useCallback, useRef, useEffect } from 'react';
import type { UploadProgress } from '@/entities/upload-progress';
import type { InvoiceUpload } from '@/entities/Invoice';
import InvoiceServices from '@/API/InvoiceServices';
import { API_ENDPOINTS } from '@/API/Urls';

interface UseFileUploadReturn {
  upload: (files: File[]) => Promise<void>;
  progress: UploadProgress | null;
  isUploading: boolean;
  error: string | null;
  cancelUpload: () => void;
}

const POLLING_INTERVAL = 1000; // 1 second

export function useFileUpload(): UseFileUploadReturn {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<number>();
  const isCancelled = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const startPolling = useCallback((sid: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      if (isCancelled.current) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        return;
      }

      try {
        const progress = await InvoiceServices.GetUploadProgress(API_ENDPOINTS.PROCESS, sid);
        setProgress(progress);

        if (!progress.isProcessing) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setIsUploading(false);
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        // Don't stop polling on error - it might be temporary
      }
    }, POLLING_INTERVAL);
  }, []);

  const upload = useCallback(async (files: File[]) => {
    try {
      setError(null);
      setIsUploading(true);
      isCancelled.current = false;

      const invoiceUpload: InvoiceUpload = {
        files
      };

      const response = await InvoiceServices.UploadInvoices(API_ENDPOINTS.PROCESS, invoiceUpload);
      sessionIdRef.current = response.sessionId;
      startPolling(response.sessionId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      setIsUploading(false);
    }
  }, [startPolling]);

  const cancelUpload = useCallback(() => {
    isCancelled.current = true;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setIsUploading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    upload,
    progress,
    isUploading,
    error,
    cancelUpload,
  };
}
