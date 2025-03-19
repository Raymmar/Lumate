import { useToast } from "@/hooks/use-toast";
import type { Person } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { LinkedUser } from "./LinkedUser";
import { PreviewSidebar } from "./PreviewSidebar";

interface PersonPreviewProps {
  person: Person;
  people?: Person[];
  onNavigate?: (person: Person) => void;
}

export function PersonPreview({ person, people = [], onNavigate }: PersonPreviewProps) {
  const { toast } = useToast();
  const initials = person.userName?.split(' ').map(n => n[0]).join('') || person.email[0].toUpperCase();

  // Find current person index and determine if we have prev/next
  const currentIndex = people.findIndex(p => p.id === person.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < people.length - 1;

  const handlePrevious = () => {
    if (hasPrevious && onNavigate) {
      onNavigate(people[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate) {
      onNavigate(people[currentIndex + 1]);
    }
  };

  return (
    <PreviewSidebar
      open={true}
      onOpenChange={() => {}}
      showNavigation={people.length > 1 && !!onNavigate}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                {person.avatarUrl ? (
                  <AvatarImage src={person.avatarUrl} alt={person.userName || 'Profile'} />
                ) : (
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{person.userName || 'Anonymous'}</h2>
                <p className="text-sm text-muted-foreground">{person.email}</p>
              </div>
            </div>

            {/* Contact Information */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium">Contact Information</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                {person.phoneNumber && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{person.phoneNumber}</span>
                  </div>
                )}
                {person.organizationName && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Organization</span>
                    <span>{person.organizationName}</span>
                  </div>
                )}
                {person.jobTitle && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Job Title</span>
                    <span>{person.jobTitle}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {person.bio && (
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="font-medium">Bio</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{person.bio}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium">Event Statistics</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Total Events Attended</span>
                  <span>{person.stats?.totalEventsAttended || 0}</span>
                </div>
                {person.stats?.firstEventDate && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">First Event</span>
                    <span>{format(new Date(person.stats.firstEventDate), 'PPP')}</span>
                  </div>
                )}
                {person.stats?.lastEventDate && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Last Event</span>
                    <span>{format(new Date(person.stats.lastEventDate), 'PPP')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium">Linked User Account</h3>
              </CardHeader>
              <CardContent>
                <LinkedUser user={person.user} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PreviewSidebar>
  );
}