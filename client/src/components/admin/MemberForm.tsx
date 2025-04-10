import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface UnclaimedPerson {
  id: number;
  api_id: string;
  email: string;
  userName: string | null;
  organizationName: string | null;
  jobTitle: string | null;
}

const memberFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch unclaimed people records
  const { data: unclaimedPeople, isLoading: isLoadingPeople } = useQuery<UnclaimedPerson[]>({
    queryKey: ["/api/admin/people/unclaimed"],
    queryFn: async () => {
      const response = await fetch("/api/admin/people/unclaimed");
      if (!response.ok) {
        throw new Error("Failed to fetch unclaimed people");
      }
      return response.json();
    },
  });

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

  const handleSubmit = async (values: MemberFormValues) => {
    try {
      setIsSubmitting(true);
      console.log("Creating new member:", values);
      
      const response = await apiRequest("/api/admin/members", "POST", values);
      
      toast({
        title: "Success",
        description: "Member account created successfully. Verification email has been sent.",
      });
      
      // Invalidate the relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      
      // Reset the form
      form.reset();
      
      // Call the onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to create member:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // When personId changes, update the email and displayName fields if needed
  const watchedPersonId = form.watch("personId");
  
  useEffect(() => {
    if (watchedPersonId && unclaimedPeople) {
      const selectedPerson = unclaimedPeople.find(p => p.id.toString() === watchedPersonId);
      
      if (selectedPerson) {
        // Only update fields if they're empty or if we're changing from one person record to another
        if (!form.getValues("email") || form.getValues("personId") !== watchedPersonId) {
          form.setValue("email", selectedPerson.email);
        }
        
        // Use userName as display name if available, otherwise create one from email
        if (!form.getValues("displayName") || form.getValues("personId") !== watchedPersonId) {
          if (selectedPerson.userName) {
            form.setValue("displayName", selectedPerson.userName);
          } else {
            // Create display name from email (part before @)
            const emailPrefix = selectedPerson.email.split('@')[0];
            const displayName = emailPrefix
              // Replace dots, underscores, and hyphens with spaces
              .replace(/[._-]/g, ' ')
              // Capitalize words
              .replace(/\b\w/g, l => l.toUpperCase());
            
            form.setValue("displayName", displayName);
          }
        }
      }
    }
  }, [watchedPersonId, unclaimedPeople, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="personId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link to existing profile (optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an existing profile" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">None (create without linking)</SelectItem>
                  {isLoadingPeople ? (
                    <SelectItem value="" disabled>
                      Loading profiles...
                    </SelectItem>
                  ) : (
                    unclaimedPeople?.map((person) => (
                      <SelectItem key={person.id} value={person.id.toString()}>
                        {person.userName || person.email} {person.organizationName ? `(${person.organizationName})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Linking to an existing profile will associate this user account with data from our event records.
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
                <Input placeholder="user@example.com" {...field} />
              </FormControl>
              <FormDescription>
                The email address must match the selected profile (if any).
              </FormDescription>
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
                <Input placeholder="Display Name" {...field} />
              </FormControl>
              <FormDescription>
                The name that will be displayed publicly.
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
                  placeholder="A short biography or description"
                  className="resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A brief description about the member.
              </FormDescription>
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
                <FormLabel>Admin privileges</FormLabel>
                <FormDescription>
                  Grant administrative privileges to this user.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Member
          </Button>
        </div>
      </form>
    </Form>
  );
}