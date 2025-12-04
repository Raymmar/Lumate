import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Ticket, Calendar, Users, Plus, Copy, Check, RefreshCw, Search, X, UserPlus } from "lucide-react";
import { SEO } from "@/components/ui/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDebounce } from "@/hooks/useDebounce";
import type { Coupon } from "@shared/schema";

interface SearchablePerson {
  id: number;
  email: string;
  userName: string | null;
  fullName: string | null;
}

interface CouponStats {
  eventApiId: string;
  eventTitle: string;
  total: number;
  issued: number;
  redeemed: number;
  expired: number;
}

interface FutureEvent {
  api_id: string;
  title: string;
  startTime: string;
  endTime: string;
  coverUrl: string | null;
  url: string | null;
}

interface TicketType {
  id: string;
  name: string;
}

export default function AdminCouponsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<number>(100);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [recipientType, setRecipientType] = useState<'allPremium' | 'individuals'>('allPremium');
  const [selectedPeople, setSelectedPeople] = useState<SearchablePerson[]>([]);
  const [peopleSearchQuery, setPeopleSearchQuery] = useState("");
  const debouncedPeopleSearch = useDebounce(peopleSearchQuery, 300);

  const { data: couponsData, isLoading: isLoadingCoupons } = useQuery<{ coupons: Coupon[]; stats: CouponStats[] }>({
    queryKey: ["/api/admin/coupons"],
  });

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery<{ events: FutureEvent[] }>({
    queryKey: ["/api/admin/coupons/eligible-events"],
  });

  const { data: ticketTypesData, isLoading: isLoadingTicketTypes, refetch: refetchTicketTypes, isFetching: isFetchingTicketTypes } = useQuery<{ ticketTypes: TicketType[]; source: string; event: any }>({
    queryKey: ["/api/admin/events", selectedEventId, "ticket-types"],
    queryFn: async () => {
      if (!selectedEventId) return { ticketTypes: [], source: 'none', event: null };
      const response = await fetch(`/api/admin/events/${selectedEventId}/ticket-types`);
      if (!response.ok) throw new Error("Failed to fetch ticket types");
      return response.json();
    },
    enabled: !!selectedEventId,
  });

  const refreshTicketTypes = async () => {
    if (!selectedEventId) return;
    try {
      const response = await fetch(`/api/admin/events/${selectedEventId}/ticket-types?refresh=true`);
      if (!response.ok) throw new Error("Failed to refresh ticket types");
      const data = await response.json();
      queryClient.setQueryData(["/api/admin/events", selectedEventId, "ticket-types"], data);
      toast({
        title: "Ticket Types Refreshed",
        description: `Found ${data.ticketTypes?.length || 0} ticket types from ${data.source}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh ticket types from Luma",
        variant: "destructive",
      });
    }
  };

  const { data: premiumCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/coupons/premium-members-count"],
  });

  const { data: peopleSearchData, isLoading: isSearchingPeople } = useQuery<{ people: SearchablePerson[] }>({
    queryKey: ["/api/admin/people", "coupon-search", debouncedPeopleSearch],
    queryFn: async () => {
      if (!debouncedPeopleSearch || debouncedPeopleSearch.length < 2) {
        return { people: [] };
      }
      const params = new URLSearchParams({
        page: "1",
        limit: "10",
        search: debouncedPeopleSearch,
      });
      const response = await fetch(`/api/admin/people?${params}`);
      if (!response.ok) throw new Error("Failed to search people");
      const data = await response.json();
      return { people: data.people || [] };
    },
    enabled: recipientType === 'individuals' && debouncedPeopleSearch.length >= 2,
  });

  const generateCouponsMutation = useMutation({
    mutationFn: async (data: {
      eventApiId: string;
      ticketTypeId?: string;
      ticketTypeName?: string;
      discountPercent: number;
      targetGroup?: 'activePremium';
      recipientIds?: number[];
    }) => {
      return apiRequest("/api/admin/coupons/generate", "POST", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({
        title: "Coupons Generated",
        description: `Successfully created ${data.results?.created || 0} coupons`,
      });
      setIsCreateOpen(false);
      setSelectedEventId("");
      setSelectedTicketTypeId("");
      setDiscountPercent(100);
      setRecipientType('allPremium');
      setSelectedPeople([]);
      setPeopleSearchQuery("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate coupons",
        variant: "destructive",
      });
    },
  });

  const handleGenerateCoupons = () => {
    if (!selectedEventId) {
      toast({
        title: "Error",
        description: "Please select an event",
        variant: "destructive",
      });
      return;
    }

    if (recipientType === 'individuals' && selectedPeople.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one person",
        variant: "destructive",
      });
      return;
    }

    const actualTicketTypeId = selectedTicketTypeId === 'all' ? undefined : selectedTicketTypeId;
    const selectedTicket = ticketTypesData?.ticketTypes?.find(t => t.id === actualTicketTypeId);

    const mutationData: {
      eventApiId: string;
      ticketTypeId?: string;
      ticketTypeName?: string;
      discountPercent: number;
      targetGroup?: 'activePremium';
      recipientIds?: number[];
    } = {
      eventApiId: selectedEventId,
      ticketTypeId: actualTicketTypeId,
      ticketTypeName: selectedTicket?.name || undefined,
      discountPercent,
    };

    if (recipientType === 'allPremium') {
      mutationData.targetGroup = 'activePremium';
    } else {
      mutationData.recipientIds = selectedPeople.map(p => p.id);
    }

    generateCouponsMutation.mutate(mutationData);
  };

  const handleAddPerson = (person: SearchablePerson) => {
    if (!selectedPeople.find(p => p.id === person.id)) {
      setSelectedPeople([...selectedPeople, person]);
    }
    setPeopleSearchQuery("");
  };

  const handleRemovePerson = (personId: number) => {
    setSelectedPeople(selectedPeople.filter(p => p.id !== personId));
  };

  const filteredSearchResults = peopleSearchData?.people?.filter(
    p => !selectedPeople.find(sp => sp.id === p.id)
  ) || [];

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied",
      description: "Coupon code copied to clipboard",
    });
  };

  const copyLinkToClipboard = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
    toast({
      title: "Copied",
      description: "Coupon link copied to clipboard",
    });
  };

  const getCouponLink = (coupon: Coupon) => {
    if (coupon.eventUrl) {
      return `${coupon.eventUrl}?coupon=${coupon.code}`;
    }
    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Issued</Badge>;
      case 'redeemed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Redeemed</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const selectedEvent = eventsData?.events?.find(e => e.api_id === selectedEventId);

  return (
    <>
      <SEO 
        title="Manage Coupons - Admin"
        description="Generate and manage event coupons for members"
      />
      <AdminLayout
        title={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Member Coupons</h1>
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-coupons">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Coupons
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Generate Member Coupons</DialogTitle>
                  <DialogDescription>
                    Create discount coupons for all active premium members
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="event">Select Event</Label>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                      <SelectTrigger id="event" data-testid="select-event">
                        <SelectValue placeholder="Choose an upcoming event" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingEvents ? (
                          <div className="p-2 text-center">Loading events...</div>
                        ) : eventsData?.events?.length === 0 ? (
                          <div className="p-2 text-center text-muted-foreground">No upcoming events</div>
                        ) : (
                          eventsData?.events?.map((event) => (
                            <SelectItem key={event.api_id} value={event.api_id}>
                              {event.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedEventId && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="ticketType">Ticket Type (Optional)</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={refreshTicketTypes}
                            disabled={isFetchingTicketTypes}
                            className="h-6 text-xs"
                            data-testid="button-refresh-ticket-types"
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${isFetchingTicketTypes ? 'animate-spin' : ''}`} />
                            Refresh from Luma
                          </Button>
                        </div>
                        <Select value={selectedTicketTypeId} onValueChange={setSelectedTicketTypeId}>
                          <SelectTrigger id="ticketType" data-testid="select-ticket-type">
                            <SelectValue placeholder="All ticket types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All ticket types</SelectItem>
                            {isLoadingTicketTypes || isFetchingTicketTypes ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">Loading ticket types...</div>
                            ) : ticketTypesData?.ticketTypes && ticketTypesData.ticketTypes.length > 0 ? (
                              ticketTypesData.ticketTypes.map((ticketType) => (
                                <SelectItem key={ticketType.id} value={ticketType.id}>
                                  {ticketType.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-center text-sm text-muted-foreground">No ticket types found. Click refresh to fetch from Luma.</div>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {ticketTypesData?.source === 'luma' ? 'Ticket types from Luma' : ticketTypesData?.source === 'database' ? 'Ticket types from past attendance' : ''} - Leave blank to apply discount to any ticket type
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discount">Discount Percentage</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="discount"
                            type="number"
                            min={1}
                            max={100}
                            value={discountPercent}
                            onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 100)}
                            data-testid="input-discount"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          100% = Free ticket
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Recipients</Label>
                        <RadioGroup
                          value={recipientType}
                          onValueChange={(value: 'allPremium' | 'individuals') => {
                            setRecipientType(value);
                            if (value === 'allPremium') {
                              setSelectedPeople([]);
                              setPeopleSearchQuery("");
                            }
                          }}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="allPremium" id="allPremium" data-testid="radio-all-premium" />
                            <Label htmlFor="allPremium" className="font-normal cursor-pointer">
                              All Premium Members ({premiumCountData?.count || 0} people)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="individuals" id="individuals" data-testid="radio-individuals" />
                            <Label htmlFor="individuals" className="font-normal cursor-pointer">
                              Select Specific People
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {recipientType === 'individuals' && (
                        <div className="space-y-2">
                          <Label>Search People</Label>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by name or email..."
                              value={peopleSearchQuery}
                              onChange={(e) => setPeopleSearchQuery(e.target.value)}
                              className="pl-9"
                              data-testid="input-people-search"
                            />
                            {isSearchingPeople && (
                              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          
                          {filteredSearchResults.length > 0 && peopleSearchQuery.length >= 2 && (
                            <div className="border rounded-md max-h-40 overflow-y-auto">
                              {filteredSearchResults.map((person) => (
                                <button
                                  key={person.id}
                                  type="button"
                                  onClick={() => handleAddPerson(person)}
                                  className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
                                  data-testid={`button-add-person-${person.id}`}
                                >
                                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">{person.userName || person.fullName || 'Unknown'}</div>
                                    <div className="text-xs text-muted-foreground">{person.email}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {selectedPeople.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {selectedPeople.map((person) => (
                                <Badge
                                  key={person.id}
                                  variant="secondary"
                                  className="flex items-center gap-1 pr-1"
                                >
                                  {person.userName || person.fullName || person.email}
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePerson(person.id)}
                                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                                    data-testid={`button-remove-person-${person.id}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}

                          {selectedPeople.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {selectedPeople.length} {selectedPeople.length === 1 ? 'person' : 'people'} selected
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerateCoupons}
                    disabled={!selectedEventId || generateCouponsMutation.isPending}
                    data-testid="button-confirm-generate"
                  >
                    {generateCouponsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Coupons"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">About Member Coupons</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Generate unique coupon codes for active premium members</li>
              <li>Each member receives their own single-use code</li>
              <li>Codes are created in Luma and can be used during event registration</li>
              <li>Track redemption status to see which members have claimed their tickets</li>
            </ul>
          </div>

          {isLoadingCoupons ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : couponsData?.stats && couponsData.stats.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {couponsData.stats.map((stat) => (
                  <Card key={stat.eventApiId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{stat.eventTitle}</CardTitle>
                      <CardDescription>{stat.total} coupons generated</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span>{stat.issued} issued</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span>{stat.redeemed} redeemed</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-gray-400" />
                          <span>{stat.expired} expired</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Coupons</CardTitle>
                  <CardDescription>Complete list of generated coupons</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Issued</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {couponsData.coupons.map((coupon) => {
                        const couponLink = getCouponLink(coupon);
                        return (
                          <TableRow key={coupon.id}>
                            <TableCell className="font-medium max-w-[200px] truncate whitespace-nowrap" title={coupon.eventTitle}>{coupon.eventTitle}</TableCell>
                            <TableCell className="whitespace-nowrap truncate max-w-[180px]" title={coupon.recipientEmail}>{coupon.recipientEmail}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => copyToClipboard(coupon.code)}
                                data-testid={`button-copy-code-${coupon.id}`}
                              >
                                {copiedCode === coupon.code ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1 text-green-500" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy Code
                                  </>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {couponLink ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => copyLinkToClipboard(couponLink)}
                                  data-testid={`button-copy-link-${coupon.id}`}
                                >
                                  {copiedLink === couponLink ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1 text-green-500" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copy Link
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{coupon.discountPercent}%</TableCell>
                            <TableCell className="whitespace-nowrap">{getStatusBadge(coupon.status)}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {new Date(coupon.issuedAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No coupons yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Generate coupons for your premium members to attend upcoming events
                </p>
                <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-coupons">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate First Coupons
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
