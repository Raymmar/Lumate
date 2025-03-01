import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SyncModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function SyncModal({ isOpen, onComplete }: SyncModalProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      let eventSource: EventSource | null = null;

      const startSync = async () => {
        try {
          eventSource = new EventSource('/_internal/reset-database');

          eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'progress' || data.type === 'status') {
              setProgress(data.progress || 0);
              setStatus(data.message || '');
            } else if (data.type === 'complete') {
              setProgress(100);
              setStatus(data.message || 'Sync completed successfully');
              setIsComplete(true);
              eventSource?.close();
              // Short delay before calling onComplete to allow user to see 100%
              setTimeout(onComplete, 1000);
            } else if (data.type === 'error') {
              setError(data.message || 'An error occurred during sync');
              eventSource?.close();
            }
          };

          eventSource.onerror = () => {
            setError('Lost connection to server');
            eventSource?.close();
          };
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to start sync');
        }
      };

      startSync();

      return () => {
        if (eventSource) {
          eventSource.close();
        }
      };
    }
  }, [isOpen, onComplete]);

  return (
    <div className="space-y-8 p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Syncing Data with Luma
        </h2>
        <p className="text-sm text-muted-foreground">
          Fetching latest events and attendees...
        </p>
      </div>

      <div className="space-y-4">
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isComplete && (
        <div className="flex justify-end">
          <Button onClick={onComplete}>Close</Button>
        </div>
      )}

      {!isComplete && !error && (
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
    </div>
  );
}
