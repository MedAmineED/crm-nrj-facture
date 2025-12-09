import { ChangeEvent, useRef } from 'react'
import Button from './ui/Button'

interface FileUploadProps {
  onFilesSelected: (files: FileList) => void
}

export default function FileUpload({ onFilesSelected }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(e.target.files)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept=".pdf"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        variant="outline"
      >
        Upload PDFs
      </Button>
    </div>
  )
}