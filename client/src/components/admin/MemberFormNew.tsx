import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function MemberFormNew({ onSuccess, onCancel }: MemberFormProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue, 300);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initial query to fetch all unclaimed people (without search filter)
  const { data: allPeople, isLoading: isLoadingAllPeople } = useQuery<UnclaimedPerson[]>({
    queryKey: ["/api/admin/people/unclaimed"],
    queryFn: async () => {
      return await apiRequest('/api/admin/people/unclaimed', 'GET');
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Server-side filtered query, only run when debounced search is longer than 2 chars
  const { data: serverFilteredPeople, isLoading: isLoadingFiltered } = useQuery<UnclaimedPerson[]>({
    queryKey: ["/api/admin/people/unclaimed", debouncedSearchValue],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('search', debouncedSearchValue);
      return await apiRequest(`/api/admin/people/unclaimed?${params.toString()}`, 'GET');
    },
    enabled: debouncedSearchValue.length > 2, // Only run server search for 3+ character queries
  });

  // Determine which people list to use
  const peopleOptions = (() => {
    if (debouncedSearchValue.length > 2 && serverFilteredPeople) {
      return serverFilteredPeople;
    }
    return allPeople || [];
  })();

  // Add "Not linked" option to the list
  const formattedOptions = [
    { id: -1, value: "none", label: "Not linked to existing person" },
    ...(peopleOptions?.map(person => ({
      id: person.id,
      value: person.id.toString(),
      label: person.email,
      details: [
        person.userName,
        person.organizationName,
        person.jobTitle
      ].filter(Boolean).join(" • ")
    })) || [])
  ];

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
    
    // If "none" is selected, set personId to undefined
    if (submissionValues.personId === "none") {
      submissionValues.personId = undefined;
    }
    
    await createMemberMutation.mutateAsync(submissionValues);
  };

  // Handle person selection
  const handlePersonSelect = (value: string) => {
    form.setValue("personId", value);
    
    // If "none" is selected, clear email
    if (value === "none") {
      form.setValue("email", "");
      return;
    }
    
    // Find selected person
    const selectedPerson = peopleOptions.find(p => p.id.toString() === value);
    
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

  // Get the current value for the command input
  const selectedPersonId = form.watch("personId");
  const selectedPerson = formattedOptions.find(option => option.value === selectedPersonId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="personId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Link to existing person (optional)</FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="justify-between w-full h-auto py-2"
                    >
                      {selectedPerson ? (
                        <div className="flex flex-col items-start text-left">
                          <span>{selectedPerson.label}</span>
                          {selectedPerson.details && (
                            <span className="text-xs text-muted-foreground">{selectedPerson.details}</span>
                          )}
                        </div>
                      ) : (
                        "Select an existing person to link"
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[400px]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search by email, name, or organization..." 
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    {isLoadingAllPeople || isLoadingFiltered ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        <span>Loading...</span>
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>
                          {searchValue ? `No results found for "${searchValue}"` : "No people found"}
                        </CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {formattedOptions.map((option) => (
                              <CommandItem
                                key={option.id}
                                value={option.value}
                                onSelect={() => {
                                  handlePersonSelect(option.value);
                                  setOpen(false);
                                }}
                                className="flex items-start"
                              >
                                <div className="mr-2 flex h-5 items-center">
                                  <Check
                                    className={cn(
                                      "h-4 w-4",
                                      selectedPersonId === option.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span>{option.label}</span>
                                  {option.details && (
                                    <span className="text-xs text-muted-foreground">{option.details}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </>
                    )}
                  </Command>
                </PopoverContent>
              </Popover>
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
                  disabled={selectedPersonId && selectedPersonId !== "none"}
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