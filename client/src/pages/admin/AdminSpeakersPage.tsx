import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users } from "lucide-react";
import type { SpeakerWithSummits } from "@shared/schema";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { SpeakerModal } from "@/components/agenda/SpeakerModal";
import { SpeakerGrid } from "@/components/speakers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/ui/seo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSummits } from "@/hooks/use-summits";

export default function AdminSpeakersPage() {
  const { data: summits = [] } = useSummits();
  const { data, isLoading, isError } = useQuery<{ speakers: SpeakerWithSummits[] }>({ queryKey: ["/api/speakers"] });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const allSpeakers = data?.speakers ?? [];
  const query = search.trim().toLowerCase();
  const speakers = allSpeakers.filter((speaker) => {
    if (filter === "unassigned" && speaker.summits.length > 0) return false;
    if (filter !== "all" && filter !== "unassigned" && !speaker.summits.some((s) => String(s.year) === filter)) return false;
    return !query || [speaker.name, speaker.title, speaker.company, speaker.bio].some((v) => v?.toLowerCase().includes(query));
  });

  return (
    <>
      <SEO title="Speakers - Admin" description="Manage summit speaker profiles" />
      <AdminLayout title={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" /><h1 className="text-2xl font-bold">Speakers</h1>
          </div>
          <Button onClick={() => setCreating(true)} data-testid="button-new-speaker">
            <Plus className="h-4 w-4 mr-2" /> Add speaker
          </Button>
        </div>
      }>
        <p className="text-sm text-muted-foreground mb-4">
          Speaker profiles are shared across summit years. Assign speakers to sessions on the{" "}
          <Link href="/admin/agenda" className="underline">Agenda</Link> page.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, title, company or bio..." className="pl-10" value={search}
              onChange={(e) => setSearch(e.target.value)} data-testid="input-admin-search-speakers" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-52" data-testid="select-admin-speaker-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All speakers</SelectItem>
              <SelectItem value="unassigned">Not in any session</SelectItem>
              {summits.map((summit) => (
                <SelectItem key={summit.id} value={String(summit.year)}>{summit.year} Summit</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? <Skeleton className="h-40 w-full" /> : isError ? (
          <p role="alert" className="py-12 text-center text-destructive">Could not load speakers. Please try again.</p>
        ) : speakers.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground" data-testid="text-no-admin-speakers">
            {allSpeakers.length === 0 ? "No speakers yet." : "No speakers match these filters."}
          </p>
        ) : (
          <SpeakerGrid speakers={speakers} columns={3} layoutIdPrefix="admin-speakers" />
        )}
        <SpeakerModal speaker={null} isOpen={creating} onClose={() => setCreating(false)} />
      </AdminLayout>
    </>
  );
}
