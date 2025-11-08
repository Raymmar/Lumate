import { Event } from "@shared/schema";
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar, MapPin, Users, RefreshCw, ChevronLeft, ChevronRight, CreditCard, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Person } from "@/components/people/PeopleDirectory";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatUsernameForUrl } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface EventPreviewProps {
  event: Event & { 
    isSynced?: boolean; 
    lastSyncedAt?: string | null;
    lastAttendanceSync?: string | null;
  };
  events?: (Event & { 
    isSynced?: boolean; 
    lastSyncedAt?: string | null;
    lastAttendanceSync?: string | null;
  })[];
  onSync?: (eventId: string) => void;
  onStartSync?: (eventId: string) => void;
  onNavigate?: (event: Event & { 
    isSynced?: boolean; 
    lastSyncedAt?: string | null;
    lastAttendanceSync?: string | null;
  }) => void;
}

export function EventPreview({ event, events = [], onSync, onStartSync, onNavigate }: EventPreviewProps) {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [localSyncStatus, setLocalSyncStatus] = useState({
    isSynced: !!event.lastAttendanceSync,
    lastSyncedAt: event.lastAttendanceSync
  });
  const queryClient = useQueryClient();

  const { data: attendanceData = { attendees: [], total: 0 }, isLoading: isLoadingAttendees } = useQuery({
    queryKey: [`/api/admin/events/${event.api_id}/attendees`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/events/${event.api_id}/attendees`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      return response.json();
    },
    enabled: !!event.api_id
  });

  const attendees = attendanceData.attendees;
  const attendeeCount = attendanceData.total;

  const formatLastSyncTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Never synced";

    try {
      const utcDate = new Date(dateStr + 'Z');

      return formatInTimeZone(
        utcDate,
        event.timezone || 'America/New_York',
        'MMM d, h:mm aa zzz'
      );
    } catch (error) {
      console.error("Invalid date format:", dateStr, error);
      return "Date not available";
    }
  };

  const handleSyncAttendees = async () => {
    setIsSyncing(true);
    if (onStartSync) {
      onStartSync(event.api_id);
    }

    try {
      const response = await fetch(`/api/admin/events/${event.api_id}/guests`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendees');
      }

      const now = new Date().toISOString();
      setLocalSyncStatus({
        isSynced: true,
        lastSyncedAt: now
      });

      if (onSync) {
        onSync(event.api_id);
      }

      toast({
        title: "Success",
        description: "Successfully synced attendees data",
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendees`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendance`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/events/featured"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/events/${event.api_id}/stats`] })
      ]);

    } catch (error) {
      console.error('Error fetching attendees:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync attendees",
        variant: "destructive",
      });

      setLocalSyncStatus({
        isSynced: !!event.lastAttendanceSync,
        lastSyncedAt: event.lastAttendanceSync
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearAttendance = async () => {
    try {
      setLocalSyncStatus({
        isSynced: false,
        lastSyncedAt: null
      });

      queryClient.setQueryData([`/api/admin/events/${event.api_id}/attendees`],
        () => ({ attendees: [], total: 0 })
      );

      const response = await fetch(`/api/admin/events/${event.api_id}/attendance`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to clear attendance');
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendees`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendance`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/events/featured"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/events/${event.api_id}/stats`] })
      ]);

      toast({
        title: "Success",
        description: "Event attendance cleared successfully.",
      });
    } catch (error) {
      console.error('Error clearing attendance:', error);
      toast({
        title: "Error",
        description: "Failed to clear attendance. Please try again.",
        variant: "destructive",
      });

      setLocalSyncStatus({
        isSynced: !!event.lastAttendanceSync,
        lastSyncedAt: event.lastAttendanceSync
      });

      await queryClient.invalidateQueries({ 
        queryKey: [`/api/admin/events/${event.api_id}/attendees`] 
      });
    }
  };

  const hasSyncedAttendees = attendees.length > 0;
  const syncStatus = localSyncStatus.isSynced || hasSyncedAttendees;
  const lastSyncTime = localSyncStatus.lastSyncedAt || event.lastAttendanceSync;

  const currentIndex = events.findIndex(e => e.id === event.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < events.length - 1;

  const handleNavigate = (nextEvent: Event & { 
    isSynced?: boolean; 
    lastSyncedAt?: string | null;
    lastAttendanceSync?: string | null;
  }) => {
    if (onNavigate) {
      onNavigate(nextEvent);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-6 pb-16">
        {event.coverUrl && (
          <div className="relative w-full aspect-video mb-4">
            <img
              src={event.coverUrl}
              alt={event.title}
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute bottom-4 left-4 flex gap-2">
              {event.url && (
                <Button 
                  variant="default" 
                  className="bg-black hover:bg-black/90 text-white"
                  onClick={() => event.url && window.open(event.url, '_blank')}
                >
                  Manage event
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">{event.title}</h2>
            {event.description && (
              <p className="text-muted-foreground line-clamp-2 mb-4">{event.description}</p>
            )}

            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full bg-black hover:bg-black/90 text-white"
                onClick={handleSyncAttendees}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing Attendees...
                  </>
                ) : syncStatus ? (
                  "Re-sync Attendees"
                ) : (
                  "Sync Attendees"
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleClearAttendance}
                disabled={isSyncing || !hasSyncedAttendees}
              >
                Clear Attendance
              </Button>

              <div className="flex items-center justify-center">
                <Badge variant={syncStatus ? "outline" : "secondary"}>
                  {syncStatus ? (
                    <>
                      Synced
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({formatLastSyncTime(lastSyncTime)})
                      </span>
                    </>
                  ) : (
                    "Not synced"
                  )}
                </Badge>
              </div>
            </div>
          </div>

          <PremiumAccessSettings event={event} />

          <Card>
            <CardContent className="p-3 md:p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {formatInTimeZone(
                      new Date(event.startTime + 'Z'),
                      event.timezone || 'America/New_York',
                      'EEEE, MMMM d, yyyy'
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatInTimeZone(new Date(event.startTime + 'Z'), event.timezone || 'America/New_York', 'h:mm a')} - 
                    {formatInTimeZone(new Date(event.endTime + 'Z'), event.timezone || 'America/New_York', 'h:mm a')}
                    {event.timezone && ` (${event.timezone})`}
                  </p>
                </div>
              </div>

              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    {event.location.full_address && (
                      <p className="font-medium">{event.location.full_address}</p>
                    )}
                    {event.location.city && (
                      <p className="text-sm text-muted-foreground">
                        {[
                          event.location.city,
                          event.location.region,
                          event.location.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Event Attendees</h3>
                <Badge variant="secondary">{attendeeCount} registered</Badge>
              </div>

              {isLoadingAttendees ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                  ))}
                </div>
              ) : attendees.length > 0 ? (
                <div className="space-y-2">
                  {attendees.map((person) => {
                    const profilePath = `/people/${encodeURIComponent(formatUsernameForUrl(person.userName, person.api_id))}`;
                    return (
                      <Link 
                        key={person.id} 
                        href={profilePath}
                        className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          {person.avatarUrl ? (
                            <AvatarImage src={person.avatarUrl} alt={person.userName || ''} />
                          ) : (
                            <AvatarFallback>
                              {person.userName?.split(" ").map((n: string) => n[0]).join("") || "?"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">{person.userName || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">{person.email}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attendees found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      {events.length > 1 && onNavigate && (
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 border-t bg-background">
          <div className="flex justify-between items-center max-w-full">
            <Button
              variant="ghost"
              disabled={!hasPrevious}
              onClick={() => handleNavigate(events[currentIndex - 1])}
              className="min-w-[100px] h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="ghost"
              disabled={!hasNext}
              onClick={() => handleNavigate(events[currentIndex + 1])}
              className="min-w-[100px] h-8"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Premium Access Settings Component
function PremiumAccessSettings({ event }: { event: Event & { api_id: string } }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [grantsPremiumAccess, setGrantsPremiumAccess] = useState(false);
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>([]);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string>("");

  // Fetch ticket types and current settings
  const { data: ticketData, isLoading: isLoadingTickets } = useQuery({
    queryKey: [`/api/admin/events/${event.api_id}/ticket-types`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/events/${event.api_id}/ticket-types`);
      if (!response.ok) throw new Error('Failed to fetch ticket types');
      return response.json();
    },
    enabled: !!event.api_id,
  });

  // Load current settings when data is fetched
  useEffect(() => {
    if (ticketData?.event) {
      setGrantsPremiumAccess(ticketData.event.grantsPremiumAccess || false);
      setSelectedTicketTypes(ticketData.event.premiumTicketTypes || []);
      if (ticketData.event.premiumExpiresAt) {
        // Convert to local date string for input
        const date = new Date(ticketData.event.premiumExpiresAt);
        setPremiumExpiresAt(date.toISOString().split('T')[0]);
      } else {
        // Default to end of event year
        const eventYear = new Date(event.startTime).getFullYear();
        setPremiumExpiresAt(`${eventYear}-12-31`);
      }
    }
  }, [ticketData, event.startTime]);

  // Update premium settings mutation
  const updatePremiumSettingsMutation = useMutation({
    mutationFn: async (data: { 
      grantsPremiumAccess: boolean; 
      premiumTicketTypes: string[]; 
      premiumExpiresAt: string 
    }) => {
      const response = await fetch(`/api/admin/events/${event.api_id}/premium-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update premium settings');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.updated 
          ? `Premium settings updated. ${data.updated} users granted premium access.`
          : "Premium settings updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/ticket-types`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update premium settings",
        variant: "destructive",
      });
    },
  });

  const handleTogglePremiumAccess = () => {
    const newValue = !grantsPremiumAccess;
    setGrantsPremiumAccess(newValue);
    
    // If disabling, clear selections and save immediately
    if (!newValue) {
      setSelectedTicketTypes([]);
      updatePremiumSettingsMutation.mutate({
        grantsPremiumAccess: false,
        premiumTicketTypes: [],
        premiumExpiresAt: premiumExpiresAt + 'T23:59:59Z',
      });
    }
  };

  const handleTicketTypeChange = (ticketTypeId: string, checked: boolean) => {
    const newSelection = checked 
      ? [...selectedTicketTypes, ticketTypeId]
      : selectedTicketTypes.filter(id => id !== ticketTypeId);
    
    setSelectedTicketTypes(newSelection);
  };

  const handleSavePremiumSettings = () => {
    if (!premiumExpiresAt) {
      toast({
        title: "Error",
        description: "Please set an expiration date for premium access",
        variant: "destructive",
      });
      return;
    }

    updatePremiumSettingsMutation.mutate({
      grantsPremiumAccess,
      premiumTicketTypes: selectedTicketTypes,
      premiumExpiresAt: premiumExpiresAt + 'T23:59:59Z',
    });
  };

  const ticketTypes = ticketData?.ticketTypes || [];
  const hasTicketTypes = ticketTypes.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle className="text-lg">Premium Access Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="premium-toggle" className="font-medium">
              Grant Premium Access
            </Label>
            <p className="text-sm text-muted-foreground">
              Attendees with selected tickets get premium membership
            </p>
          </div>
          <Switch
            id="premium-toggle"
            checked={grantsPremiumAccess}
            onCheckedChange={handleTogglePremiumAccess}
            disabled={!hasTicketTypes || isLoadingTickets}
          />
        </div>

        {!hasTicketTypes && !isLoadingTickets && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            Sync attendees first to see available ticket types
          </div>
        )}

        {grantsPremiumAccess && hasTicketTypes && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="font-medium">Select Ticket Types</Label>
                <p className="text-sm text-muted-foreground">
                  Choose which tickets grant premium access
                </p>
                {ticketTypes.map((ticket: any) => (
                  <div key={ticket.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={ticket.id}
                      checked={selectedTicketTypes.includes(ticket.id)}
                      onCheckedChange={(checked) => 
                        handleTicketTypeChange(ticket.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={ticket.id}
                      className="text-sm font-normal cursor-pointer flex items-center gap-2"
                    >
                      {ticket.name}
                      {selectedTicketTypes.includes(ticket.id) && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="premium-expires" className="font-medium">
                  Premium Access Expires
                </Label>
                <input
                  id="premium-expires"
                  type="date"
                  value={premiumExpiresAt}
                  onChange={(e) => setPremiumExpiresAt(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  Premium access will expire at the end of this date
                </p>
              </div>

              <Button
                onClick={handleSavePremiumSettings}
                disabled={updatePremiumSettingsMutation.isPending || selectedTicketTypes.length === 0}
                className="w-full"
              >
                {updatePremiumSettingsMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Premium Settings
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}