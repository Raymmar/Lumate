import { useEffect, useState } from "react";
import { useCurrentSummit } from "@/hooks/use-summits";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { SponsorGrid } from "@/components/sponsors";
import { AllSponsorsList } from "@/components/sponsors/AllSponsorsList";
import { Building2, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEO } from "@/components/ui/seo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminSponsorsPage() {
  const currentYear = new Date().getFullYear();
  const { data: currentSummit } = useCurrentSummit();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [view, setView] = useState<"year" | "all">("year");
  // Default to the current summit's year until the admin picks one
  useEffect(() => {
    if (selectedYear === null && currentSummit) setSelectedYear(currentSummit.year);
  }, [currentSummit, selectedYear]);
  const activeYear = selectedYear ?? currentSummit?.year ?? currentYear;
  
  // Generate year options (2 past years + current + 2 future years), plus the summit year if outside that range
  const yearOptions = Array.from(
    new Set([...Array.from({ length: 5 }, (_, i) => currentYear - 2 + i), activeYear]),
  ).sort((a, b) => a - b);

  return (
    <>
      <SEO 
        title="Manage Sponsors - Admin"
        description="Manage event and community sponsors"
      />
      <AdminLayout
        title={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Sponsors</h1>
            </div>
            
            {view === "year" && (
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Select
                value={activeYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32" data-testid="select-sponsor-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Managing Sponsors</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Each sponsor exists once. Its name, logo and link are shared by every year, so editing them updates past years too</li>
              <li>To add a returning sponsor to a year, use "Add Sponsor" and search for them; their logo and link are reused and the tier defaults to their last one</li>
              <li>Only use "Add new sponsor" for a sponsor that has never been entered before</li>
              <li>"Remove from this year" removes only that year's sponsorship; the sponsor and their other years are kept</li>
              <li>"All sponsors" lists every sponsor with the years they sponsored. Active means they sponsor the current summit year</li>
              <li>You can link sponsors to company profiles; linked companies get free premium membership while sponsoring</li>
            </ul>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as "year" | "all")}>
            <TabsList>
              <TabsTrigger value="year" data-testid="tab-sponsors-year">{activeYear} sponsors</TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-sponsors-all">All sponsors</TabsTrigger>
            </TabsList>
            <TabsContent value="year" className="mt-4">
              <SponsorGrid 
                year={activeYear}
                title={`${activeYear} Sponsors`}
                icon={<Building2 className="h-5 w-5" />}
                showBecomeSponsorCTA={false}
              />
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              <AllSponsorsList />
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </>
  );
}
