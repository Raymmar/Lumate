import * as React from "react"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ImageIcon, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

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
}

export function UnsplashPicker({ value, onChange }: UnsplashPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

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
          {value ? "Change image" : "Choose from Unsplash"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose an image from Unsplash</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                {debouncedSearch ? "No images found" : "Start typing to search images"}
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
