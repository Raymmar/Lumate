import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiInstagram, SiLinkedin, SiYoutube, SiX } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar } from "lucide-react";
import { StatCard } from "@/components/StatCard";

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
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle>Sarasota.Tech</CardTitle>
        <p className="text-muted-foreground mt-1">
          Connecting Sarasota's tech community and driving the city forward.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Email" type="email" className="flex-1" />
            <Button className="hover:bg-black/90">Join</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Drop your email for an invite to our next event and start networking with the region's top tech professionals.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Featured Section
function FeaturedSection() {
  return (
    <Card className="border relative overflow-hidden h-[300px] group">
      <div 
        className="absolute inset-0 bg-[url('https://storage.replit.com/v2/user_storage/STS_Jan'25-109 compressed.jpg')] 
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