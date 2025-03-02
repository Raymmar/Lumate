import { useToast } from "@/hooks/use-toast";
import type { Person } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Card,
  CardHeader,
  CardContent
} from "@/components/ui/card";
import { format } from "date-fns";

interface PersonPreviewProps {
  person: Person;
}

export function PersonPreview({ person }: PersonPreviewProps) {
  const { toast } = useToast();
  const initials = person.userName?.split(' ').map(n => n[0]).join('') || person.email[0].toUpperCase();

  return (
    <div className="space-y-6">
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
            <span>{person.stats.totalEventsAttended}</span>
          </div>
          {person.stats.firstEventDate && (
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">First Event</span>
              <span>{format(new Date(person.stats.firstEventDate), 'PPP')}</span>
            </div>
          )}
          {person.stats.lastEventDate && (
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Last Event</span>
              <span>{format(new Date(person.stats.lastEventDate), 'PPP')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
