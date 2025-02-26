import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL query parameter
    const params = new URLSearchParams(location.split('?')[1]);
    const tokenParam = params.get('token');
    
    if (!tokenParam) {
      setFormError('No verification token found in the URL');
      return;
    }
    
    setToken(tokenParam);
    // Automatically submit the verification when token is available
    if (tokenParam) {
      verifyMutation.mutate(tokenParam);
    }
  }, [location]);

  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
    },
    onError: (error: any) => {
      setFormError(error.message || 'There was an error verifying your email. Please try again or contact support.');
    }
  });

  const renderContent = () => {
    if (verifyMutation.isPending) {
      return (
        <>
          <CardHeader>
            <CardTitle>Verifying Your Email</CardTitle>
            <CardDescription>Please wait while we verify your email address</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-center">Processing verification...</p>
          </CardContent>
        </>
      );
    }

    if (verifyMutation.isError || formError) {
      return (
        <>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Verification Failed
            </CardTitle>
            <CardDescription>There was a problem verifying your email</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {formError || 'The verification link is invalid or has expired. Please request a new verification email.'}
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/register')} variant="outline" className="w-full">
                Register Again
              </Button>
              <Button onClick={() => navigate('/')} className="w-full">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </>
      );
    }

    if (verifyMutation.isSuccess) {
      return (
        <>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Email Verified Successfully
            </CardTitle>
            <CardDescription>Your account is now fully activated</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center py-4">
              Thank you for verifying your email. You can now access all features of your account.
            </p>
            <Button onClick={() => navigate('/profile')} className="w-full">
              Go to Your Profile
            </Button>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Return to Home
            </Button>
          </CardFooter>
        </>
      );
    }
    
    // Fallback content if no other state matches
    return (
      <>
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Processing your verification request</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p>If verification doesn't start automatically, please refresh the page.</p>
        </CardContent>
      </>
    );
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <Card>{renderContent()}</Card>
    </div>
  );
}