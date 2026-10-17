import { useState } from "react";
import { Edit, MoreHorizontal, Plus } from "lucide-react";
import type { SponsorTierDefinition } from "@shared/sponsorTiers";
import { DataTable } from "@/components/admin/DataTable";
import { PreviewSidebar } from "@/components/admin/PreviewSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SPONSOR_PRESENTATIONS, useSponsorTiers } from "./sponsorConfig";
import { TierCatalogStatus } from "./TierCatalogStatus";
import { SponsorTierEditor } from "./SponsorTierEditor";

export function SponsorTiersAdmin() {
  const catalog = useSponsorTiers();
  const [editor, setEditor] = useState<{ tier: SponsorTierDefinition | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const closeEditor = () => {
    if (!saving) setEditor(null);
  };
  const selectTier = (tier: SponsorTierDefinition) => {
    if (!saving) setEditor({ tier });
  };
  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (tier: SponsorTierDefinition) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{tier.name}</span>
          {tier.isDefault && <Badge variant="secondary">Default</Badge>}
        </div>
      ),
    },
    { key: "description", header: "Description", cell: (tier: SponsorTierDefinition) => tier.description || "—" },
    { key: "position", header: "Position", cell: (tier: SponsorTierDefinition) => tier.position },
    { key: "presentation", header: "Columns", cell: (tier: SponsorTierDefinition) => SPONSOR_PRESENTATIONS[tier.presentation].label },
    {
      key: "actions",
      header: "",
      cell: (tier: SponsorTierDefinition) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={saving} onClick={(event) => event.stopPropagation()} aria-label={`Actions for ${tier.name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem onClick={() => selectTier(tier)}>
              <Edit className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <Card className="border w-full max-w-full overflow-hidden">
        <CardHeader className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Sponsorship tiers</CardTitle>
            <Button size="sm" disabled={!catalog.ready || saving} onClick={() => setEditor({ tier: null })} data-testid="button-new-tier">
              <Plus className="h-4 w-4 mr-1" />New tier
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-4 space-y-6">
          <p className="text-sm text-muted-foreground">Tiers are shared across all years. Changes to descriptions, positions and columns affect every year, including past Summit pages. Lower positions display first. Existing names and the default tier cannot be changed. Tiers cannot be removed.</p>
          <TierCatalogStatus />
          {catalog.ready && catalog.tiers.length > 0 && (
            <DataTable data={catalog.tiers} columns={columns} onRowClick={selectTier} />
          )}
        </CardContent>
      </Card>
      <PreviewSidebar open={editor !== null} onOpenChange={(open) => { if (!open) closeEditor(); }} title={editor?.tier ? `Edit ${editor.tier.name}` : "New tier"}>
        {editor && (
          <SponsorTierEditor
            key={editor.tier?.key ?? "new"}
            tier={editor.tier}
            onClose={() => setEditor(null)}
            onPendingChange={setSaving}
          />
        )}
      </PreviewSidebar>
    </>
  );
}
