import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSponsorTiers } from "./sponsorConfig";

export function TierCatalogStatus() {
  const catalog = useSponsorTiers();
  if (catalog.isError) {
    return (
      <div role="alert" className="space-y-2 text-sm text-destructive">
        <p>Sponsorship tiers could not be loaded. Please retry before saving.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => catalog.refetch()}>Retry tiers</Button>
      </div>
    );
  }
  if (catalog.isLoading) return <Skeleton className="h-8 w-full" />;
  if (catalog.tiers.length === 0) return <p role="status" className="text-sm text-muted-foreground">No sponsorship tiers have been configured.</p>;
  return null;
}
