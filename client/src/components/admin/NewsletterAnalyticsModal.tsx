import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  BarChart3,
  Mail,
  MousePointerClick,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  TrendingUp,
} from "lucide-react";

interface AnalyticsData {
  send: {
    id: number;
    recipientCount: number;
    deliveredCount: number;
    openCount: number;
    clickCount: number;
    bounceCount: number;
    sentAt: string;
    openRate: string;
    clickRate: string;
    deliveryRate: string;
    bounceRate: string;
  };
  recipients: Array<{
    id: number;
    email: string;
    status: string;
    deliveredAt: string | null;
    openedAt: string | null;
    clickedAt: string | null;
    bouncedAt: string | null;
    unsubscribedAt: string | null;
  }>;
  rawEventCounts: Record<string, number>;
}

interface NewsletterAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sendId: number | null;
  postTitle?: string;
}

function StatCard({
  label,
  value,
  rate,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  rate: string;
  icon: typeof Mail;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    green: "bg-green-500/10 text-green-600 border-green-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    red: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  return (
    <div className={`rounded-lg border p-3 ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm font-medium">{rate}%</span>
      </div>
    </div>
  );
}

function RecipientStatusBadge({ status, openedAt, clickedAt, bouncedAt, unsubscribedAt }: {
  status: string;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  unsubscribedAt: string | null;
}) {
  if (unsubscribedAt) {
    return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-[10px]">Unsubscribed</Badge>;
  }
  if (bouncedAt) {
    return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-[10px]">Bounced</Badge>;
  }
  if (clickedAt) {
    return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 text-[10px]">Clicked</Badge>;
  }
  if (openedAt) {
    return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-[10px]">Opened</Badge>;
  }
  if (status === "delivered") {
    return <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50 text-[10px]">Delivered</Badge>;
  }
  return <Badge variant="outline" className="text-gray-400 border-gray-200 text-[10px]">Sent</Badge>;
}

export function NewsletterAnalyticsModal({ open, onOpenChange, sendId, postTitle }: NewsletterAnalyticsModalProps) {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/newsletter", sendId, "analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/newsletter/${sendId}/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: open && !!sendId,
    refetchInterval: open ? 30000 : false,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[90vw] h-[80vh] max-h-[80vh] p-0 overflow-hidden [&>button]:hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <DialogTitle className="text-lg font-semibold">Newsletter Analytics</DialogTitle>
            </div>
            {data?.send && (
              <span className="text-xs text-muted-foreground">
                Sent {new Date(data.send.sentAt).toLocaleDateString()} {new Date(data.send.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          {postTitle && (
            <p className="text-sm text-muted-foreground ml-10 -mt-1 truncate">{postTitle}</p>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <ScrollArea className="flex-1 h-full">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Delivered"
                  value={data.send.deliveredCount}
                  rate={data.send.deliveryRate}
                  icon={CheckCircle2}
                  color="green"
                />
                <StatCard
                  label="Opened"
                  value={data.send.openCount}
                  rate={data.send.openRate}
                  icon={Eye}
                  color="blue"
                />
                <StatCard
                  label="Clicked"
                  value={data.send.clickCount}
                  rate={data.send.clickRate}
                  icon={MousePointerClick}
                  color="amber"
                />
                <StatCard
                  label="Bounced"
                  value={data.send.bounceCount}
                  rate={data.send.bounceRate}
                  icon={XCircle}
                  color="red"
                />
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{data.send.recipientCount} recipients</span>
                </div>
                {Object.keys(data.rawEventCounts).length > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {Object.entries(data.rawEventCounts)
                        .filter(([type]) => !['scanner_filtered'].includes(type))
                        .map(([type, count]) => (
                        <span key={type} className="flex items-center gap-1">
                          <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">{count}</Badge>
                        </span>
                      ))}
                      {data.rawEventCounts['scanner_filtered'] && (
                        <span className="flex items-center gap-1 text-muted-foreground/60">
                          <AlertTriangle className="h-3 w-3" />
                          {data.rawEventCounts['scanner_filtered']} scanner filtered
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Per-Recipient Breakdown
                </h3>
                {data.recipients.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 pl-3 font-medium text-xs text-muted-foreground">Email</th>
                            <th className="text-left p-2 font-medium text-xs text-muted-foreground">Status</th>
                            <th className="text-left p-2 font-medium text-xs text-muted-foreground hidden md:table-cell">Delivered</th>
                            <th className="text-left p-2 font-medium text-xs text-muted-foreground hidden md:table-cell">Opened</th>
                            <th className="text-left p-2 pr-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Clicked</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {data.recipients.map((r) => (
                            <tr key={r.id} className="hover:bg-muted/20">
                              <td className="p-2 pl-3 text-xs truncate max-w-[200px]">{r.email}</td>
                              <td className="p-2">
                                <RecipientStatusBadge
                                  status={r.status}
                                  openedAt={r.openedAt}
                                  clickedAt={r.clickedAt}
                                  bouncedAt={r.bouncedAt}
                                  unsubscribedAt={r.unsubscribedAt}
                                />
                              </td>
                              <td className="p-2 text-xs text-muted-foreground hidden md:table-cell">
                                {r.deliveredAt ? new Date(r.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                              <td className="p-2 text-xs text-muted-foreground hidden md:table-cell">
                                {r.openedAt ? new Date(r.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                              <td className="p-2 pr-3 text-xs text-muted-foreground hidden md:table-cell">
                                {r.clickedAt ? new Date(r.clickedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No recipient data yet</p>
                    <p className="text-xs mt-1">Analytics will appear as SendGrid processes events</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 text-sm text-muted-foreground">
            No analytics data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
