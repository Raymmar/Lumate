import { useQuery } from "@tanstack/react-query";
import { Users, Calendar as CalendarIcon, UserPlus, DollarSign, ExternalLink, Coins, RefreshCw, TrendingUp, CreditCard, Ticket, Shield, UserCheck, UserX, Handshake } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subWeeks, subMonths, subYears, startOfDay, endOfDay } from "date-fns";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { useLocation } from "wouter";

interface RevenueData {
  totalRevenue: number;
  revenueByPrice: {
    id: string;
    nickname?: string;
    productName?: string;
    revenue: number;
    subscriptionCount: number;
    unitAmount?: number;
  }[];
}

interface RevenueOverview {
  totalRevenue: number;
  thisMonthRevenue: number;
  subscriptionRevenue: number;
  sponsorRevenue: number;
  ticketRevenue: number;
  activeSubscriptions: number;
  totalCharges: number;
  totalCustomers: number;
}

interface CustomerRevenue {
  customerId: string;
  email: string;
  name?: string;
  totalPaid: number;
  subscriptionRevenue: number;
  lastPayment?: string;
  status: string;
}

type TimeRange = 'lifetime' | 'year' | 'custom';

interface MemberStats {
  totalActiveMembers: number;
  stripeSubscribers: number;
  ticketsActivated: number;
  ticketsNotActivated: number;
  manualGrants: number;
  breakdown: {
    source: 'stripe' | 'luma_activated' | 'luma_not_activated' | 'manual';
    count: number;
    label: string;
  }[];
}

