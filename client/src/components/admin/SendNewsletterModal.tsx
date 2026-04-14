import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X, Send, Mail, TestTube, Loader2, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Post } from "@shared/schema";

function getVideoThumbnail(videoUrl: string | null | undefined): { thumbnailUrl: string; videoLink: string } | null {
  if (!videoUrl) return null;
  try {
    const url = new URL(videoUrl);
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      const videoId = url.hostname.includes('youtu.be')
        ? url.pathname.slice(1)
        : url.searchParams.get('v');
      if (videoId) {
        return {
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          videoLink: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }
    }
    if (url.hostname.includes('vimeo.com')) {
      const videoId = url.pathname.split('/').pop();
      if (videoId) {
        return {
          thumbnailUrl: `https://vumbnail.com/${videoId}.jpg`,
          videoLink: `https://vimeo.com/${videoId}`,
        };
      }
    }
  } catch {}
  return null;
}

interface SendNewsletterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
}

export function SendNewsletterModal({ open, onOpenChange, post }: SendNewsletterModalProps) {
  const { toast } = useToast();
  const videoInfo = getVideoThumbnail(post.videoUrl);
  const [audience, setAudience] = useState<string>("all");
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<number[]>([]);
  const [selectedEventApiIds, setSelectedEventApiIds] = useState<string[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  const { data: badgesData } = useQuery<{ badges: Array<{ id: number; name: string; icon: string }> }>({
    queryKey: ["/api/admin/badges-list"],
    enabled: open,
  });

  const { data: eventsData } = useQuery<{ events: Array<{ apiId: string; title: string; startTime: string }> }>({
    queryKey: ["/api/admin/events-list"],
    enabled: open,
  });

  const recipientParams = new URLSearchParams({ audience });
  if (selectedBadgeIds.length > 0) recipientParams.set("badgeIds", selectedBadgeIds.join(","));
  if (selectedEventApiIds.length > 0) recipientParams.set("eventApiIds", selectedEventApiIds.join(","));

  const { data: recipientData, isLoading: isLoadingRecipients } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/newsletter/recipients", audience, selectedBadgeIds, selectedEventApiIds],
    queryFn: async () => {
      const res = await fetch(`/api/admin/newsletter/recipients?${recipientParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch recipients");
      return res.json();
    },
    enabled: open,
  });

  const { data: sendHistory } = useQuery<{ sends: Array<{ id: number; audience: string; recipientCount: number; testSend: boolean; sentAt: string; senderName: string | null }> }>({
    queryKey: ["/api/admin/posts", post.id, "newsletter"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/posts/${post.id}/newsletter`);
      if (!res.ok) throw new Error("Failed to fetch send history");
      return res.json();
    },
    enabled: open,
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/admin/posts/${post.id}/newsletter/test`, "POST", { email: testEmail });
    },
    onSuccess: () => {
      toast({ title: "Test sent", description: `Test newsletter sent to ${testEmail}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts", post.id, "newsletter"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send test email", variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/admin/posts/${post.id}/newsletter/send`, "POST", {
        audience,
        badgeIds: selectedBadgeIds.length > 0 ? selectedBadgeIds : undefined,
        eventApiIds: selectedEventApiIds.length > 0 ? selectedEventApiIds : undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Newsletter sent!", description: `Successfully sent to ${recipientData?.count || 0} recipients` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts", post.id, "newsletter"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/newsletter/sent-posts"] });
      setShowSendConfirm(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send newsletter", variant: "destructive" });
      setShowSendConfirm(false);
    },
  });

  const previousSends = sendHistory?.sends?.filter(s => !s.testSend) || [];
  const hasPreviousSend = previousSends.length > 0;

  const toggleBadge = (badgeId: number) => {
    setSelectedBadgeIds(prev =>
      prev.includes(badgeId) ? prev.filter(id => id !== badgeId) : [...prev, badgeId]
    );
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden [&>button]:hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-lg font-semibold">Send as Newsletter</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {isLoadingRecipients ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className="font-medium">{recipientData?.count || 0} recipients</span>
                  )}
                </div>
                <Button
                  onClick={() => setShowSendConfirm(true)}
                  disabled={sendMutation.isPending || !recipientData?.count}
                  className="gap-2"
                >
                  {sendMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send Newsletter</>
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden h-full">
            <div className="flex-1 overflow-y-auto border-r">
              <div className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Email Preview</h3>
                <div className="rounded-lg overflow-hidden border" style={{ backgroundColor: '#f4f4f4' }}>
                  <div style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff' }}>
                    <div style={{ padding: '16px 32px', textAlign: 'center', borderBottom: '1px solid #e5e5e5' }}>
                      <img src="/st-logo-email.png" alt="Sarasota Tech" style={{ display: 'block', margin: '0 auto', maxWidth: 280, width: '100%', height: 'auto' }} />
                    </div>
                    <div style={{ padding: 32 }}>
                      {post.featuredImage && (
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          style={{ width: '100%', height: 'auto', borderRadius: 8, marginBottom: 24 }}
                        />
                      )}
                      <h2 style={{ color: '#1a1a1a', fontSize: 28, lineHeight: 1.3, margin: '0 0 16px 0' }}>{post.title}</h2>
                      {post.summary && (
                        <p style={{ fontSize: 16, color: '#666', lineHeight: 1.6, margin: '0 0 24px 0', fontStyle: 'italic' }}>{post.summary}</p>
                      )}
                      <div
                        className="prose prose-sm max-w-none [&_p]:mb-[1.25em] [&_li_p]:mb-0 [&_h1]:mt-[1.5em] [&_h1]:mb-[0.75em] [&_h2]:mt-[1.5em] [&_h2]:mb-[0.75em] [&_h3]:mt-[1.25em] [&_h3]:mb-[0.5em] [&_ul]:mb-[1.25em] [&_ol]:mb-[1.25em] [&_li]:mb-[0.25em] [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#e5e5e5] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#555]"
                        style={{ color: '#333', fontSize: 16, lineHeight: 1.8 }}
                        dangerouslySetInnerHTML={{ __html: post.body }}
                      />
                      {videoInfo && (
                        <div style={{ marginTop: 24, marginBottom: 24, position: 'relative', cursor: 'pointer' }}>
                          <img
                            src={videoInfo.thumbnailUrl}
                            alt="Watch Video"
                            style={{ width: '100%', height: 'auto', borderRadius: 8 }}
                          />
                          <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            width: 64, height: 64, background: 'rgba(0,0,0,0.7)', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{
                              width: 0, height: 0, borderStyle: 'solid',
                              borderWidth: '12px 0 12px 22px',
                              borderColor: 'transparent transparent transparent #fff',
                              marginLeft: 4,
                            }} />
                          </div>
                        </div>
                      )}
                      {post.ctaLink && post.ctaLabel && (
                        <div style={{ textAlign: 'center', margin: '30px 0' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '14px 28px',
                              backgroundColor: '#FEA30E',
                              color: '#000',
                              textDecoration: 'none',
                              borderRadius: 6,
                              fontSize: 16,
                              fontWeight: 'bold',
                            }}
                          >
                            {post.ctaLabel}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '24px 32px', borderTop: '1px solid #e5e5e5', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: 12 }}>Sarasota Tech Community</p>
                      <p style={{ margin: 0, color: '#FEA30E', fontSize: 12 }}>Visit our website</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-80 flex-shrink-0 overflow-y-auto">
              <div className="p-4 space-y-5">
                {hasPreviousSend && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium text-amber-500">Previously sent</p>
                      <p className="text-muted-foreground mt-1">
                        Last sent on {new Date(previousSends[0].sentAt).toLocaleDateString()} to {previousSends[0].recipientCount} recipients ({previousSends[0].audience})
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm">Audience</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="people">Everyone</SelectItem>
                      <SelectItem value="all">Active Attendees</SelectItem>
                      <SelectItem value="premium">Paid Members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Filter by Badge</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {badgesData?.badges?.map(badge => (
                      <button
                        key={badge.id}
                        onClick={() => toggleBadge(badge.id)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          selectedBadgeIds.includes(badge.id)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 hover:bg-muted border-border'
                        }`}
                      >
                        {badge.name}
                      </button>
                    ))}
                    {!badgesData?.badges?.length && (
                      <p className="text-xs text-muted-foreground">No badges available</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Filter by Event Attendance</Label>
                  <Select
                    value={selectedEventApiIds.length === 1 ? selectedEventApiIds[0] : "none"}
                    onValueChange={(val) => {
                      if (val === "none") {
                        setSelectedEventApiIds([]);
                      } else {
                        setSelectedEventApiIds([val]);
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="No event filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No event filter</SelectItem>
                      {eventsData?.events?.map(event => (
                        <SelectItem key={event.apiId} value={event.apiId}>
                          <span className="truncate">{event.title}</span>
                          <span className="text-muted-foreground ml-1">({new Date(event.startTime).toLocaleDateString()})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <TestTube className="h-3.5 w-3.5" />
                    Send Test Email
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!testEmail || testMutation.isPending}
                      onClick={() => testMutation.mutate()}
                      className="flex-shrink-0"
                    >
                      {testMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                {sendHistory?.sends && sendHistory.sends.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-sm">Send History</Label>
                      <div className="space-y-2">
                        {sendHistory.sends.slice(0, 5).map(send => (
                          <div key={send.id} className="text-xs p-2 rounded bg-muted/30 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {send.testSend ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Test</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                  Sent
                                </Badge>
                              )}
                              <span className="text-muted-foreground">
                                {new Date(send.sentAt).toLocaleDateString()} {new Date(send.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-muted-foreground">
                              {send.testSend ? `To: test email` : `${send.recipientCount} recipients (${send.audience})`}
                              {send.senderName && ` • by ${send.senderName}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Newsletter</AlertDialogTitle>
            <AlertDialogDescription>
              {hasPreviousSend
                ? `This post has been sent before. Are you sure you want to send "${post.title}" to ${recipientData?.count || 0} recipients?`
                : `Are you sure you want to send "${post.title}" to ${recipientData?.count || 0} recipients? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? "Sending..." : `Send to ${recipientData?.count || 0} recipients`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
