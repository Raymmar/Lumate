import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function SubscriptionCancelPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="text-center py-8">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold mt-4">Subscription Cancelled</h1>
          <p className="text-muted-foreground mt-2">
            You have cancelled the subscription process. No charges were made.
          </p>
          <Button onClick={() => setLocation('/settings')} className="mt-4">
            Return to Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}