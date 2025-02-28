import { useState } from "react";
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
import { RefreshCcw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminMenu() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('/_internal/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset and sync data');
      }

      toast({
        title: "Reset & Sync Started",
        description: "Database has been cleared. Fresh data is being synced from Luma API. This may take several minutes to complete.",
        variant: "default",
      });

      // Reload the page after a longer delay to allow initial sync to complete
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } catch (error) {
      console.error('Error resetting and syncing data:', error);
      toast({
        title: "Reset & Sync Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
      setIsResetDialogOpen(false);
    }
  };

  return (
    <>
      <div className="px-4">
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

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
              Reset & Sync Luma Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will clear all existing data and fetch fresh data from the Luma API.
              <br /><br />
              <strong>This action cannot be undone.</strong> The database will be cleared and all IDs will be reset.
              The sync process may take several minutes to complete.
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