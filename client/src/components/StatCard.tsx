import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  isLoading: boolean;
  description?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
  description
}: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 md:p-4 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium truncate">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="p-3 md:p-4 pt-0">
        <div className="text-lg sm:text-2xl font-bold truncate">
          {isLoading ? "..." : value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}