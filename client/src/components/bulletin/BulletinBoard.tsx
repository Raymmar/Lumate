import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiInstagram, SiLinkedin, SiYoutube, SiX } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";

// Links Section
function LinksSection() {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Links</CardTitle>
          <div className="flex gap-2">
            <a href="#" className="text-black hover:text-black/80 transition-colors">
              <SiInstagram className="h-4 w-4" />
            </a>
            <a href="#" className="text-black hover:text-black/80 transition-colors">
              <SiX className="h-4 w-4" />
            </a>
            <a href="#" className="text-black hover:text-black/80 transition-colors">
              <SiYoutube className="h-4 w-4" />
            </a>
            <a href="#" className="text-black hover:text-black/80 transition-colors">
              <SiLinkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start font-normal hover:bg-muted">
            Community Guidelines
          </Button>
          <Button variant="outline" className="w-full justify-start font-normal hover:bg-muted">
            Event Calendar
          </Button>
          <Button variant="outline" className="w-full justify-start font-normal hover:bg-muted">
            Resources
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Join Us Section
function JoinUsSection() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Hard-coding the featured event ID for now - this should come from your events data
  const FEATURED_EVENT_ID = "evt-KUEx5csMUv6otHD";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/events/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          event_api_id: FEATURED_EVENT_ID
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send invite');
      }

      toast({
        title: "Success!",
        description: "Please check your email for the invitation.",
      });

      // Set submitted state to true
      setIsSubmitted(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle>Sarasota.Tech</CardTitle>
        <p className="text-muted-foreground mt-1">
          Connecting Sarasota's tech community and driving the city forward.
        </p>
      </CardHeader>
      <CardContent>
        {isSubmitted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Thanks for joining! We've sent an invite to your email for our next event. 
              Once you receive it, you can claim your profile to track your attendance and 
              stay connected with the community.
            </p>
            <p className="text-sm text-muted-foreground">
              Be sure to check your inbox (and spam folder) for the invitation email from Luma.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Email" 
                type="email" 
                className="flex-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
              <Button 
                className="hover:bg-black/90"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Join"
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Drop your email for an invite to our next event and start networking with the region's top tech professionals.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// Featured Section
function FeaturedSection() {
  return (
    <Card className="border relative overflow-hidden h-[300px] group">
      <div 
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596443686812-2f45229eebc3?q=80&w=2070')] 
        bg-cover bg-center"
      />
      <div className="absolute inset-0 bg-black/50" />
      <CardContent className="relative h-full flex flex-col justify-end p-6 text-white">
        <h3 className="text-2xl font-bold mb-2">Join Our Next Tech Meetup</h3>
        <p className="text-white/90 mb-4">
          Connect with fellow tech enthusiasts and industry leaders in Sarasota's growing tech scene.
        </p>
        <Button 
          className="w-fit bg-white text-black hover:bg-white/90 transition-colors"
        >
          Learn More
        </Button>
      </CardContent>
    </Card>
  );
}

// Sponsors Section
function SponsorsSection() {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle>Sponsors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square bg-muted/50 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground"
            >
              Sponsor {i}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Community News Section
function CommunityNews() {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle>Community news</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pb-4 border-b last:border-0">
              <h4 className="font-medium">Community Update {i}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Latest updates and news from our community...
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BulletinBoard() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      return response.json();
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 grid-cols-2">
        <LinksSection />
        <JoinUsSection />
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Events"
          value={statsData?.events || 0}
          icon={Calendar}
          isLoading={isLoading}
          description="Total number of events hosted"
        />
        <StatCard
          title="Total Attendees"
          value={statsData?.totalAttendees || 0}
          icon={Users}
          isLoading={isLoading}
          description="Total event attendance count"
        />
        <StatCard
          title="Unique Attendees"
          value={statsData?.uniqueAttendees || 0}
          icon={Users}
          isLoading={isLoading}
          description="Individual event attendees"
        />
      </div>

      {/* Featured Section */}
      <FeaturedSection />

      <CommunityNews />
      <SponsorsSection />
    </div>
  );
}