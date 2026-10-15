import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { CalendarRange, ExternalLink, Pencil, Plus, Star } from "lucide-react";
import type { SummitWithSponsor as Summit } from "@shared/schema";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { SummitFormDialog } from "@/components/admin/SummitFormDialog";
import { useAdminEvents } from "@/components/admin/EventSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/ui/seo";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatSummitDate, useSummits } from "@/hooks/use-summits";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminSummitsPage() {
  const { toast } = useToast();
  const { data: summits = [], isLoading } = useSummits();
  const [editing, setEditing] = useState<Summit | null>(null);
  // Load the Luma events list up front so the summit dialog's event picker is ready when opened
  useAdminEvents();
  const [dialogOpen, setDialogOpen] = useState(false);

  const suggestedYear = summits.length > 0 ? Math.max(...summits.map((s) => s.year)) + 1 : new Date().getFullYear();

  const onError = (error: Error) =>
    toast({ title: "Something went wrong", description: error.message, variant: "destructive" });

  const publishMutation = useMutation({
    mutationFn: (summit: Summit) =>
      apiRequest(`/api/summits/${summit.id}`, "PATCH", { isPublished: !summit.isPublished }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/summits"] }),
    onError,
  });

  const currentMutation = useMutation({
    mutationFn: (summit: Summit) => apiRequest(`/api/summits/${summit.id}/current`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summits"] });
      toast({ title: "Featured summit updated" });
    },
    onError,
  });

  const openDialog = (summit: Summit | null) => {
    setEditing(summit);
    setDialogOpen(true);
  };

  return (
    <>
      <SEO title="Manage Summits - Admin" description="Create and publish summit years" />
      <AdminLayout
        title={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5" />
              <h1 className="text-2xl font-bold">Summits</h1>
            </div>
            <Button onClick={() => openDialog(null)} data-testid="button-new-summit">
              <Plus className="h-4 w-4 mr-2" /> New summit year
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground mb-4">
          Each year gets its own page at /summit/&lt;year&gt;. Publishing makes that page public;
          "Set current" separately chooses the featured event on /summit. Neither changes the general speaker directory
          (all years) or annual sponsors (calendar year). Past summit pages keep their own year's content.
          Add agenda items and news from a year's page while signed in as an admin.
        </p>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No summits yet.
                    </TableCell>
                  </TableRow>
                )}
                {summits.map((summit) => (
                  <TableRow key={summit.id} data-testid={`row-summit-${summit.year}`}>
                    <TableCell className="font-semibold">{summit.year}</TableCell>
                    <TableCell>{summit.title}</TableCell>
                    <TableCell>{formatSummitDate(summit)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant={summit.isPublished ? "default" : "secondary"}>
                          {summit.isPublished ? "Published" : "Draft"}
                        </Badge>
                        {summit.isCurrent && (
                          <Badge variant="outline" className="gap-1">
                            <Star className="h-3 w-3" /> Current
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => openDialog(summit)} data-testid={`button-edit-summit-${summit.year}`}>
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={publishMutation.isPending}
                          onClick={() => publishMutation.mutate(summit)}
                          data-testid={`button-toggle-publish-${summit.year}`}
                        >
                          {summit.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                        {!summit.isCurrent && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentMutation.isPending}
                            onClick={() => currentMutation.mutate(summit)}
                            data-testid={`button-set-current-${summit.year}`}
                          >
                            Set current
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/summit/${summit.year}`}>
                            View <ExternalLink className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <SummitFormDialog
          summit={editing}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          suggestedYear={suggestedYear}
        />
      </AdminLayout>
    </>
  );
}
