import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Ticket, Plus, Copy, Check, RefreshCw, Search, X, UserPlus, ChevronDown, ChevronRight, Filter, Users, Infinity, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { SearchInput } from "@/components/admin/SearchInput";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  const [discountType, setDiscountType] = useState<'percent' | 'dollars'>('percent');
  const [discountPercent, setDiscountPercent] = useState<number>(100);
  const [dollarOff, setDollarOff] = useState<number>(10);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [recipientMode, setRecipientMode] = useState<'allPremium' | 'individuals' | 'general'>('allPremium');
  const [selectedPeople, setSelectedPeople] = useState<SearchablePerson[]>([]);
  const [peopleSearchQuery, setPeopleSearchQuery] = useState("");
  const debouncedPeopleSearch = useDebounce(peopleSearchQuery, 300);
  const [customCode, setCustomCode] = useState<string>("");
  const [maxUses, setMaxUses] = useState<number>(10);
  const [enableAutoCoupon, setEnableAutoCoupon] = useState<boolean>(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [remainingFilter, setRemainingFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [sortField, setSortField] = useState<'code' | 'recipient' | 'discount' | 'status' | 'remaining' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const selectedPeopleIds = selectedPeople.map(p => p.id).join(',');
  
  const { data: previewData, isLoading: isLoadingPreview } = useQuery<{ 
    total: number; 
    willReceive: number; 
    alreadyHaveCoupons: number; 
  }>({
    queryKey: ["/api/admin/coupons/preview", selectedEventId, recipientMode, selectedPeopleIds],
    queryFn: async () => {
      if (recipientMode === 'general') {
        return { total: 0, willReceive: 0, alreadyHaveCoupons: 0 };
      }
      const body: any = { eventApiId: selectedEventId };
      if (recipientMode === 'allPremium') {
        body.targetGroup = 'activePremium';
      } else if (recipientMode === 'individuals') {
        body.recipientIds = selectedPeople.map(p => p.id);
      }
      const response = await fetch('/api/admin/coupons/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to load preview");
      return response.json();
    },
    enabled: !!selectedEventId && recipientMode !== 'general' && (recipientMode === 'allPremium' || selectedPeople.length > 0),
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
    enabled: recipientMode === 'individuals' && debouncedPeopleSearch.length >= 2,
  });

  const generateCouponsMutation = useMutation({
    mutationFn: async (data: {
      eventApiId: string;
      ticketTypeId?: string;
      ticketTypeName?: string;
      discountType: 'percent' | 'dollars';
      discountPercent?: number;
      dollarOff?: number;
      couponType: 'targeted' | 'general';
      targetGroup?: 'activePremium';
      recipientIds?: number[];
      customCode?: string;
      maxUses?: number;
      enableAutoCoupon?: boolean;
    }) => {
      return apiRequest("/api/admin/coupons/generate", "POST", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      const skippedMessage = data.results?.skipped > 0 
        ? ` (${data.results.skipped} skipped - already had coupons)`
        : '';
      const autoCouponMessage = data.autoCouponEnabled 
        ? ' Future subscribers will also receive coupons.' 
        : '';
      toast({
        title: "Coupons Generated",
        description: `Successfully created ${data.results?.created || 0} coupons${skippedMessage}.${autoCouponMessage}`,
      });
      setIsCreateOpen(false);
      setSelectedEventId("");
      setSelectedTicketTypeId("");
      setDiscountType('percent');
      setDiscountPercent(100);
      setDollarOff(10);
      setRecipientMode('allPremium');
      setSelectedPeople([]);
      setPeopleSearchQuery("");
      setCustomCode("");
      setMaxUses(10);
      setEnableAutoCoupon(false);
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

    if (recipientMode === 'general') {
      if (!customCode || customCode.trim().length < 3) {
        toast({
          title: "Error",
          description: "Please enter a coupon code (at least 3 characters)",
          variant: "destructive",
        });
        return;
      }
    } else if (recipientMode === 'individuals' && selectedPeople.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one person",
        variant: "destructive",
      });
      return;
    }

    const actualTicketTypeId = selectedTicketTypeId === 'all' ? undefined : selectedTicketTypeId;
    const selectedTicket = ticketTypesData?.ticketTypes?.find(t => t.id === actualTicketTypeId);

    const isGeneralCoupon = recipientMode === 'general';

    const mutationData: {
      eventApiId: string;
      ticketTypeId?: string;
      ticketTypeName?: string;
      discountType: 'percent' | 'dollars';
      discountPercent?: number;
      dollarOff?: number;
      couponType: 'targeted' | 'general';
      targetGroup?: 'activePremium';
      recipientIds?: number[];
      customCode?: string;
      maxUses?: number;
      enableAutoCoupon?: boolean;
    } = {
      eventApiId: selectedEventId,
      ticketTypeId: actualTicketTypeId,
      ticketTypeName: selectedTicket?.name || undefined,
      discountType,
      couponType: isGeneralCoupon ? 'general' : 'targeted',
    };

    if (discountType === 'percent') {
      mutationData.discountPercent = discountPercent;
    } else {
      mutationData.dollarOff = dollarOff;
    }

    if (isGeneralCoupon) {
      mutationData.customCode = customCode.trim();
      mutationData.maxUses = Math.max(1, maxUses || 1);
    } else {
      if (recipientMode === 'allPremium') {
        mutationData.targetGroup = 'activePremium';
        if (enableAutoCoupon) {
          mutationData.enableAutoCoupon = true;
        }
      } else {
        mutationData.recipientIds = selectedPeople.map(p => p.id);
      }
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

  const toggleEventExpanded = (eventApiId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventApiId)) {
        next.delete(eventApiId);
      } else {
        next.add(eventApiId);
      }
      return next;
    });
  };

  const filteredCoupons = useMemo(() => {
    if (!couponsData?.coupons) return [];
    
    return couponsData.coupons.filter(coupon => {
      if (statusFilter !== "all" && coupon.status !== statusFilter) return false;
      if (remainingFilter === "has_remaining" && (coupon.remainingCount ?? 0) <= 0) return false;
      if (remainingFilter === "fully_redeemed" && (coupon.remainingCount ?? 0) > 0) return false;
      if (sourceFilter !== "all" && coupon.source !== sourceFilter) return false;
      if (debouncedSearchQuery) {
        const searchLower = debouncedSearchQuery.toLowerCase();
        const codeMatch = coupon.code.toLowerCase().includes(searchLower);
        const recipientMatch = coupon.recipientEmail?.toLowerCase().includes(searchLower);
        if (!codeMatch && !recipientMatch) return false;
      }
      return true;
    });
  }, [couponsData?.coupons, statusFilter, remainingFilter, sourceFilter, debouncedSearchQuery]);

  const handleSort = (field: 'code' | 'recipient' | 'discount' | 'status' | 'remaining') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3.5 w-3.5 ml-1" /> 
      : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
  };

  const sortCoupons = (coupons: Coupon[]) => {
    if (!sortField) return coupons;
    
    return [...coupons].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'recipient':
          comparison = (a.recipientEmail || '').localeCompare(b.recipientEmail || '');
          break;
        case 'discount':
          const discountA = a.discountPercent || (a.centsOff ? a.centsOff / 100 : 0);
          const discountB = b.discountPercent || (b.centsOff ? b.centsOff / 100 : 0);
          comparison = discountA - discountB;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'remaining':
          comparison = (a.remainingCount ?? 0) - (b.remainingCount ?? 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const couponsByEvent = useMemo(() => {
    if (!couponsData?.stats) return [];
    
    return couponsData.stats.map(stat => {
      const eventCoupons = filteredCoupons.filter(c => c.eventApiId === stat.eventApiId);
      const sortedCoupons = sortCoupons(eventCoupons);
      return {
        eventApiId: stat.eventApiId,
        eventTitle: stat.eventTitle,
        total: eventCoupons.length,
        issued: eventCoupons.filter(c => c.status === 'issued').length,
        redeemed: eventCoupons.filter(c => c.status === 'redeemed').length,
        expired: eventCoupons.filter(c => c.status === 'expired').length,
        coupons: sortedCoupons
      };
    }).filter(group => group.coupons.length > 0);
  }, [couponsData?.stats, filteredCoupons, sortField, sortDirection]);

  const hasActiveFilters = statusFilter !== "all" || remainingFilter !== "all" || sourceFilter !== "all" || searchQuery !== "";

  const clearFilters = () => {
    setStatusFilter("all");
    setRemainingFilter("all");
    setSourceFilter("all");
    setSearchQuery("");
  };

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
              <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Generate Coupons</DialogTitle>
                  <DialogDescription>
                    Create discount coupons for members or general use
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
                        <Label>Recipients</Label>
                        <RadioGroup
                          value={recipientMode}
                          onValueChange={(value: 'allPremium' | 'individuals' | 'general') => {
                            setRecipientMode(value);
                            if (value !== 'individuals') {
                              setSelectedPeople([]);
                              setPeopleSearchQuery("");
                            }
                            if (value !== 'general') {
                              setCustomCode("");
                              setMaxUses(10);
                            }
                          }}
                          className="flex flex-col gap-2"
                          data-testid="radio-recipient-mode"
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
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="general" id="general" data-testid="radio-general" />
                            <Label htmlFor="general" className="font-normal cursor-pointer">
                              General Use (shareable code)
                            </Label>
                          </div>
                        </RadioGroup>
                        <p className="text-xs text-muted-foreground">
                          {recipientMode === 'general' 
                            ? 'Create a single coupon code that can be shared broadly' 
                            : 'Send individual coupons to specific recipients via email'}
                        </p>
                      </div>

                      {recipientMode === 'allPremium' && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="enableAutoCoupon"
                            checked={enableAutoCoupon}
                            onChange={(e) => setEnableAutoCoupon(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            data-testid="checkbox-enable-auto-coupon"
                          />
                          <Label htmlFor="enableAutoCoupon" className="cursor-pointer text-sm">
                            Also invite future premium members
                          </Label>
                        </div>
                      )}

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
                        <Label>Discount Type</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={discountType === 'percent' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setDiscountType('percent')}
                            data-testid="button-discount-percent"
                          >
                            Percentage Off
                          </Button>
                          <Button
                            type="button"
                            variant={discountType === 'dollars' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setDiscountType('dollars')}
                            data-testid="button-discount-dollars"
                          >
                            Dollar Amount Off
                          </Button>
                        </div>
                      </div>

                      {discountType === 'percent' ? (
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
                              data-testid="input-discount-percent"
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            100% = Free ticket
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="dollarOff">Dollar Amount Off</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">$</span>
                            <Input
                              id="dollarOff"
                              type="number"
                              min={0.01}
                              step={0.01}
                              value={dollarOff}
                              onChange={(e) => setDollarOff(parseFloat(e.target.value) || 10)}
                              data-testid="input-discount-dollars"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Enter the dollar amount to discount from the ticket price
                          </p>
                        </div>
                      )}

                      {recipientMode === 'general' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="customCode">Coupon Code</Label>
                            <Input
                              id="customCode"
                              placeholder="e.g., WELCOME25, SPONSOR50"
                              value={customCode}
                              onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-_]/g, ''))}
                              maxLength={50}
                              data-testid="input-custom-code"
                            />
                            <p className="text-xs text-muted-foreground">
                              Letters, numbers, hyphens, and underscores only. This code will be shown exactly as entered.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="maxUses">Number of Uses</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="maxUses"
                                type="number"
                                min={1}
                                value={maxUses === 1000000 ? '' : maxUses}
                                placeholder={maxUses === 1000000 ? 'Unlimited' : undefined}
                                onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                                disabled={maxUses === 1000000}
                                className={maxUses === 1000000 ? 'bg-muted' : ''}
                                data-testid="input-max-uses"
                              />
                              <Button
                                type="button"
                                variant={maxUses === 1000000 ? 'default' : 'outline'}
                                size="icon"
                                onClick={() => setMaxUses(maxUses === 1000000 ? 10 : 1000000)}
                                title={maxUses === 1000000 ? 'Set limited uses' : 'Set unlimited uses'}
                                data-testid="button-unlimited-uses"
                              >
                                <Infinity className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {maxUses === 1000000 
                                ? 'Unlimited uses - click the infinity button to set a specific limit'
                                : 'How many times this coupon can be redeemed'
                              }
                            </p>
                          </div>
                        </>
                      )}

                      {recipientMode === 'individuals' && (
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

                  {selectedEventId && recipientMode === 'general' && customCode.length >= 3 && (
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2" data-testid="coupon-preview-general">
                      <div className="text-sm font-medium">Preview</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span>Code: <strong>{customCode}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span>
                            {discountType === 'percent' 
                              ? `${discountPercent}% off` 
                              : `$${dollarOff.toFixed(2)} off`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-purple-500" />
                          <span>{maxUses} {maxUses === 1 ? 'use' : 'uses'}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        No email will be sent. Share this code manually.
                      </p>
                    </div>
                  )}

                  {selectedEventId && recipientMode !== 'general' && (recipientMode === 'allPremium' || selectedPeople.length > 0) && (
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2" data-testid="coupon-preview">
                      <div className="text-sm font-medium">Preview</div>
                      {isLoadingPreview ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Calculating...
                        </div>
                      ) : previewData ? (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span><strong>{previewData.willReceive}</strong> will receive new coupons</span>
                          </div>
                          {previewData.alreadyHaveCoupons > 0 && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <div className="h-2 w-2 rounded-full bg-gray-400" />
                              <span>{previewData.alreadyHaveCoupons} already have coupons (will be skipped)</span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerateCoupons}
                    disabled={
                      !selectedEventId || 
                      generateCouponsMutation.isPending || 
                      (recipientMode !== 'general' && (isLoadingPreview || !previewData || previewData.willReceive === 0)) ||
                      (recipientMode === 'general' && customCode.length < 3)
                    }
                    data-testid="button-confirm-generate"
                  >
                    {generateCouponsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : recipientMode === 'general' ? (
                      customCode.length < 3 ? "Enter Coupon Code" : "Create Coupon"
                    ) : previewData?.willReceive === 0 ? (
                      "No New Recipients"
                    ) : (
                      `Generate ${previewData?.willReceive ?? ''} Coupons`
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        <div className="space-y-4">

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-4">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search coupons..."
                  isLoading={isLoadingCoupons}
                />
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-8" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="issued">Issued</SelectItem>
                      <SelectItem value="redeemed">Redeemed</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={remainingFilter} onValueChange={setRemainingFilter}>
                    <SelectTrigger className="w-[150px] h-8" data-testid="select-remaining-filter">
                      <SelectValue placeholder="Remaining" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Remaining</SelectItem>
                      <SelectItem value="has_remaining">Has remaining</SelectItem>
                      <SelectItem value="fully_redeemed">Fully redeemed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-[120px] h-8" data-testid="select-source-filter">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="luma">Luma</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8 px-2 text-muted-foreground"
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                {hasActiveFilters && (
                  <div className="text-sm text-muted-foreground ml-auto">
                    Showing {filteredCoupons.length} of {couponsData?.coupons?.length || 0} coupons
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isLoadingCoupons ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : couponsByEvent.length > 0 ? (
            <div className="space-y-3">
              {couponsByEvent.map((eventGroup) => {
                const isExpanded = expandedEvents.has(eventGroup.eventApiId);
                return (
                  <Collapsible
                    key={eventGroup.eventApiId}
                    open={isExpanded}
                    onOpenChange={() => toggleEventExpanded(eventGroup.eventApiId)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <CardTitle className="text-base">{eventGroup.eventTitle}</CardTitle>
                                <CardDescription className="mt-1">
                                  {eventGroup.total} coupons
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                <span className="text-muted-foreground">{eventGroup.issued} issued</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-muted-foreground">{eventGroup.redeemed} redeemed</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-gray-400" />
                                <span className="text-muted-foreground">{eventGroup.expired} expired</span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>
                                  <button
                                    onClick={() => handleSort('code')}
                                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                                    data-testid="sort-code"
                                  >
                                    Code
                                    {getSortIcon('code')}
                                  </button>
                                </TableHead>
                                <TableHead>
                                  <button
                                    onClick={() => handleSort('recipient')}
                                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                                    data-testid="sort-recipient"
                                  >
                                    Recipient
                                    {getSortIcon('recipient')}
                                  </button>
                                </TableHead>
                                <TableHead>
                                  <button
                                    onClick={() => handleSort('discount')}
                                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                                    data-testid="sort-discount"
                                  >
                                    Discount
                                    {getSortIcon('discount')}
                                  </button>
                                </TableHead>
                                <TableHead>Link</TableHead>
                                <TableHead>
                                  <button
                                    onClick={() => handleSort('status')}
                                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                                    data-testid="sort-status"
                                  >
                                    Status
                                    {getSortIcon('status')}
                                  </button>
                                </TableHead>
                                <TableHead>
                                  <button
                                    onClick={() => handleSort('remaining')}
                                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                                    data-testid="sort-remaining"
                                  >
                                    Remaining
                                    {getSortIcon('remaining')}
                                  </button>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {eventGroup.coupons.map((coupon) => {
                                const couponLink = getCouponLink(coupon);
                                return (
                                  <TableRow key={coupon.id}>
                                    <TableCell className="font-mono font-medium">
                                      <button
                                        onClick={() => copyToClipboard(coupon.code)}
                                        className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
                                        data-testid={`button-copy-code-${coupon.id}`}
                                      >
                                        {copiedCode === coupon.code ? (
                                          <>
                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                            <span className="text-green-600">{coupon.code}</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span>{coupon.code}</span>
                                          </>
                                        )}
                                      </button>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap truncate max-w-[200px]" title={coupon.recipientEmail ?? undefined}>
                                      {coupon.recipientEmail ? (
                                        coupon.recipientEmail
                                      ) : (coupon as any).couponType === 'general' ? (
                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">General Use</Badge>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {coupon.discountPercent ? `${coupon.discountPercent}%` : coupon.centsOff ? `$${(coupon.centsOff / 100).toFixed(2)}` : '—'}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {couponLink ? (
                                        <button
                                          onClick={() => copyLinkToClipboard(couponLink)}
                                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                          data-testid={`button-copy-link-${coupon.id}`}
                                        >
                                          {copiedLink === couponLink ? (
                                            <>
                                              <Check className="h-3.5 w-3.5 text-green-500" />
                                              <span className="text-green-600">Copied</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="h-3.5 w-3.5" />
                                              <span>Copy link</span>
                                            </>
                                          )}
                                        </button>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{getStatusBadge(coupon.status)}</TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {coupon.remainingCount !== null && coupon.remainingCount !== undefined 
                                        ? coupon.remainingCount >= 1000000 
                                          ? <span className="flex items-center gap-1 font-medium text-primary"><Infinity className="h-4 w-4" /></span>
                                          : <span className={coupon.remainingCount === 0 ? "text-muted-foreground" : "font-medium"}>{coupon.remainingCount}</span>
                                        : <span className="text-muted-foreground">—</span>
                                      }
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                {hasActiveFilters && couponsData?.coupons?.length ? (
                  <>
                    <h3 className="text-lg font-semibold mb-2">No matching coupons</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      No coupons match your current filters
                    </p>
                    <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters-empty">
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold mb-2">No coupons yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Generate coupons for your premium members to attend upcoming events
                    </p>
                    <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-coupons">
                      <Plus className="h-4 w-4 mr-2" />
                      Generate First Coupons
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
