import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2 } from "lucide-react";

interface ColumnToggleProps {
  columns: {
    title: string;
    key: string;
    isVisible: boolean;
  }[];
  onToggleColumn: (key: string) => void;
}

export function ColumnToggle({ columns, onToggleColumn }: ColumnToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Settings2 className="h-4 w-4" />
          <span className="sr-only">Toggle columns</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            className="capitalize"
            checked={column.isVisible}
            onCheckedChange={() => onToggleColumn(column.key)}
          >
            {column.title}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