export default function AdminDashboard() {
  const [_, navigate] = useLocation();
  const [revenueTimeRange, setRevenueTimeRange] = useState<TimeRange>('year');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const { data: statsData, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch admin stats");
      }
      return response.json();
    }
  });

  // Fetch member stats with breakdown
  const { data: memberStats, isLoading: isMemberStatsLoading } = useQuery<MemberStats>({
    queryKey: ["/api/admin/member-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/member-stats", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch member stats");
      }
      return response.json();
    },
    retry: 1,
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Fetch subscription revenue data (for membership revenue)
  const { data: revenueData, isLoading: isRevenueLoading } = useQuery<RevenueData>({
    queryKey: ["/api/stripe/revenue"],
    queryFn: async () => {
      const response = await fetch("/api/stripe/revenue");
      if (!response.ok) {
        throw new Error("Failed to fetch revenue data");
      }
      return response.json();
    },
    retry: 1
  });

  // Fetch comprehensive revenue overview with date range
  const { data: revenueOverview, isLoading: isOverviewLoading, refetch: refetchRevenue } = useQuery<RevenueOverview>({
    queryKey: ["/api/stripe/revenue-overview", revenueTimeRange, customDateRange.from?.getTime(), customDateRange.to?.getTime()],
    queryFn: async () => {
      let url = `/api/stripe/revenue-overview?range=${revenueTimeRange}`;
      if (revenueTimeRange === 'custom' && customDateRange.from) {
        url += `&from=${Math.floor(customDateRange.from.getTime() / 1000)}`;
        if (customDateRange.to) {
          url += `&to=${Math.floor(customDateRange.to.getTime() / 1000)}`;
        }
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch revenue overview");
      }
      return response.json();
    },
    retry: 1
  });

  const revenueCardTitle = useMemo(() => {
    switch (revenueTimeRange) {
      case 'year': return `${currentYear} Revenue`;
      case 'custom': 
        if (customDateRange.from && customDateRange.to) {
          return `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d, yyyy')}`;
        } else if (customDateRange.from) {
          return `From ${format(customDateRange.from, 'MMM d, yyyy')}`;
        }
        return 'Custom Date Range';
      default: return 'All Time Revenue';
    }
  }, [revenueTimeRange, customDateRange, currentYear]);

  // Fetch customer revenue data
  const { data: customerRevenue, isLoading: isCustomerLoading } = useQuery<CustomerRevenue[]>({
    queryKey: ["/api/stripe/customer-revenue"],
    queryFn: async () => {
      const response = await fetch("/api/stripe/customer-revenue");
      if (!response.ok) {
        throw new Error("Failed to fetch customer revenue");
      }
      return response.json();
    },
    retry: 1
  });

  
  // Navigation functions
  const handleNewMember = () => {
    navigate("/admin/members?action=new");
  };
  
  const handleNewCompany = () => {
    navigate("/admin/companies?action=new");
  };


  // Helper to get icon for member source
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'stripe': return <CreditCard className="h-3 w-3" />;
      case 'luma_activated': return <UserCheck className="h-3 w-3 text-green-600" />;
      case 'luma_not_activated': return <UserX className="h-3 w-3 text-amber-500" />;
      case 'manual': return <Shield className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  return (
    <AdminLayout title={
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => window.open('https://lu.ma/calendar/manage/cal-piKozq5UuJw79D', '_blank')}
            className="text-sm"
            data-testid="button-calendar"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Calendar
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-sm"
            onClick={handleNewMember}
            data-testid="button-new-member"
          >
            <Plus className="w-4 h-4 mr-2" />
            Member
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-sm"
            onClick={handleNewCompany}
            data-testid="button-new-company"
          >
            <Plus className="w-4 h-4 mr-2" />
            Company
          </Button>
        </div>
      </div>
    }>
      {/* Community Stats Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
        {/* Events */}
        <Card data-testid="card-events">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-events-count">
                  {isLoading ? '...' : statsData?.events || 0}
                </div>
                <div className="text-xs text-muted-foreground">Events since Aug 2023</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Newsletter Subscribers */}
        <Card data-testid="card-subscribers">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-subscribers-count">
                  {isLoading ? '...' : statsData?.uniqueAttendees || 0}
                </div>
                <div className="text-xs text-muted-foreground">Newsletter subscribers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verified Members */}
        <Card data-testid="card-verified-members">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-verified-count">
                  {isLoading ? '...' : statsData?.users || 0}
                </div>
                <div className="text-xs text-muted-foreground">Verified accounts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Financial Dashboard - Full Width */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Financial Overview</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetchRevenue()}
            className="flex items-center gap-1 text-xs"
            data-testid="button-refresh-revenue"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        {/* Financial Stats Grid */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            {/* Active Members Card - Featured with breakdown */}
            <Card className="md:col-span-2 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20" data-testid="card-active-members">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Active Members
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isMemberStatsLoading ? (
                  <div className="space-y-3">
                    <div className="h-9 w-16 bg-muted/50 rounded animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-5 w-full bg-muted/30 rounded animate-pulse" />
                      <div className="h-5 w-full bg-muted/30 rounded animate-pulse" />
                      <div className="h-5 w-full bg-muted/30 rounded animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-3" data-testid="text-active-members-count">
                      {memberStats?.totalActiveMembers || 0}
                    </div>
                    
                    {memberStats && memberStats.breakdown.length > 0 && (
                      <div className="space-y-2">
                        {memberStats.breakdown.map((item) => (
                          <div 
                            key={item.source} 
                            className="flex items-center justify-between text-sm"
                            data-testid={`breakdown-${item.source}`}
                          >
                            <div className="flex items-center gap-2 text-muted-foreground">
                              {getSourceIcon(item.source)}
                              <span>{item.label}</span>
                            </div>
                            <span className="font-medium">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {memberStats && memberStats.breakdown.length === 0 && (
                      <div className="text-sm text-muted-foreground">No active members</div>
                    )}
                    
                    {/* Annual Recurring Revenue Highlight */}
                    {revenueOverview?.subscriptionRevenue && revenueOverview.subscriptionRevenue > 0 && (
                      <div 
                        className="mt-4 pt-4 border-t border-primary/20"
                        data-testid="arr-highlight"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span>Membership Revenue</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-arr-value">
                              ${revenueOverview.subscriptionRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">/yr</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Revenue Card - Featured with breakdown */}
            <Card className="md:col-span-2 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20" data-testid="card-revenue">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {revenueCardTitle}
                  </CardTitle>
                  <div className="flex rounded-md border border-border/50 overflow-hidden text-xs" data-testid="toggle-revenue-timerange">
                    <button
                      onClick={() => setRevenueTimeRange('lifetime')}
                      className={`px-2 py-1 transition-colors ${
                        revenueTimeRange === 'lifetime' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-background hover:bg-muted'
                      }`}
                      data-testid="button-range-lifetime"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setRevenueTimeRange('year')}
                      className={`px-2 py-1 transition-colors ${
                        revenueTimeRange === 'year' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-background hover:bg-muted'
                      }`}
                      data-testid="button-range-year"
                    >
                      {currentYear}
                    </button>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          className={`px-2 py-1 transition-colors ${
                            revenueTimeRange === 'custom' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-background hover:bg-muted'
                          }`}
                          data-testid="button-range-custom"
                        >
                          <CalendarIcon className="h-3 w-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3" align="end">
                        <div className="space-y-3">
                          <div className="text-sm font-medium">Quick Select</div>
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              data-testid="button-preset-last-week"
                              onClick={() => {
                                const now = new Date();
                                setCustomDateRange({
                                  from: startOfDay(subWeeks(now, 1)),
                                  to: endOfDay(now)
                                });
                                setRevenueTimeRange('custom');
                                setIsCalendarOpen(false);
                              }}
                            >
                              Last Week
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              data-testid="button-preset-last-month"
                              onClick={() => {
                                const now = new Date();
                                setCustomDateRange({
                                  from: startOfDay(subMonths(now, 1)),
                                  to: endOfDay(now)
                                });
                                setRevenueTimeRange('custom');
                                setIsCalendarOpen(false);
                              }}
                            >
                              Last Month
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              data-testid="button-preset-last-year"
                              onClick={() => {
                                const lastYear = new Date().getFullYear() - 1;
                                setCustomDateRange({
                                  from: new Date(lastYear, 0, 1),
                                  to: new Date(lastYear, 11, 31, 23, 59, 59, 999)
                                });
                                setRevenueTimeRange('custom');
                                setIsCalendarOpen(false);
                              }}
                            >
                              {new Date().getFullYear() - 1}
                            </Button>
                          </div>
                          
                          <div className="border-t pt-3">
                            <div className="text-sm font-medium mb-2">Custom Range</div>
                            <div className="flex gap-2 items-center mb-2">
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start text-left font-normal text-xs"
                                      data-testid="button-start-date"
                                    >
                                      <CalendarIcon className="mr-2 h-3 w-3" />
                                      {customDateRange.from ? format(customDateRange.from, 'MMM d, yyyy') : 'Pick a date'}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={customDateRange.from}
                                      onSelect={(date) => {
                                        if (date) {
                                          const newFrom = startOfDay(date);
                                          setCustomDateRange(prev => ({
                                            from: newFrom,
                                            to: prev.to && prev.to < newFrom ? endOfDay(newFrom) : prev.to
                                          }));
                                          setRevenueTimeRange('custom');
                                        }
                                      }}
                                      data-testid="calendar-start-date"
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <span className="text-muted-foreground mt-5">to</span>
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start text-left font-normal text-xs"
                                      data-testid="button-end-date"
                                    >
                                      <CalendarIcon className="mr-2 h-3 w-3" />
                                      {customDateRange.to ? format(customDateRange.to, 'MMM d, yyyy') : 'Pick a date'}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                      mode="single"
                                      selected={customDateRange.to}
                                      onSelect={(date) => {
                                        if (date) {
                                          setCustomDateRange(prev => ({
                                            ...prev,
                                            to: endOfDay(date)
                                          }));
                                          setRevenueTimeRange('custom');
                                        }
                                      }}
                                      disabled={(date) => 
                                        customDateRange.from ? date < customDateRange.from : false
                                      }
                                      data-testid="calendar-end-date"
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            {customDateRange.from && customDateRange.to && (
                              <Button
                                size="sm"
                                className="w-full text-xs"
                                data-testid="button-apply-custom-range"
                                onClick={() => setIsCalendarOpen(false)}
                              >
                                Apply
                              </Button>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {isOverviewLoading ? (
                  <div className="space-y-3">
                    <div className="h-9 w-24 bg-muted/50 rounded animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-5 w-full bg-muted/30 rounded animate-pulse" />
                      <div className="h-5 w-full bg-muted/30 rounded animate-pulse" />
                      <div className="h-5 w-full bg-muted/30 rounded animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-3" data-testid="text-total-revenue">
                      {revenueOverview?.totalRevenue 
                        ? `$${revenueOverview.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
                        : '$0'}
                    </div>
                    
                    <div className="space-y-2">
                      <div 
                        className="flex items-center justify-between text-sm"
                        data-testid="breakdown-customers"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          <span>Total Stripe Customers</span>
                        </div>
                        <span className="font-medium">{revenueOverview?.totalCustomers || 0}</span>
                      </div>
                      <div 
                        className="flex items-center justify-between text-sm"
                        data-testid="breakdown-month-to-date"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          <span>Month to Date Revenue</span>
                        </div>
                        <span className="font-medium">
                          {revenueOverview?.thisMonthRevenue 
                            ? `$${revenueOverview.thisMonthRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
                            : '$0'}
                        </span>
                      </div>
                      <div 
                        className="flex items-center justify-between text-sm"
                        data-testid="breakdown-subscription-revenue"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Coins className="h-4 w-4" />
                          <span>Subscription Revenue</span>
                        </div>
                        <span className="font-medium">
                          {revenueOverview?.subscriptionRevenue 
                            ? `$${revenueOverview.subscriptionRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
                            : '$0'}
                        </span>
                      </div>
                      <div 
                        className="flex items-center justify-between text-sm"
                        data-testid="breakdown-sponsor-revenue"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Handshake className="h-4 w-4" />
                          <span>Sponsor Revenue</span>
                        </div>
                        <span className="font-medium">
                          {revenueOverview?.sponsorRevenue 
                            ? `$${revenueOverview.sponsorRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
                            : '$0'}
                        </span>
                      </div>
                      <div 
                        className="flex items-center justify-between text-sm"
                        data-testid="breakdown-ticket-revenue"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Ticket className="h-4 w-4" />
                          <span>Ticket Revenue</span>
                        </div>
                        <span className="font-medium">
                          {revenueOverview?.ticketRevenue 
                            ? `$${revenueOverview.ticketRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
                            : '$0'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions Table */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Recent Transactions</h3>
            <div className="overflow-x-auto bg-card rounded-lg border shadow-sm">
              <table className="w-full text-sm" data-testid="table-transactions">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-right font-medium">Total Paid</th>
                    <th className="px-4 py-3 text-right font-medium">Subscription</th>
                    <th className="px-4 py-3 text-right font-medium">Last Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {customerRevenue && customerRevenue.length > 0 ? (
                    customerRevenue.slice(0, 15).map((customer) => (
                      <tr key={customer.customerId} className="border-t" data-testid={`row-customer-${customer.customerId}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{customer.name || 'Unknown'}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                          ${customer.totalPaid.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right whitespace-nowrap font-semibold ${
                          customer.subscriptionRevenue > 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-muted-foreground'
                        }`}>
                          {customer.subscriptionRevenue > 0 
                            ? `$${customer.subscriptionRevenue.toFixed(2)}/mo` 
                            : '--'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                          {customer.lastPayment ? new Date(customer.lastPayment).toLocaleDateString() : '--'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t">
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        {isCustomerLoading ? 'Loading customer data...' : 'No customer revenue found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {customerRevenue && customerRevenue.length > 15 && (
                <div className="px-4 py-3 border-t text-sm text-muted-foreground text-center">
                  Showing 15 of {customerRevenue.length} customers
                </div>
              )}
            </div>
          </div>
        </div>
    </AdminLayout>
  );
}
