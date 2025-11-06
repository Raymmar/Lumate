import { TimelineEvent } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

interface TimelineCardProps {
  event: TimelineEvent;
  index: number;
  isAdmin?: boolean;
  onEdit?: (event: TimelineEvent) => void;
  onDelete?: (id: number) => void;
}

export function TimelineCard({
  event,
  index,
  isAdmin = false,
  onEdit,
  onDelete,
}: TimelineCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "long", 
      year: "numeric" 
    });
  };

  return (
    <div
      className={`relative flex flex-col gap-8 md:flex-row ${
        index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
      }`}
      data-testid={`timeline-card-${event.id}`}
    >
      {event.imageUrl && (
        <div className="flex-1">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="rounded-lg object-cover w-full aspect-video"
          />
        </div>
      )}
      <div className={`${event.imageUrl ? 'flex-1' : 'w-full'} space-y-4`}>
        <div className="flex items-start justify-between">
          <div className="space-y-4 flex-1">
            <time className="text-muted-foreground">
              {formatDate(event.date)}
            </time>
            <h3 className="text-2xl font-semibold">{event.title}</h3>
            {event.description && (
              <p className="text-muted-foreground">{event.description}</p>
            )}
          </div>
          {isAdmin && (
            <div className="ml-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    data-testid={`button-timeline-menu-${event.id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onEdit?.(event)}
                    data-testid={`button-edit-timeline-${event.id}`}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(event.id)}
                    className="text-destructive"
                    data-testid={`button-delete-timeline-${event.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}