import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Layers, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { YearSponsor } from "@shared/schema";

/** The fields a sponsor card needs; `tier` decides the logo's aspect ratio. */
export type SponsorCardData = Pick<YearSponsor, "id" | "name" | "logo" | "url" | "logoPadding" | "companyId"> & {
  tier?: string | null;
  year?: number;
  sponsorshipId?: number;
};

interface SponsorCardProps<T extends SponsorCardData> {
  sponsor: T;
  isAdmin?: boolean;
  /** Edit the sponsor's global details */
  onEdit?: (sponsor: T) => void;
  /** Change this year's tier */
  onChangeTier?: (sponsor: T) => void;
  /** Remove this year's sponsorship */
  onRemove?: (sponsor: T) => void;
  removeLabel?: string;
}

export function SponsorCard<T extends SponsorCardData>({
  sponsor,
  isAdmin = false,
  onEdit,
  onChangeTier,
  onRemove,
  removeLabel = "Remove from this year",
}: SponsorCardProps<T>) {
  return (
    <a
      href={sponsor.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="block group relative w-full max-w-full"
      data-testid={`sponsor-card-${sponsor.id}`}
    >
      <div className="flex flex-col h-full w-full max-w-full border border-border rounded-lg p-3">
        <div 
          className={`mb-3 bg-white dark:bg-white rounded-lg flex items-center justify-center ${sponsor.tier !== "Series A" ? "aspect-square" : ""}`}
          style={{ padding: `${sponsor.logoPadding ?? 16}px` }}
        >
          <img
            src={sponsor.logo}
            alt={sponsor.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <div className="text-center">
          <h4 className="font-semibold text-sm line-clamp-2">
            {sponsor.name}
          </h4>
        </div>
      </div>
      {isAdmin && (onEdit || onChangeTier || onRemove) && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              onClick={(e) => e.preventDefault()}
            >
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                data-testid={`button-sponsor-menu-${sponsor.id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(sponsor);
                  }}
                  data-testid={`button-edit-sponsor-${sponsor.id}`}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit sponsor details
                </DropdownMenuItem>
              )}
              {onChangeTier && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onChangeTier(sponsor);
                  }}
                  data-testid={`button-change-tier-${sponsor.id}`}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Change tier{sponsor.year ? ` for ${sponsor.year}` : ""}
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onRemove(sponsor);
                  }}
                  className="text-destructive"
                  data-testid={`button-remove-sponsor-${sponsor.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {removeLabel}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </a>
  );
}
