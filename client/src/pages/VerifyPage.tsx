import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VerifyPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const token = searchParams.get('token');

        if (!token) {
          throw new Error('Verification token is missing');
        }

        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Verification failed');
        }

        toast({
          title: "Success",
          description: "Your profile has been verified successfully.",
        });

        // Redirect to dashboard after successful verification
        setLocation('/');
      } catch (error) {
        console.error('Verification error:', error);
        toast({
          title: "Verification Failed",
          description: error instanceof Error ? error.message : "Failed to verify your profile",
          variant: "destructive",
        });
        setLocation('/');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [toast, setLocation]);

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying your profile...</p>
        </div>
      </div>
    );
  }

  return null;
}