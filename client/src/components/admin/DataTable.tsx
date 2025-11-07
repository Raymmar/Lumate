import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface DataTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string | React.ReactNode;
    cell: (row: T) => React.ReactNode;
  }[];
  actions?: {
    label: string | ((row: T) => string);
    onClick: (row: T) => void;
  }[];
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ data, columns, actions, onRowClick }: DataTableProps<T>) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="hidden md:table-header-group">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
            {actions && <TableHead className="w-[50px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow 
              key={index}
              onClick={() => onRowClick?.(row)}
              className={`
                flex flex-col md:table-row
                ${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
              `}
            >
              {columns.map((column) => (
                <TableCell 
                  key={column.key}
                  className="flex flex-col md:table-cell md:w-auto w-full"
                >
                  <span className="font-medium text-sm md:hidden mb-1">
                    {column.header}
                  </span>
                  <div className="w-full">
                    {column.cell(row)}
                  </div>
                </TableCell>
              ))}
              {actions && (
                <TableCell className="flex justify-end md:table-cell md:w-[50px]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map((action, actionIndex) => (
                        <DropdownMenuItem
                          key={actionIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(row);
                          }}
                        >
                          {typeof action.label === 'function' ? action.label(row) : action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}