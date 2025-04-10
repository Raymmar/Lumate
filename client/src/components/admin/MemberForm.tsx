import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UnclaimedPerson {
  id: number;
  api_id: string;
  email: string;
  userName: string | null;
  organizationName: string | null;
  jobTitle: string | null;
}

// Create form schema - only allow bio and admin flag to be set
const memberFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  bio: z.string().optional(),
  personId: z.string().optional(),
  isAdmin: z.boolean().default(false),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

interface MemberFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MemberForm({ onSuccess, onCancel }: MemberFormProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Auto focus search input on component mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Fetch all people once
  const { data: allPeople = [], isLoading: isLoadingPeople } = useQuery<UnclaimedPerson[]>({
    queryKey: ["/api/admin/people/unclaimed"],
    queryFn: async () => {
      return await apiRequest('/api/admin/people/unclaimed', 'GET');
    },
  });
  
  // Simple client-side filtering
  const filteredPeople = useMemo(() => {
    if (!searchQuery) {
      return allPeople;
    }
    
    const lowerSearch = searchQuery.toLowerCase().trim();
    if (lowerSearch === '') return allPeople;
    
    return allPeople.filter(person => {
      // Check email
      if (person.email && person.email.toLowerCase().includes(lowerSearch)) return true;
      
      // Check username
      if (person.userName && person.userName.toLowerCase().includes(lowerSearch)) return true;
      
      // Check organization name
      if (person.organizationName && person.organizationName.toLowerCase().includes(lowerSearch)) return true;
      
      // Check job title
      if (person.jobTitle && person.jobTitle.toLowerCase().includes(lowerSearch)) return true;
      
      return false;
    });
  }, [searchQuery, allPeople]);

  // Form definition
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      email: "",
      bio: "",
      personId: undefined,
      isAdmin: false,
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: async (values: MemberFormValues) => {
      return await apiRequest("/api/admin/members", "POST", values);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "New member account created. A verification email has been sent.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create member",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (values: MemberFormValues) => {
    // Clean up personId field before submission
    const submissionValues = { ...values };
    
    // If "none" or "loading" is selected, set personId to undefined
    if (submissionValues.personId === "none" || submissionValues.personId === "loading") {
      submissionValues.personId = undefined;
    }
    
    await createMemberMutation.mutateAsync(submissionValues);
  };

  // Handle person selection
  const handlePersonSelect = (personId: string) => {
    // If "none" is selected, clear personId
    if (personId === "none" || personId === "loading") {
      setSelectedPersonId(null);
      form.setValue("email", "");
      return;
    }
    
    setSelectedPersonId(personId);
    
    // Find selected person
    const selectedPerson = allPeople.find((p: UnclaimedPerson) => p.id.toString() === personId);
    
    if (selectedPerson) {
      form.setValue("email", selectedPerson.email);
      // No need to set display name as it will be synced from Luma
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="personId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Search for person by email</FormLabel>
              <div className="space-y-2">
                {/* Main search input - always visible */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input
                      ref={searchInputRef}
                      placeholder="Search by email, name, or organization..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10"
                      autoFocus
                    />
                  </FormControl>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5"
                      type="button"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                
                {/* Selected person display */}
                {selectedPersonId && selectedPersonId !== "none" && (
                  <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                    <div>
                      <div className="font-medium text-sm">
                        {filteredPeople.find(p => p.id.toString() === selectedPersonId)?.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {filteredPeople.find(p => p.id.toString() === selectedPersonId)?.userName || 
                         filteredPeople.find(p => p.id.toString() === selectedPersonId)?.organizationName}
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedPersonId(null);
                        field.onChange(undefined);
                        form.setValue("email", "");
                        // Refocus search input
                        if (searchInputRef.current) {
                          searchInputRef.current.focus();
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Results panel */}
                {searchQuery && !selectedPersonId && (
                  <div ref={dropdownRef} className="border rounded-md shadow-sm max-h-[250px] overflow-y-auto">
                    {isLoadingPeople ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        <span>Loading...</span>
                      </div>
                    ) : filteredPeople && filteredPeople.length > 0 ? (
                      <div>
                        {filteredPeople.slice(0, 10).map((person: UnclaimedPerson) => (
                          <div 
                            key={person.id} 
                            className="px-3 py-2 cursor-pointer hover:bg-muted border-b last:border-b-0"
                            onClick={() => {
                              field.onChange(person.id.toString());
                              handlePersonSelect(person.id.toString());
                            }}
                          >
                            <div className="font-medium">{person.email}</div>
                            {(person.userName || person.organizationName) && (
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                                {person.userName && <span>{person.userName}</span>}
                                {person.organizationName && <span>· {person.organizationName}</span>}
                                {person.jobTitle && <span>· {person.jobTitle}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div 
                        className="px-3 py-3 cursor-pointer hover:bg-muted text-sm"
                        onClick={() => {
                          field.onChange("none");
                          handlePersonSelect("none");
                          form.setValue("email", searchQuery);
                        }}
                      >
                        <div className="font-medium">Email not found - send event invitation</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          "{searchQuery}" will be added to the system after the next Luma sync
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <FormDescription>
                Search for an existing person by email. If not found, we'll send an event invitation to get them in the system.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="user@example.com"
                  {...field}
                  disabled={!!selectedPersonId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Display name info section - read only */}
      {selectedPersonId && selectedPersonId !== "none" && (
        <div className="border rounded-md p-4 space-y-2">
          <h3 className="font-medium text-sm">Display Name</h3>
          <div className="text-sm">
            {filteredPeople.find((p) => p.id.toString() === selectedPersonId)?.userName || 
              "Name will be synchronized from Luma"}
          </div>
          <p className="text-muted-foreground text-xs">
            Display name is synchronized from Luma and cannot be edited here.
          </p>
        </div>
      )}

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="A brief bio for the member"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isAdmin"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Admin access</FormLabel>
                <FormDescription>
                  Grant this member administrative privileges.
                </FormDescription>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createMemberMutation.isPending || form.formState.isSubmitting}
          >
            {createMemberMutation.isPending ? "Processing..." : 
              selectedPersonId && selectedPersonId !== "none" 
                ? "Create Member Account" 
                : "Create Account & Send Invitation"}
          </Button>
        </div>
      </form>
    </Form>
  );
}