import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Person } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const memberFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  bio: z.string().optional(),
  personId: z.string().optional(),
  isAdmin: z.boolean().default(false),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

interface MemberFormProps {
  onSubmit: (data: MemberFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function MemberForm({ onSubmit, isSubmitting = false }: MemberFormProps) {
  const { toast } = useToast();
  const [showPersonSelect, setShowPersonSelect] = useState(false);

  // Fetch available people that don't have user accounts
  const { data: availablePeople = [], isLoading: isLoadingPeople } = useQuery<Person[]>({
    queryKey: ["/api/admin/people/unclaimed"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/people/unclaimed");
        if (!response.ok) {
          throw new Error("Failed to fetch unclaimed people");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching unclaimed people:", error);
        toast({
          title: "Error",
          description: "Failed to load available people. Please try again.",
          variant: "destructive",
        });
        return [];
      }
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
      await onSubmit(values);
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                A verification email will be sent to this address.
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
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us a bit about this member..."
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPersonSelect(!showPersonSelect)}
            className="mb-4"
          >
            {showPersonSelect ? "Hide People Selector" : "Link to Existing Person"}
          </Button>
          
          {showPersonSelect && (
            <FormField
              control={form.control}
              name="personId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to existing Luma person</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingPeople ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </div>
                      ) : availablePeople.length === 0 ? (
                        <div className="p-2 text-center text-muted-foreground">
                          No unclaimed people found
                        </div>
                      ) : (
                        availablePeople.map((person) => (
                          <SelectItem key={person.id} value={person.id.toString()}>
                            {person.userName || person.email}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    This will link the new user account to an existing person record from Luma.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="isAdmin"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 mt-1"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Admin Privileges</FormLabel>
                <FormDescription>
                  Grant this user admin access to the platform.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Member"
          )}
        </Button>
      </form>
    </Form>
  );
}