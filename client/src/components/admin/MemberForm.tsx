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
import { useDebounce } from "@/hooks/useDebounce";

interface UnclaimedPerson {
  id: number;
  api_id: string;
  email: string;
  userName: string | null;
  organizationName: string | null;
  jobTitle: string | null;
}

// Create form schema
const memberFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  displayName: z.string().min(1, "Display name is required"),
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
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Increased debounce time
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        // Don't clear the search query when dropdown is closed
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initial query to fetch all unclaimed people (without search filter)
  const { data: allPeople, isLoading: isLoadingAllPeople } = useQuery<UnclaimedPerson[]>({
    queryKey: ["/api/admin/people/unclaimed"],
    queryFn: async () => {
      return await apiRequest('/api/admin/people/unclaimed', 'GET');
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Server-side filtered query, only run when debounced search is longer than 2 chars
  const { data: serverFilteredPeople, isLoading: isLoadingServerSearch } = useQuery<UnclaimedPerson[]>({
    queryKey: ["/api/admin/people/unclaimed", debouncedSearchQuery],
    queryFn: async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        params.append('search', debouncedSearchQuery);
        return await apiRequest(`/api/admin/people/unclaimed?${params.toString()}`, 'GET');
      } finally {
        setIsSearching(false);
      }
    },
    enabled: debouncedSearchQuery.length > 2, // Only run server search for 3+ character queries
  });
  
  // Client-side filtering for quick response
  const filteredPeople = useMemo(() => {
    // If we have server results for a search longer than 2 chars, use them
    if (debouncedSearchQuery.length > 2 && serverFilteredPeople) {
      return serverFilteredPeople;
    }
    
    // For short searches or while server is loading, filter client-side
    if (searchQuery && allPeople) {
      const lowerSearch = searchQuery.toLowerCase().trim();
      
      // For empty search, just return all people
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
    }
    
    // Default to all people if no search
    return allPeople || [];
  }, [searchQuery, debouncedSearchQuery, allPeople, serverFilteredPeople]);
  
  // Combined loading state
  const isLoadingPeople = isLoadingAllPeople || isLoadingServerSearch || isSearching;

  // Form definition
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      email: "",
      displayName: "",
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
    
    // Find selected person in either allPeople or filteredPeople
    const selectedPerson = 
      allPeople?.find(p => p.id.toString() === personId) || 
      serverFilteredPeople?.find(p => p.id.toString() === personId);
    
    if (selectedPerson) {
      form.setValue("email", selectedPerson.email);
      
      // Set display name based on available data
      if (selectedPerson.userName) {
        form.setValue("displayName", selectedPerson.userName);
      } else {
        const emailName = selectedPerson.email.split('@')[0];
        form.setValue("displayName", emailName.replace(/[.\_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
      }
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
              <FormLabel>Link to existing person (optional)</FormLabel>
              <div className="relative" ref={dropdownRef}>
                <FormControl>
                  <div 
                    className={`flex items-center justify-between border rounded-md h-10 px-3 py-2 text-sm ${
                      selectedPersonId ? 'bg-muted' : 'bg-background'
                    }`}
                    onClick={() => {
                      // Toggle the dropdown state
                      setIsDropdownOpen(!isDropdownOpen);
                      // Focus the search input when opened
                      if (!isDropdownOpen) {
                        setTimeout(() => {
                          const searchInput = document.querySelector('[placeholder="Search by email, name, or organization..."]') as HTMLInputElement;
                          if (searchInput) searchInput.focus();
                        }, 0);
                      }
                    }}
                  >
                    <span className={selectedPersonId ? "" : "text-muted-foreground"}>
                      {selectedPersonId && selectedPersonId !== "none" ? (
                        filteredPeople.find(
                          (p) => p.id.toString() === selectedPersonId
                        )?.email || "Selected person"
                      ) : (
                        "Select an existing person to link"
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </FormControl>
                
                {isDropdownOpen && (
                  <div className="absolute w-full z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                    {/* Sticky search at top */}
                    <div className="sticky top-0 bg-background p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by email, name, or organization..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-9 text-sm"
                          autoFocus
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-2.5"
                            type="button"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Not linked option */}
                    <div 
                      className={`px-2 py-2 cursor-pointer hover:bg-muted ${
                        selectedPersonId === "none" ? "bg-muted" : ""
                      }`}
                      onClick={() => {
                        field.onChange("none");
                        handlePersonSelect("none");
                        setIsDropdownOpen(false);
                      }}
                    >
                      Not linked to existing person
                    </div>
                    
                    {/* Results */}
                    {isLoadingPeople ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        <span>Loading...</span>
                      </div>
                    ) : filteredPeople && filteredPeople.length > 0 ? (
                      <div>
                        {filteredPeople.map((person: UnclaimedPerson) => (
                          <div 
                            key={person.id} 
                            className={`px-2 py-2 cursor-pointer hover:bg-muted truncate ${
                              selectedPersonId === person.id.toString() ? "bg-muted" : ""
                            }`}
                            onClick={() => {
                              field.onChange(person.id.toString());
                              handlePersonSelect(person.id.toString());
                              setIsDropdownOpen(false);
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
                    ) : searchQuery ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        No results found for "{searchQuery}"
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        No unclaimed people found
                      </div>
                    )}
                  </div>
                )}
              </div>
              <FormDescription>
                If you select an existing person, their email will be automatically filled in.
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

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Display name" {...field} />
              </FormControl>
              <FormDescription>
                The name that will be shown on the member's profile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
            {createMemberMutation.isPending ? "Creating..." : "Create Member"}
          </Button>
        </div>
      </form>
    </Form>
  );
}