import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

// Links Section
function LinksSection() {
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle>Links</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start font-normal">
            Community Guidelines
          </Button>
          <Button variant="outline" className="w-full justify-start font-normal">
            Event Calendar
          </Button>
          <Button variant="outline" className="w-full justify-start font-normal">
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
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle>Join us</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input placeholder="Email" type="email" className="flex-1" />
          <Button>Join</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Member Spotlight Section
function MemberSpotlight() {
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle>Member spotlight</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback>UN</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">Username</div>
            <p className="text-sm text-muted-foreground">Active Member</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sponsors Section
function SponsorsSection() {
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle>Sponsors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="aspect-square bg-muted/50 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground"
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
    <Card className="border-2">
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sarasota.Tech</h1>
        <p className="text-muted-foreground">
          Connecting Sarasota's tech community and driving the city forward.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-2">
        <LinksSection />
        <JoinUsSection />
      </div>

      <div className="grid gap-6 grid-cols-2">
        <MemberSpotlight />
        <SponsorsSection />
      </div>

      <CommunityNews />
    </div>
  );
}