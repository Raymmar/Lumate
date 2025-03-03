import { useState, useEffect, useRef } from "react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export default function AdminMenu() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState("");
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [syncStats, setSyncStats] = useState<{ eventCount: number; peopleCount: number } | null>(null);
  const { toast } = useToast();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [syncLogs]);

  const addSyncLog = (message: string) => {
    setSyncLogs(logs => [...logs, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleResetDatabase = async () => {
    setIsResetting(true);
    setSyncProgress(0);
    setSyncStatus("Starting sync process...");
    setSyncLogs([]);
    setIsComplete(false);
    setSyncStats(null);

    try {
      const response = await fetch('/_internal/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok && !response.headers.get('content-type')?.includes('text/event-stream')) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to reset and sync data');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to initialize stream reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const messages = chunk.split('\n\n').filter(Boolean);

        for (const message of messages) {
          if (message.startsWith('data: ')) {
            const data = JSON.parse(message.slice(6));

            switch (data.type) {
              case 'status':
              case 'progress':
                setSyncStatus(data.message);
                setSyncProgress(data.progress);
                addSyncLog(data.message);
                break;

              case 'complete':
                setSyncProgress(100);
                setSyncStatus("Sync completed successfully!");
                addSyncLog("Sync completed successfully!");
                setIsComplete(true);
                setSyncStats({
                  eventCount: data.data.eventCount,
                  peopleCount: data.data.peopleCount
                });
                return;

              case 'error':
                setSyncStatus(`Error: ${data.message}`);
                addSyncLog(`Error: ${data.message}`);
                throw new Error(data.message);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error resetting and syncing data:', error);
      toast({
        title: "Reset & Sync Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCloseAndRefresh = () => {
    setIsResetDialogOpen(false);
    window.location.reload();
  };

  return (
    <>
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              {isComplete ? (
                <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
              )}
              {isComplete ? "Sync Completed Successfully" : "Reset & Sync Luma Data"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {isComplete ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/10">
                    <p className="font-medium text-green-900 dark:text-green-50">
                      Successfully synchronized data from Luma API:
                    </p>
                    <ul className="mt-2 list-disc pl-5 text-green-800 dark:text-green-100">
                      <li>{syncStats?.eventCount} events synced</li>
                      <li>{syncStats?.peopleCount} people synced</li>
                    </ul>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Click "Close & Refresh" to see the updated data.
                  </div>
                </div>
              ) : (
                <>
                  <p>{syncStatus}</p>
                  <div className="space-y-2">
                    <Progress value={syncProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      {syncProgress}% Complete
                    </p>
                  </div>
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    <div className="space-y-2">
                      {syncLogs.map((log, index) => (
                        <p key={index} className="text-sm text-muted-foreground">
                          {log}
                        </p>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </ScrollArea>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {isComplete ? (
              <AlertDialogAction 
                onClick={handleCloseAndRefresh}
                className="bg-green-600 hover:bg-green-700 focus:ring-green-600"
              >
                Close & Refresh
              </AlertDialogAction>
            ) : (
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={() => setIsResetDialogOpen(true)}
        disabled={isResetting}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Reset & Sync Luma Data
      </Button>
    </>
  );
}