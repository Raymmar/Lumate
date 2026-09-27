import { useEffect, useState } from "react";
import { useCurrentSummit } from "@/hooks/use-summits";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { SponsorGrid } from "@/components/sponsors";
import { Building2, Calendar } from "lucide-react";
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
          </div>
        }
      >
        <div className="space-y-6">
          <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Managing Sponsors</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Each sponsor is assigned to a specific year</li>
              <li>If a company sponsors multiple years, create a separate entry for each year</li>
              <li>Use the year selector above to switch between different years</li>
              <li>You can link sponsors to company profiles for easy navigation</li>
              <li>Empty tiers will show an "Add Sponsor" prompt when you're logged in as admin</li>
            </ul>
          </div>

          <SponsorGrid 
            year={activeYear}
            title={`${activeYear} Sponsors`}
            icon={<Building2 className="h-5 w-5" />}
            showBecomeSponsorCTA={false}
          />
        </div>
      </AdminLayout>
    </>
  );
}
