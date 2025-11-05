import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SponsorGrid, SingleSponsor, SponsorCard } from "@/components/sponsors";
import { Sparkles, GraduationCap, Building2, Rocket, Calendar } from "lucide-react";
import { SEO } from "@/components/ui/seo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SponsorShowcasePage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const isAdmin = (user as any)?.isAdmin || (user as any)?.is_admin;
  
  // Generate year options (current year + 2 past years + 2 future years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (isLoading) {
    return null;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <>
      <SEO 
        title="Sponsor Component Showcase - Admin"
        description="Admin-only page showcasing sponsor component variations"
      />
      <PageContainer>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Sponsor Component Showcase</h1>
                <p className="text-muted-foreground">
                  This admin-only page demonstrates all the different ways to use sponsor components throughout the site.
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-32" data-testid="select-year">
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
            
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm">How Multi-Year Sponsorships Work:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Each sponsor entry is tied to a specific year</li>
                <li>If a company sponsors multiple years, create a separate entry for each year</li>
                <li>Use the year selector above to view sponsors from different years</li>
                <li>When adding/editing sponsors, you can set which year they're sponsoring</li>
              </ul>
            </div>
          </div>

          {/* Full Sponsor Grid */}
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">1. Full Sponsor Grid (All Tiers)</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Default usage: Shows all sponsor tiers for a specific year
              </p>
              <code className="block bg-muted p-3 rounded text-sm mb-4">
                {`<SponsorGrid year={${selectedYear}} title="Our Amazing Sponsors" icon={<Sparkles />} />`}
              </code>
            </div>
            <SponsorGrid 
              year={selectedYear}
              title={`${selectedYear} Sponsors`}
              icon={<Sparkles className="h-5 w-5" />}
              showBecomeSponsorCTA={true}
            />
          </section>

          {/* Filtered Grid - Series A Only */}
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">2. Filtered Grid - Premium Sponsors Only</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Use the <code className="bg-muted px-2 py-1 rounded">tiers</code> prop to show only specific sponsor tiers
              </p>
              <code className="block bg-muted p-3 rounded text-sm mb-4">
                {`<SponsorGrid year={${selectedYear}} tiers={["Series A"]} title="Premier Sponsors" />`}
              </code>
            </div>
            <SponsorGrid 
              year={selectedYear}
              tiers={["Series A"]}
              title="Premier Sponsors"
              icon={<Building2 className="h-5 w-5" />}
              showBecomeSponsorCTA={false}
            />
          </section>

          {/* Filtered Grid - Multiple Tiers */}
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">3. Filtered Grid - Startup Supporters</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Show multiple specific tiers - great for themed sections
              </p>
              <code className="block bg-muted p-3 rounded text-sm mb-4">
                {`<SponsorGrid year={${selectedYear}} tiers={["Seed", "MVP", "Prototype"]} title="Startup Supporters" />`}
              </code>
            </div>
            <SponsorGrid 
              year={selectedYear}
              tiers={["Seed", "MVP", "Prototype"]}
              title="Startup Supporters"
              icon={<Rocket className="h-5 w-5" />}
            />
          </section>

          {/* Filtered Grid - Nonprofits */}
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">4. Filtered Grid - Nonprofit Partners</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Perfect for education or community partnership pages
              </p>
              <code className="block bg-muted p-3 rounded text-sm mb-4">
                {`<SponsorGrid year={${selectedYear}} tiers={["Nonprofit"]} title="Nonprofit Partners" />`}
              </code>
            </div>
            <SponsorGrid 
              year={selectedYear}
              tiers={["Nonprofit"]}
              title="Nonprofit Partners"
              icon={<GraduationCap className="h-5 w-5" />}
            />
          </section>

          {/* Individual Sponsor Cards */}
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">5. Individual Sponsor Cards</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Display single sponsors anywhere on your site - sidebars, heroes, callouts
              </p>
              <code className="block bg-muted p-3 rounded text-sm mb-4">
                {`<SingleSponsor sponsorId={1} showAdminControls={false} />`}
              </code>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Example: Homepage Hero Section</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <SingleSponsor sponsorId={1} showAdminControls={false} />
                  <SingleSponsor sponsorId={2} showAdminControls={false} />
                  <SingleSponsor sponsorId={3} showAdminControls={false} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Example: Sidebar Partner Spotlight</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs">
                  <h3 className="text-sm font-semibold mb-3">Featured Partner</h3>
                  <SingleSponsor sponsorId={1} showAdminControls={false} />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Compact Grid Layout */}
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">6. Compact Layouts</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Create custom layouts by combining individual sponsor cards
              </p>
              <code className="block bg-muted p-3 rounded text-sm mb-4">
                {`<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  <SingleSponsor sponsorId={1} />
  <SingleSponsor sponsorId={2} />
  ...
</div>`}
              </code>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Example: Footer Sponsor Logos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SingleSponsor sponsorId={1} showAdminControls={false} />
                  <SingleSponsor sponsorId={2} showAdminControls={false} />
                  <SingleSponsor sponsorId={3} showAdminControls={false} />
                  <SingleSponsor sponsorId={4} showAdminControls={false} />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Component Reference */}
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Component Reference</h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Available Components</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">SponsorGrid</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Main component for displaying sponsor collections with tier grouping
                  </p>
                  <div className="bg-muted p-3 rounded text-sm space-y-1">
                    <div><strong>Props:</strong></div>
                    <div>• year?: number - Filter sponsors by year (default: current year)</div>
                    <div>• title?: string - Grid title (default: "Sponsors")</div>
                    <div>• icon?: ReactNode - Optional icon next to title</div>
                    <div>• showBecomeSponsorCTA?: boolean - Show CTA button (default: true)</div>
                    <div>• tiers?: string[] - Filter to specific tiers (default: show all)</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">SingleSponsor</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Display a single sponsor by ID - perfect for featured placements
                  </p>
                  <div className="bg-muted p-3 rounded text-sm space-y-1">
                    <div><strong>Props:</strong></div>
                    <div>• sponsorId: number - The sponsor ID to display (required)</div>
                    <div>• showAdminControls?: boolean - Show edit/delete (default: true)</div>
                    <div>• isAdmin?: boolean - Override admin detection</div>
                    <div>• onEdit?: (sponsor) =&gt; void - Custom edit handler</div>
                    <div>• onDelete?: (id) =&gt; void - Custom delete handler</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">SponsorCard</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Low-level component when you already have sponsor data
                  </p>
                  <div className="bg-muted p-3 rounded text-sm space-y-1">
                    <div><strong>Props:</strong></div>
                    <div>• sponsor: Sponsor - The sponsor object (required)</div>
                    <div>• isAdmin?: boolean - Show admin controls</div>
                    <div>• onEdit?: (sponsor) =&gt; void - Edit callback</div>
                    <div>• onDelete?: (id) =&gt; void - Delete callback</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Available Tier Keys</h4>
                  <div className="bg-muted p-3 rounded text-sm space-y-1">
                    <div>• "Series A" - Large premium sponsors (1 column)</div>
                    <div>• "Seed" - Medium sponsors (2 columns)</div>
                    <div>• "MVP" - Small sponsors (3 columns)</div>
                    <div>• "Prototype" - Micro sponsors (4 columns)</div>
                    <div>• "Nonprofit" - Nonprofit organizations</div>
                    <div>• "Education" - Educational institutions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="border-t pt-6 pb-12 text-center text-sm text-muted-foreground">
            <p>This page is only visible to administrators</p>
            <p className="mt-2">Access at: <code className="bg-muted px-2 py-1 rounded">/admin/sponsor-showcase</code></p>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
