import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function CompanyMigration() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: { total: number; created: number; skipped: number };
  } | null>(null);

  // Clean up event source on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleMigration = () => {
    setIsLoading(true);
    setResult(null);
    setProgress(0);
    setStatusMessage('Starting migration...');
    
    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    // Create a new EventSource for SSE
    const eventSource = new EventSource('/api/admin/migrate-company-data');
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different event types
        if (data.type === 'status') {
          setStatusMessage(data.message);
          setProgress(data.progress || 0);
          
          // If we have data and progress is 100%, we're complete
          if (data.data && data.progress === 100) {
            setResult({
              success: true,
              message: 'Company data migration completed successfully!',
              details: data.data
            });
            
            toast({
              title: "Success",
              description: "Company data migration completed successfully!",
              variant: "default",
            });
            
            // Migration is done, clean up
            eventSource.close();
            eventSourceRef.current = null;
            setIsLoading(false);
          }
        } else if (data.type === 'error') {
          setResult({
            success: false,
            message: data.message || 'An error occurred during migration'
          });
          
          toast({
            title: "Error",
            description: data.message || 'An error occurred during migration',
            variant: "destructive",
          });
          
          // Error occurred, clean up
          eventSource.close();
          eventSourceRef.current = null;
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };
    
    eventSource.onerror = () => {
      console.error('SSE connection error');
      
      setResult({
        success: false,
        message: 'Connection error during migration'
      });
      
      toast({
        title: "Error",
        description: 'Connection error during migration',
        variant: "destructive",
      });
      
      // Clean up on error
      eventSource.close();
      eventSourceRef.current = null;
      setIsLoading(false);
    };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Company Data Migration</CardTitle>
        <CardDescription>
          Transfer company information from user profiles to dedicated company records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          This migration will:
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li>Extract company information from user profiles</li>
          <li>Create new company records in the companies table</li>
          <li>Link users to their respective companies as administrators</li>
          <li>Transfer company metadata (contact info, links, etc.)</li>
          <li>Preserve all existing data while setting up the new structure</li>
        </ul>
        
        {isLoading && (
          <div className="mt-6 mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">{statusMessage}</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {result && (
          <Alert className={`mt-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center">
              {result.success ? 
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" /> : 
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              }
              <AlertTitle>{result.success ? 'Success' : 'Error'}</AlertTitle>
            </div>
            <AlertDescription className="mt-2">
              {result.message}
              
              {result.details && (
                <div className="mt-2 text-sm">
                  <div>Total users processed: {result.details.total}</div>
                  <div>Companies created: {result.details.created}</div>
                  <div>Users skipped: {result.details.skipped}</div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleMigration} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Migration...
            </>
          ) : 'Run Company Migration'}
        </Button>
      </CardFooter>
    </Card>
  );
}