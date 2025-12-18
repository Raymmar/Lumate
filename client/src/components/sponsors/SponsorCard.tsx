import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { Sponsor } from "@shared/schema";

interface SponsorCardProps {
  sponsor: Sponsor;
  isAdmin?: boolean;
  onEdit?: (sponsor: Sponsor) => void;
  onDelete?: (id: number) => void;
}

export function SponsorCard({
  sponsor,
  isAdmin = false,
  onEdit,
  onDelete,
}: SponsorCardProps) {
  return (
    <a
      href={sponsor.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="block group relative w-full max-w-full"
      data-testid={`sponsor-card-${sponsor.id}`}
    >
      <div className="flex flex-col h-full w-full max-w-full border border-border rounded-lg p-3">
        <div className="mb-3 bg-white dark:bg-white p-4 rounded-lg flex items-center justify-center">
          <img
            src={sponsor.logo}
            alt={sponsor.name}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
        <div className="text-center">
          <h4 className="font-semibold text-sm line-clamp-2">
            {sponsor.name}
          </h4>
        </div>
      </div>
      {isAdmin && (
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
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onEdit?.(sponsor);
                }}
                data-testid={`button-edit-sponsor-${sponsor.id}`}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onDelete?.(sponsor.id);
                }}
                className="text-destructive"
                data-testid={`button-delete-sponsor-${sponsor.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </a>
  );
}
