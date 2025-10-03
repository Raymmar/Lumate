import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { EventContent } from "@/components/events/EventContent";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatEventTitleForUrl } from "@/lib/utils";
import NotFound from "./not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/ui/seo";

export function EventPage() {
  const { title } = useParams<{ title: string }>();
  const [, setLocation] = useLocation();

  const { data: eventData, isLoading: isEventLoading, error: eventError } = useQuery<Event>({
    queryKey: ["/api/events/by-title", title],
    queryFn: async () => {
      const response = await fetch(`/api/events/by-title/${title}`, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch event: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    }
  });

  const { data: eventsData, isLoading: isEventsLoading } = useQuery<{ events: Event[] }>({
    queryKey: ["/api/events"],
  });

  const events = eventsData?.events || [];
  const event = eventData;

  const handleNavigate = (nextEvent: Event) => {
    const slug = formatEventTitleForUrl(nextEvent.title, nextEvent.api_id);
    setLocation(`/event/${slug}`);
  };

  const handleBackToHome = () => {
    setLocation("/");
  };

  if (isEventLoading || isEventsLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          
          <div className="mt-8">
            <Skeleton className="w-full aspect-video" />
          </div>
          
          <div className="mt-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (eventError || !event) {
    return <NotFound />;
  }

  return (
    <DashboardLayout>
      <SEO
        title={`${event.title} - Sarasota Tech`}
        description={event.description?.substring(0, 155) || `Join us for ${event.title}`}
        image={event.coverUrl || undefined}
      />
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToHome}
            className="gap-2"
            data-testid="button-back-to-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>

        <EventContent
          event={event}
          events={events}
          onNavigate={handleNavigate}
          showNavigation={true}
        />
      </div>
    </DashboardLayout>
  );
}

export default EventPage;
