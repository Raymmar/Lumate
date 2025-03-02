import * as React from "react"
import { useCallback, useState } from "react"
import { Input } from "./input"
import { Button } from "./button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onUploadComplete?: (file: { key: string; url: string; name: string }) => void
  className?: string
  uploading?: boolean
  accept?: string
  maxSize?: number // in bytes
}

export const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  ({ className, onUploadComplete, accept, maxSize = 5 * 1024 * 1024, ...props }, ref) => {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const { toast } = useToast()
    const inputRef = React.useRef<HTMLInputElement>(null)

    const handleUpload = useCallback(async (file: File) => {
      if (maxSize && file.size > maxSize) {
        toast({
          title: "Error",
          description: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
          variant: "destructive",
        })
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      try {
        setIsUploading(true)
        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const data = await response.json()
        onUploadComplete?.(data)
        toast({
          title: "Success",
          description: "File uploaded successfully",
        })
      } catch (error) {
        console.error('Upload error:', error)
        toast({
          title: "Error",
          description: "Failed to upload file",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    }, [maxSize, onUploadComplete, toast])

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleUpload(file)
      }
    }, [handleUpload])

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
    }, [])

    const handleClick = useCallback(() => {
      inputRef.current?.click()
    }, [])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleUpload(file)
      }
    }, [handleUpload])

    return (
      <div
        className={cn(
          "relative flex flex-col items-center justify-center w-full min-h-[200px] rounded-lg border-2 border-dashed transition-colors",
          isDragging ? "border-primary bg-muted/50" : "border-muted-foreground/25",
          className
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <Input
          type="file"
          ref={inputRef}
          className="hidden"
          onChange={handleFileChange}
          accept={accept}
          {...props}
        />
        
        <div className="flex flex-col items-center justify-center text-center p-6 space-y-2">
          {isUploading ? (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Drop your file here, or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Maximum file size: {maxSize / 1024 / 1024}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }
)

FileUpload.displayName = "FileUpload"
