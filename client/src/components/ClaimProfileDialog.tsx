import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDebounce } from "@/hooks/useDebounce";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { X, Check } from "lucide-react";

interface ClaimProfileDialogProps {
  trigger?: React.ReactNode;
  personId?: string;
  onOpenChange?: (open: boolean) => void;
}

interface ClaimProfileResponse {
  status?: 'invited';
  message: string;
  nextEvent?: {
    title: string;
    startTime: string;
    url: string | null;
  };
}

interface EmailSuggestion {
  id: number;
  api_id: string;
  email: string;
  userName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  isClaimed: boolean;
}

export function ClaimProfileDialog({ trigger, personId, onOpenChange }: ClaimProfileDialogProps) {
  const [email, setEmail] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const debouncedEmailQuery = useDebounce(inputValue, 300);
  const { toast } = useToast();

  // Email suggestions query
  const { data: emailSuggestions, isLoading: isSuggestionsLoading } = useQuery({
    queryKey: ['/api/people/search-emails', debouncedEmailQuery],
    queryFn: async () => {
      if (!debouncedEmailQuery || debouncedEmailQuery.length < 2) {
        return { results: [] };
      }
      const response = await fetch(`/api/people/search-emails?query=${encodeURIComponent(debouncedEmailQuery)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch email suggestions');
      }
      return response.json();
    },
    enabled: debouncedEmailQuery.length >= 2,
  });

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setInputValue('');
      setEmail('');
      setSuggestionsOpen(false);
    }
  }, [open]);

  const claimProfileMutation = useMutation({
    mutationFn: async (data: { email: string; personId?: string }) => {
      const response = await fetch('/api/auth/claim-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      if (!response.ok && !responseData.status) {
        throw new Error(responseData.error || 'Failed to claim profile');
      }
      return responseData as ClaimProfileResponse;
    },
    onSuccess: (data) => {
      // Handle successful profile claim
      if (data.status === 'invited') {
        toast({
          title: "Invitation Sent",
          description: (
            <>
              {data.message}
              {data.nextEvent?.url && (
                <div className="mt-2">
                  <a 
                    href={data.nextEvent.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Click here to view the event details
                  </a>
                </div>
              )}
            </>
          ),
        });
      } else {
        toast({
          title: "Verification Email Sent",
          description: "Please check your email to verify your profile claim.",
        });
      }
      setEmail('');
      setInputValue('');
      setOpen(false);
      if (personId) {
        queryClient.invalidateQueries({ queryKey: ['/api/people', personId] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/check-profile', personId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    claimProfileMutation.mutate({ email: email || inputValue, personId });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleSuggestionSelect = (suggestion: EmailSuggestion) => {
    if (suggestion.isClaimed) {
      toast({
        title: "Profile Already Claimed",
        description: "This profile has already been claimed. Please use another email address or reset your password if you've forgotten it.",
        variant: "destructive",
      });
      return;
    }
    
    setEmail(suggestion.email);
    setInputValue(suggestion.email);
    setSuggestionsOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Claim Profile</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim Your Profile</DialogTitle>
          <DialogDescription className="space-y-4">
            <p>
              If you've attended one of our events in the past, enter your email to claim your member profile.
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>
                Enter your{' '}
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="underline decoration-dotted cursor-help">lu.ma</span>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      align="start"
                      sideOffset={5}
                    >
                      <p className="max-w-xs">Make sure this is the same email you use to register for our events</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {' '}email to claim your account
              </li>
              <li>If we find a match, we'll send a confirmation email</li>
              <li>Click that email to activate your account</li>
              <li>Create a password</li>
              <li>Log in</li>
            </ol>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Command className="rounded-md border overflow-visible">
                <CommandInput
                  id="email"
                  value={inputValue}
                  onValueChange={(value) => {
                    setInputValue(value);
                    setEmail(''); // Clear selected email when typing
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  placeholder="Enter your email"
                  className="border-0"
                />
                {suggestionsOpen && inputValue.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md z-50">
                    <CommandList>
                      {isSuggestionsLoading ? (
                        <div className="py-6 text-center text-sm">Loading suggestions...</div>
                      ) : (
                        <>
                          <CommandEmpty>No matching emails found</CommandEmpty>
                          <CommandGroup>
                            {emailSuggestions?.results?.map((suggestion: EmailSuggestion) => (
                              <CommandItem
                                key={suggestion.id}
                                value={suggestion.email}
                                onSelect={() => handleSuggestionSelect(suggestion)}
                                className="cursor-pointer"
                                disabled={suggestion.isClaimed}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={suggestion.avatarUrl || undefined} alt={suggestion.fullName || suggestion.userName || suggestion.email} />
                                    <AvatarFallback>
                                      {(suggestion.fullName || suggestion.userName || suggestion.email).substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-medium truncate">
                                      {suggestion.email}
                                    </span>
                                    {(suggestion.fullName || suggestion.userName) && (
                                      <span className="text-xs text-muted-foreground truncate">
                                        {suggestion.fullName || suggestion.userName}
                                      </span>
                                    )}
                                  </div>
                                  <div className="ml-auto flex items-center">
                                    {suggestion.isClaimed ? (
                                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 py-0.5 px-2 rounded-full">
                                        Claimed
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 py-0.5 px-2 rounded-full">
                                        Available
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </div>
                )}
              </Command>
            </div>
          </div>
          <Button
            type="submit"
            disabled={claimProfileMutation.isPending || (!email && !inputValue)}
            className="w-full"
          >
            {claimProfileMutation.isPending ? "Sending..." : "Send Verification Email"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}