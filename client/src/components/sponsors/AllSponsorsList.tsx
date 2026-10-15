import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MoreVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { SponsorWithHistory } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SponsorModal, type SponsorDetails } from "./SponsorModal";
import { apiErrorMessage, invalidateSponsorQueries, useAllSponsors } from "./sponsorApi";

/**
 * Every sponsor once, with the years they sponsored (and tier) and an Active /
 * Past/Upcoming label computed against the current annual calendar year.
 */
export function AllSponsorsList() {
  const { toast } = useToast();
  const { data, isLoading } = useAllSponsors();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SponsorDetails | null>(null);
  const [creating, setCreating] = useState(false);

  const sponsors = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data?.sponsors ?? [];
    const filtered = q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list;
    // Active sponsors first, then alphabetical
    return [...filtered].sort(
      (a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name),
    );
  }, [data, search]);

  const deleteMutation = useMutation({
    mutationFn: (sponsor: SponsorWithHistory) => apiRequest(`/api/sponsors/${sponsor.id}`, "DELETE"),
    onSuccess: async (_result, sponsor) => {
      await invalidateSponsorQueries();
      toast({ title: "Sponsor deleted", description: `${sponsor.name} was removed from every year` });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to delete sponsor"),
        variant: "destructive",
      });
    },
  });

  const handleDelete = (sponsor: SponsorWithHistory) => {
    const years = sponsor.sponsorships.length;
    const message =
      years > 0
        ? `Delete ${sponsor.name} everywhere? They will disappear from all ${years} year(s) they sponsored. To drop a single year, use "Remove from this year" in the year view instead.`
        : `Delete ${sponsor.name}?`;
    if (window.confirm(message)) deleteMutation.mutate(sponsor);
  };

  return (
    <>
      <Card className="border w-full max-w-full overflow-hidden">
        <CardHeader className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>
              All sponsors
              {data && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {data.sponsors.filter((s) => s.isActive).length} active in {data.currentYear} ·{" "}
                  {data.sponsors.length} total
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sponsors..."
                  className="pl-8 w-56"
                  data-testid="input-search-all-sponsors"
                />
              </div>
              <Button size="sm" onClick={() => setCreating(true)} data-testid="button-new-sponsor">
                <Plus className="h-4 w-4 mr-1" />
                New sponsor
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : sponsors.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {search ? `No sponsors match "${search}".` : "No sponsors yet."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Years sponsored</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsors.map((sponsor) => (
                  <TableRow key={sponsor.id} data-testid={`row-sponsor-${sponsor.id}`}>
                    <TableCell>
                      <div className="flex h-10 w-12 items-center justify-center rounded border bg-white p-1">
                        {sponsor.logo && (
                          <img src={sponsor.logo} alt="" className="max-h-full max-w-full object-contain" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {sponsor.url ? (
                        <a href={sponsor.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {sponsor.name}
                        </a>
                      ) : (
                        sponsor.name
                      )}
                    </TableCell>
                    <TableCell>
                      {sponsor.sponsorships.length === 0 ? (
                        <span className="text-sm text-muted-foreground">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {[...sponsor.sponsorships]
                            .sort((a, b) => a.year - b.year)
                            .map((s) => (
                              <Badge key={s.id} variant="outline" className="font-normal" title={s.tier}>
                                {s.year} · {s.tier}
                              </Badge>
                            ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {sponsor.isActive ? (
                        <Badge data-testid={`status-active-${sponsor.id}`}>Active</Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          data-testid={`status-${sponsor.sponsorships.some((s) => s.year > (data?.currentYear ?? Infinity)) ? "upcoming" : "past"}-${sponsor.id}`}
                        >
                          {sponsor.sponsorships.some((s) => s.year > (data?.currentYear ?? Infinity)) ? "Upcoming" : "Past"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Sponsor actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(sponsor)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit sponsor details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(sponsor)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete sponsor (all years)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && <SponsorModal sponsor={editing} onClose={() => setEditing(null)} />}
      {creating && <SponsorModal sponsor={null} initialName={search.trim()} onClose={() => setCreating(false)} />}
    </>
  );
}
