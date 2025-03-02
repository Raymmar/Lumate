import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { FileUpload } from "@/components/ui/file-upload"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trash2, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MediaFile {
  key: string
  url: string
  name: string
}

export function MediaLibrary() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: files = [], isLoading } = useQuery<MediaFile[]>({
    queryKey: ['/api/admin/media'],
  })

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await fetch(`/api/admin/media/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to delete file')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/media'] })
      toast({
        title: "Success",
        description: "File deleted successfully",
      })
    },
    onError: (error) => {
      console.error('Delete error:', error)
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      })
    }
  })

  const handleUploadComplete = (file: MediaFile) => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/media'] })
  }

  const handleDelete = async (key: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(key)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Media Library</h2>
      </div>

      <FileUpload
        onUploadComplete={handleUploadComplete}
        accept="image/*"
        maxSize={5 * 1024 * 1024} // 5MB
      />

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Uploaded Files</h3>
        
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : files.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.key}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group hover:bg-muted transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        📄
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {file.key}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No files uploaded yet
          </p>
        )}
      </Card>
    </div>
  )
}
