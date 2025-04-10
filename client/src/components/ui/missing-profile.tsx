import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ExternalLink } from "lucide-react";

interface MissingProfileProps {
  email?: string;
  isPaidUser?: boolean;
  displayName?: string;
}

export function MissingProfile({ email, isPaidUser, displayName }: MissingProfileProps) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <CardTitle>Incomplete Profile</CardTitle>
        </div>
        <CardDescription>
          {isPaidUser 
            ? "Your profile is missing some information from Luma."
            : "This profile is missing required information from Luma."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          {displayName 
            ? `Hello ${displayName}! `
            : ""}
          {isPaidUser 
            ? "To complete your profile, please update your Luma account with your display name."
            : "To view this profile, the user needs to set up their Luma profile."}
        </p>
        
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 rounded-lg p-4">
          <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-2">Why this happens</h3>
          <p className="text-sm text-muted-foreground">
            Sarasota Tech uses Luma to manage event registrations and member profiles. 
            To display a complete profile here, members need to have their Luma profile 
            properly configured with a display name.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="default" className="w-full">
          <a 
            href="https://lu.ma/settings" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            <span>Update Luma Profile</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}