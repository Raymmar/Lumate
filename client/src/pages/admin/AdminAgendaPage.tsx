import { useState } from "react";
import { Link } from "wouter";
import { CalendarClock, ExternalLink } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AgendaSection } from "@/components/agenda/AgendaSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/ui/seo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSummits } from "@/hooks/use-summits";

export default function AdminAgendaPage() {
  const { data: summits = [], isLoading } = useSummits();
  // Optional ?year= lets other admin pages link straight to a year's agenda
  const [selectedYear, setSelectedYear] = useState<number | null>(() => {
    const year = Number(new URLSearchParams(window.location.search).get("year"));
    return Number.isInteger(year) && year > 0 ? year : null;
  });

  const summit =
    summits.find((s) => s.year === selectedYear) ?? summits.find((s) => s.isCurrent) ?? summits[0];

  return (
    <>
      <SEO title="Summit Agenda - Admin" description="Manage summit time blocks and sessions" />
      <AdminLayout
        title={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              <h1 className="text-2xl font-bold">Agenda</h1>
            </div>
            {summit && (
              <div className="flex items-center gap-2">
                <Select value={String(summit.year)} onValueChange={(value) => setSelectedYear(Number(value))}>
                  <SelectTrigger className="w-48" data-testid="select-agenda-year">
                    <SelectValue placeholder="Summit year" />
                  </SelectTrigger>
                  <SelectContent>
                    {summits.map((s) => (
                      <SelectItem key={s.id} value={String(s.year)}>
                        {s.year} Summit{s.isCurrent ? " (current)" : ""}{s.isPublished ? "" : " – draft"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/summit/${summit.year}`}>
                    View page <ExternalLink className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        }
      >
        <p className="text-sm text-muted-foreground mb-4">
          Time blocks and sessions added here belong to the selected summit year. Speaker profiles are shared across
          years; manage them on the{" "}
          <Link href="/admin/speakers" className="underline">
            Speakers
          </Link>{" "}
          page.
        </p>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !summit ? (
          <p className="text-muted-foreground">
            No summits yet.{" "}
            <Link href="/admin/summits" className="underline">
              Create a summit year
            </Link>{" "}
            first.
          </p>
        ) : (
          <AgendaSection key={summit.id} isAdmin summitYear={summit.year} summitId={summit.id} />
        )}
      </AdminLayout>
    </>
  );
}
