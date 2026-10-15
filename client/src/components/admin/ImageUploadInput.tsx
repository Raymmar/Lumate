import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadInputProps {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  "data-testid"?: string;
}

/** Image URL box with an Upload button and a small preview. */
export function ImageUploadInput({
  id,
  value,
  onChange,
  placeholder = "Upload or paste an image URL",
  readOnly,
  className,
  "data-testid": testId,
}: ImageUploadInputProps) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload/file", { method: "POST", body: formData });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      onChange(data.url);
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Couldn't upload image", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      {value && <img src={value} alt="" className="h-9 w-9 shrink-0 rounded border object-cover" />}
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        className={className}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      />
      {!readOnly && (
        <>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            data-testid={testId ? `${testId}-upload` : undefined}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span className="ml-1">Upload</span>
          </Button>
        </>
      )}
    </div>
  );
}
