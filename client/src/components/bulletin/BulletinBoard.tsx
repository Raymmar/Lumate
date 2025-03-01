import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, Trophy, Newspaper, ExternalLink, Star } from "lucide-react";

// Community Updates Section
function CommunityUpdates() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community Updates
          </CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start space-x-4 pb-4 border-b last:border-0">
            <div className="flex-1">
              <h4 className="font-medium">New Member Milestone Reached! 🎉</h4>
              <p className="text-sm text-muted-foreground mt-1">
                We've hit 1,000 active community members this month...
              </p>
              <div className="flex items-center mt-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 mr-1" />
                <span>2 days ago</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Member Spotlights Section
function MemberSpotlights() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Member Spotlights
          </CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="flex space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={`https://avatar.vercel.sh/user${i}.png`} />
              <AvatarFallback>MB</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-medium flex items-center gap-2">
                Member Name
                <Badge variant="secondary" className="text-xs">
                  Top Contributor
                </Badge>
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                "Contributing to our community has been an amazing journey..."
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Sponsors Section
function Sponsors() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <Star className="h-5 w-5" />
            Our Sponsors
          </CardTitle>
          <Button variant="ghost" size="sm">
            Become a Sponsor
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center text-center p-4 rounded-lg border">
              <div className="w-16 h-16 bg-muted rounded-lg mb-2" />
              <h4 className="font-medium text-sm">Sponsor {i}</h4>
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Community News
          </CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="group flex items-start space-x-4 pb-4 border-b last:border-0">
            <div className="flex-1">
              <h4 className="font-medium group-hover:text-primary cursor-pointer">
                Exciting New Features Coming Soon!
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Check out what's new in our latest community update...
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">March 1, 2025</span>
                <Button variant="ghost" size="sm" className="h-8">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function BulletinBoard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Community Hub</h2>
          <p className="text-muted-foreground">
            Stay updated with the latest community news and highlights
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <CommunityUpdates />
        <MemberSpotlights />
      </div>
      
      <Sponsors />
      <CommunityNews />
    </div>
  );
}
