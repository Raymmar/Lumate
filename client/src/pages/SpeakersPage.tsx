import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { SpeakerGrid } from "@/components/speakers";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search } from "lucide-react";
import { Speaker } from "@shared/schema";

export default function SpeakersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useQuery<{ speakers: Speaker[] }>({
    queryKey: ["/api/speakers"],
  });

  const speakers = data?.speakers || [];

  const filteredSpeakers = speakers.filter((speaker) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      speaker.name.toLowerCase().includes(query) ||
      (speaker.title && speaker.title.toLowerCase().includes(query)) ||
      (speaker.company && speaker.company.toLowerCase().includes(query)) ||
      (speaker.bio && speaker.bio.toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="relative">
            <Input
              placeholder="Search speakers..."
              className="w-full"
              disabled
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Error loading speakers</h3>
            <p className="text-muted-foreground">
              There was a problem loading the speakers directory.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (speakers.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No speakers found</h3>
            <p className="text-muted-foreground">
              There are no speakers in the directory yet.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative w-full min-h-[30vh] bg-cover bg-center mb-6 rounded-lg overflow-hidden shadow-sm flex items-center justify-center" style={{ 
          backgroundImage: "url('https://file-upload.replit.app/api/storage/images%2F1740978938458-STS_Jan%2725-89%20compressed.jpeg')"
        }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/40"></div>
          <div className="relative z-10 w-full max-w-2xl mx-auto py-12 px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Event Speakers
            </h1>
            <p className="text-lg text-white/90 mb-8">
              Meet the thought leaders and innovators speaking at our events.
            </p>
            <div className="w-full max-w-lg mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search speakers..."
                className="w-full bg-white border-0 focus-visible:ring-primary/70 pl-10 text-gray-900 placeholder:text-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-speakers"
              />
            </div>
          </div>
        </div>

        {filteredSpeakers.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No speakers match your search</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms to find what you're looking for.
            </p>
          </div>
        ) : (
          <SpeakerGrid 
            speakers={filteredSpeakers} 
            variant="expanded" 
            columns={3}
            layoutIdPrefix="speakers-page"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
