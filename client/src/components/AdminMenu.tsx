import { useState } from "react";
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

export default function AdminMenu() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const { toast, dismiss } = useToast();

  const handleResetDatabase = async () => {
    setIsResetting(true);
    setSyncProgress(0);
    try {
      const response = await fetch('/_internal/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to reset and sync data');
      }

      const data = await response.json();

      toast({
        title: "Reset & Sync Started",
        description: data.message || "Database has been cleared. Fresh data is being synced from Luma API. This may take several minutes to complete.",
        variant: "default",
      });

      // Show a syncing toast that won't auto-dismiss
      const syncToast = toast({
        title: "Sync in Progress",
        description: "Please wait while data is being synced...",
        duration: Infinity, // Won't auto-dismiss
      });

      // Poll for completion
      const checkSync = async () => {
        try {
          const statsResponse = await fetch('/api/admin/stats', {
            credentials: 'include'
          });

          if (statsResponse.ok) {
            const stats = await statsResponse.json();
            setSyncProgress(prevProgress => Math.min(prevProgress + 20, 95)); // Increment progress but cap at 95%

            if (stats.events > 0 && stats.people > 0) {
              // Dismiss the infinite sync toast
              dismiss(syncToast);
              setSyncProgress(100);

              // Show completion toast with detailed stats
              toast({
                title: "✅ Sync Completed Successfully",
                description: (
                  <div className="space-y-2">
                    <p>Data has been successfully synchronized:</p>
                    <ul className="list-disc pl-4">
                      <li>{stats.events} events synced</li>
                      <li>{stats.people} people synced</li>
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
            }
          }
          // Check again in 5 seconds
          setTimeout(checkSync, 5000);
        } catch (error) {
          console.error('Error checking sync status:', error);
          // Continue polling even if check fails
          setTimeout(checkSync, 5000);
        }
      };

      // Start polling
      setTimeout(checkSync, 5000);

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
                  <p>Please wait while we sync data from Luma API...</p>
                  <div className="space-y-2">
                    <Progress value={syncProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      {syncProgress}% Complete
                    </p>
                  </div>
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