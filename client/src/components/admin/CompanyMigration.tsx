import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiRequest } from '@/lib/api';

export const CompanyMigration = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigration = async () => {
    try {
      setIsMigrating(true);
      setProgress(0);
      setStatus('Starting migration...');
      setError(null);
      setResult(null);

      // Create EventSource to handle server-sent events
      const eventSource = new EventSource('/api/admin/migrate-company-data');
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Migration update:', data);
          
          if (data.type === 'status') {
            setStatus(data.message);
            setProgress(data.progress);
            
            if (data.progress === 100) {
              setResult(data.data);
              eventSource.close();
              setIsMigrating(false);
            }
          } else if (data.type === 'error') {
            setError(data.message);
            setProgress(0);
            eventSource.close();
            setIsMigrating(false);
          }
        } catch (e) {
          console.error('Error processing server event:', e);
        }
      };
      
      eventSource.onerror = (e) => {
        console.error('EventSource error:', e);
        setError('Connection error. Please try again.');
        eventSource.close();
        setIsMigrating(false);
      };
    } catch (error) {
      console.error('Migration error:', error);
      setError('Failed to start migration process');
      setIsMigrating(false);
    }
  };

  return (
    <Card className="w-full mb-8">
      <CardHeader>
        <CardTitle>Company Data Migration</CardTitle>
        <CardDescription>
          Migrate company information from user profiles to the new companies table
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status && <p className="mb-4">{status}</p>}
        
        {isMigrating && (
          <div className="mb-4">
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {result && (
          <div className="p-4 bg-muted rounded-md mb-4">
            <h4 className="font-medium mb-2">Migration Results:</h4>
            <ul className="pl-5 list-disc">
              <li>Total users processed: {result.total}</li>
              <li>Companies created: {result.created}</li>
              <li>Users skipped: {result.skipped}</li>
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleMigration} 
          disabled={isMigrating}
          variant={result ? "outline" : "default"}
        >
          {isMigrating ? 'Migrating...' : result ? 'Run Migration Again' : 'Start Migration'}
        </Button>
      </CardFooter>
    </Card>
  );
};