import * as React from "react"
import { useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ImageIcon, ExternalLink, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

interface UnsplashImage {
  id: string
  urls: {
    regular: string
    small: string
  }
  user: {
    name: string
    username: string
  }
  links: {
    html: string
  }
}

interface UnsplashPickerProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
}

export function UnsplashPicker({ value, onChange, className }: UnsplashPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['/api/unsplash/search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return { results: [] }
      const response = await fetch(`/api/unsplash/search?query=${encodeURIComponent(debouncedSearch)}`)
      if (!response.ok) throw new Error('Failed to fetch images')
      return response.json() as Promise<{ results: UnsplashImage[] }>
    },
    enabled: open && debouncedSearch.length > 0
  })

  const handleSelect = (image: UnsplashImage) => {
    onChange?.(image.urls.regular)
    setOpen(false)
  }

  const validateFile = (file: File): boolean => {
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "File size exceeds 5MB limit",
        variant: "destructive"
      });
      return false;
    }

    // Check file format
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Only JPEG and PNG formats are supported",
        variant: "destructive"
      });
      return false;
    }

    return true;
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!validateFile(file)) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload/file', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      onChange?.(data.url)
      setOpen(false)
      toast({
        title: "Success",
        description: "Image uploaded successfully"
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      })
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          {value ? (
            <img 
              src={value} 
              alt="Selected image"
              className="h-8 w-8 rounded object-cover mr-2"
            />
          ) : (
            <ImageIcon className="h-4 w-4 mr-2" />
          )}
          {value ? "Change image" : "Choose image"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose an image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Section */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload from Computer
            </Button>
            <p className="text-xs text-muted-foreground">
              Supported formats: JPEG, PNG • Max file size: 5MB
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png"
              className="hidden"
            />
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Or search Unsplash images..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="h-[500px] rounded-md border">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4 p-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3]" />
              ))}
            </div>
          ) : !data?.results.length ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                {debouncedSearch ? "No images found" : "Search Unsplash or upload your own image"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 p-4">
              {data.results.map((image) => (
                <div key={image.id} className="group relative aspect-[4/3] cursor-pointer">
                  <img
                    src={image.urls.small}
                    alt={`Photo by ${image.user.name}`}
                    className="h-full w-full rounded-lg object-cover transition-opacity group-hover:opacity-90"
                    onClick={() => handleSelect(image)}
                  />
                  <a
                    href={image.links.html}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 left-2 right-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1 rounded"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Photo by {image.user.name} on Unsplash
                    <ExternalLink className="inline-block h-3 w-3 ml-1" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}