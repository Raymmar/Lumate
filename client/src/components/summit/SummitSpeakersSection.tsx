import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users } from "lucide-react";
import type { SpeakerWithSummits } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpeakerGrid } from "@/components/speakers";

/** Speakers who took part in one summit year. Hidden when the year has none yet. */
export function SummitSpeakersSection({ year }: { year: number }) {
  const { data } = useQuery<{ speakers: SpeakerWithSummits[] }>({
    queryKey: ["/api/speakers", { year: String(year) }],
    queryFn: async () => {
      const res = await fetch(`/api/speakers?year=${year}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load speakers");
      return res.json();
    },
    staleTime: 60000,
  });

  const speakers = data?.speakers ?? [];
  if (speakers.length === 0) return null;

  return (
    <Card className="mb-12" data-testid="card-summit-speakers">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {year} Speakers
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/speakers">All speakers</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <SpeakerGrid speakers={speakers} variant="expanded" columns={3} layoutIdPrefix={`summit-${year}-speakers`} />
      </CardContent>
    </Card>
  );
}
