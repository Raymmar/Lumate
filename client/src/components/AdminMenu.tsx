import { useState, useEffect } from "react";
import { Link } from "wouter";
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
import { Button } from "@/components/ui/button";
import { RefreshCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminMenu() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState("");
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const { toast, dismiss } = useToast();

  const addSyncLog = (message: string) => {
    setSyncLogs(logs => [...logs, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleResetDatabase = async () => {
    setIsResetting(true);
    setSyncProgress(0);
    setSyncStatus("Starting sync process...");
    setSyncLogs([]);

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

      // Show initial toast
      toast({
        title: "Reset & Sync Started",
        description: "Database reset initiated. Starting sync process...",
        variant: "default",
      });

      // Show a syncing toast that won't auto-dismiss
      const syncToast = toast({
        title: "Sync in Progress",
        description: "Please wait while data is being synced...",
        duration: Infinity, // Won't auto-dismiss
      });

      // Handle SSE
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
                // Dismiss the infinite sync toast
                dismiss(syncToast);
                setSyncProgress(100);
                setSyncStatus("Sync completed successfully!");
                addSyncLog("Sync completed successfully!");

                // Show completion toast with detailed stats
                toast({
                  title: "✅ Sync Completed Successfully",
                  description: (
                    <div className="space-y-2">
                      <p>Data has been successfully synchronized:</p>
                      <ul className="list-disc pl-4">
                        <li>{data.data.eventCount} events synced</li>
                        <li>{data.data.peopleCount} people synced</li>
                      </ul>
                    </div>
                  ),
                  variant: "default",
                  duration: 5000,
                });

                // Short delay before reload to show 100% progress
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
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
    } finally {
      if (!isResetDialogOpen) {
        setIsResetting(false);
        setSyncProgress(0);
        setSyncStatus("");
        setSyncLogs([]);
      }
    }
  };

  return (
    <>
      <div className="px-4">
        <div className="space-y-2">
          <Link href="/">
            <Button 
              variant="outline" 
              className="w-full"
            >
              View Directory
            </Button>
          </Link>
          <Button 
            variant="default" 
            className="w-full bg-black hover:bg-black/90"
            onClick={() => setIsResetDialogOpen(true)}
            disabled={isResetting}
          >
            {isResetting ? (
              <>
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset & Sync Data
              </>
            )}
          </Button>
        </div>
      </div>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              {isResetting ? (
                <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
              )}
              {isResetting ? "Sync in Progress" : "Reset & Sync Luma Data"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {isResetting ? (
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
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <>
                  This action will clear all existing data and fetch fresh data from the Luma API.
                  <br /><br />
                  <strong>This action cannot be undone.</strong> The database will be cleared and all IDs will be reset.
                  The sync process may take several minutes to complete.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleResetDatabase();
              }}
              disabled={isResetting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isResetting ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Reset & Sync"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}