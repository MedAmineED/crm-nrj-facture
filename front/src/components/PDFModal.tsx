import React from 'react';
import Button from './ui/Button';

interface PDFModalProps {
  isOpen: boolean;
  pdfUrl: string;
  onClose: () => void;
}

const PDFModal: React.FC<PDFModalProps> = ({ isOpen, pdfUrl, onClose }) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'invoice.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" style={{height: '100vh'}}>
      <div className="bg-white rounded-lg p-6 w-full max-w-[95%] max-h-[95%] overflow-hidden flex flex-col"  style={{height: '100vh'}}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold">Invoice PDF</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              Print
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        
        {pdfUrl ? (
          <div className="flex-1 min-h-0">
            <iframe
              src={pdfUrl}
              className="w-full h-full border border-gray-200 rounded"
              title="Invoice PDF"
              onError={() => console.error('Error loading PDF')}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFModal;