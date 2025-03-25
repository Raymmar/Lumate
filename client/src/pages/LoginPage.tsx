import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// Extremely aggressive approach: Define a global refresh function
const REFRESH_SCRIPT = `
window._forceHardRefresh = function() {
  console.log("EXECUTING DIRECT PAGE REFRESH");
  // Clear all caches synchronously
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log("ALL BROWSER STORAGE CLEARED");
  } catch (e) {
    console.error("Error clearing storage:", e);
  }
  
  // Set a flag that will survive the refresh
  try {
    document.cookie = "force_refresh=true; path=/";
  } catch (e) {
    console.error("Error setting cookie:", e);
  }
  
  // Force the browser to reload the page from the server, not from cache
  window.location.href = window.location.origin + '?t=' + Date.now();
  return false; // Prevent default action if used in event handlers
};
`;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  // Inject our refresh script directly into the page
  useEffect(() => {
    // Add the script element to the document
    const scriptEl = document.createElement('script');
    scriptEl.textContent = REFRESH_SCRIPT;
    document.head.appendChild(scriptEl);
    
    // Cleanup function to remove the script
    return () => {
      document.head.removeChild(scriptEl);
    };
  }, []);
  
  // Handle redirect if already logged in using useEffect
  useEffect(() => {
    if (user) {
      console.log("USER ALREADY LOGGED IN - TRIGGERING DIRECT BROWSER REFRESH");
      
      // Use direct window function instead of importing utils
      // This is the most direct approach possible
      if (window._forceHardRefresh) {
        window._forceHardRefresh();
      } else {
        // Fallback to previous approach
        import('@/lib/utils').then(({ forceCompleteReset }) => {
          forceCompleteReset();
        });
      }
    }
  }, [user]);

  // If still loading auth state, return null to avoid flashing content
  if (user === undefined) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      // The auth hook will handle the full page refresh
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);

    try {
      const response = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      if (!response.ok) {
        throw new Error('Failed to request password reset');
      }

      toast({
        title: "Check your email",
        description: "If an account exists with that email, we've sent password reset instructions.",
      });

      setShowResetDialog(false);
      setResetEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to request password reset",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Log in to access your profile and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log in"
                )}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full mt-2"
                onClick={() => setShowResetDialog(true)}
              >
                Forgot your password?
              </Button>
            </form>
          </CardContent>
        </Card>

        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send you instructions to reset your password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset instructions...
                  </>
                ) : (
                  "Send Reset Instructions"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}