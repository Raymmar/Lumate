import { useEffect, useRef, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle2, RefreshCcw } from "lucide-react";

interface SyncDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isResetting: boolean;
  syncStatus: string;
  syncProgress: number;
  syncLogs: string[];
  isComplete: boolean;
  syncStats?: {
    guestsProcessed: number;
    totalIterations: number;
    reachedLimit: boolean;
  };
  onClose: () => void;
}

export function SyncDialog({
  isOpen,
  onOpenChange,
  isResetting,
  syncStatus,
  syncProgress,
  syncLogs,
  isComplete,
  syncStats,
  onClose
}: SyncDialogProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [syncLogs]);

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            {isComplete ? (
              <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
            ) : isResetting ? (
              <RefreshCcw className="mr-2 h-5 w-5 animate-spin text-blue-500" />
            ) : (
              <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
            )}
            {isComplete ? "Sync Completed" : isResetting ? "Sync in Progress" : "Sync Attendees"}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            {isComplete ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/10">
                  <p className="font-medium text-green-900 dark:text-green-50">
                    Successfully synchronized attendees:
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-green-800 dark:text-green-100">
                    <li>{syncStats?.guestsProcessed} attendees processed</li>
                    <li>{syncStats?.totalIterations} API calls made</li>
                    {syncStats?.reachedLimit && (
                      <li className="text-yellow-600">
                        Note: Reached maximum pagination limit
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <>
                <p>{syncStatus}</p>
                <div className="space-y-2">
                  <Progress value={syncProgress} className="w-full" />
                  <p className="text-sm text-center text-muted-foreground">
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
            <AlertDialogAction onClick={onClose} className="bg-green-600 hover:bg-green-700">
              Close & Refresh
            </AlertDialogAction>
          ) : (
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
