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
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface SyncStats {
  eventCount: number;
  peopleCount: number;
}

interface SyncProgressEvent {
  type: 'status' | 'progress' | 'complete' | 'error';
  message: string;
  progress?: number;
  data?: {
    eventCount: number;
    peopleCount: number;
  };
}

export default function AdminMenu() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
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
    setSyncLogs([]);
    setIsComplete(false);
    setSyncStats(null);
    setShowConfirmDialog(false);
    setShowProgressDialog(true);

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

      addSyncLog("Connected to sync stream...");

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
            try {
              const data = JSON.parse(message.slice(6)) as SyncProgressEvent;
              addSyncLog(`Received event: ${data.type} - ${data.message}`);

              switch (data.type) {
                case 'status':
                case 'progress':
                  if (data.progress !== undefined) {
                    setSyncProgress(data.progress);
                  }
                  break;

                case 'complete':
                  setSyncProgress(100);
                  setIsComplete(true);
                  if (data.data) {
                    setSyncStats({
                      eventCount: data.data.eventCount,
                      peopleCount: data.data.peopleCount
                    });
                  }
                  addSyncLog(`Sync completed. Events: ${data.data?.eventCount}, People: ${data.data?.peopleCount}`);
                  return;

                case 'error':
                  throw new Error(data.message);
              }
            } catch (parseError) {
              console.error('Error parsing SSE message:', parseError);
              addSyncLog(`Error parsing sync update: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error resetting and syncing data:', error);
      addSyncLog(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Reset & Sync Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleCloseAndRefresh = () => {
    setShowProgressDialog(false);
    window.location.reload();
  };

  return (
    <>
      {/* Initial Warning Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
              Reset & Sync Luma Data
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="font-medium">Warning: This action will:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Clear all existing events data</li>
                <li>Clear all people data while preserving attendance records</li>
                <li>Fetch fresh data from Luma API</li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                This process may take several minutes to complete. Do you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetDatabase}>
              Start Sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Dialog */}
      <AlertDialog open={showProgressDialog} onOpenChange={() => {}}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              {isComplete ? (
                <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
              )}
              {isComplete ? "Sync Completed Successfully" : "Syncing Luma Data"}
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
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Progress value={syncProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      {syncProgress}% Complete
                    </p>
                  </div>
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    <div className="space-y-2">
                      {syncLogs.map((log, index) => (
                        <p key={index} className="text-sm text-muted-foreground font-mono">
                          {log}
                        </p>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </ScrollArea>
                </div>
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
              <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowConfirmDialog(true)}
        disabled={isResetting}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
        {isResetting ? 'Syncing...' : 'Reset & Sync Luma Data'}
      </Button>
    </>
  );
}