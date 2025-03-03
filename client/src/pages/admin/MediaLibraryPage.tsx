import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadFile, deleteFile, listFiles, type StorageFile } from "@/lib/storage";
import { queryClient } from "@/lib/queryClient";

export default function MediaLibraryPage() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  // Fetch files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["/api/storage/files"],
    queryFn: listFiles
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage/files"] });
      toast({
        title: "Success",
        description: "File deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadFile(file);
      queryClient.invalidateQueries({ queryKey: ["/api/storage/files"] });
      toast({
        title: "Success",
        description: "File uploaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <AdminLayout title="Media Library">
      <div className="space-y-6">
        {/* Upload Section */}
        <div className="flex items-center gap-4">
          <Input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="max-w-xs"
          />
          {uploading && <Upload className="animate-spin h-4 w-4" />}
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <p>Loading...</p>
          ) : files.length === 0 ? (
            <p>No files uploaded yet</p>
          ) : (
            files.map((file) => (
              <div
                key={file.url}
                className="border rounded-lg p-4 space-y-2 group relative"
              >
                {/* Preview */}
                <div className="aspect-square rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>

                {/* File Info */}
                <div className="space-y-1">
                  <p className="text-sm font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {/* Delete Button */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteMutation.mutate(file.url)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
