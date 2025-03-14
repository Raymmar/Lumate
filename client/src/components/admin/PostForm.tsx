import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPostSchema, insertTagSchema, type InsertPost, type InsertTag } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { UnsplashPicker } from "@/components/ui/unsplash-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PUBLIC_POSTS_QUERY_KEY } from "@/components/bulletin/PublicPostsTable";
import { X, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

interface PostFormProps {
  onSubmit: (data: InsertPost & { tags?: string[] }) => Promise<void>;
  defaultValues?: Partial<InsertPost & { tags?: string[] }>;
  isEditing?: boolean;
}

export function PostForm({ onSubmit, defaultValues, isEditing = false }: PostFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [isTagSearchFocused, setIsTagSearchFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize tags from defaultValues when component mounts or defaultValues changes
  useEffect(() => {
    if (defaultValues?.tags) {
      setTags(defaultValues.tags);
    }
  }, [defaultValues?.tags]);

  // Fetch existing tags
  const { data: existingTags } = useQuery<{ tags: { text: string }[] }>({
    queryKey: ["/api/tags"],
  });

  // Get unique list of existing tag texts
  const existingTagTexts = Array.from(new Set(existingTags?.tags.map(t => t.text) || []));

  // Filter tags based on input
  const filteredTags = currentTag === ""
    ? existingTagTexts
    : existingTagTexts.filter((tag) =>
        tag.toLowerCase().includes(currentTag.toLowerCase()) &&
        !tags.includes(tag.toLowerCase())
      );

  // Extend the schema to add required validations
  const extendedPostSchema = insertPostSchema.extend({
    title: z.string().min(1, "Title is required"),
    summary: z.string().min(1, "Summary is required"),
    body: z.string().min(1, "Content is required")
  });

  const form = useForm<InsertPost>({
    resolver: zodResolver(extendedPostSchema),
    defaultValues: {
      title: "",
      summary: "",
      body: "",
      featuredImage: "",
      videoUrl: "",
      ctaLink: "",
      ctaLabel: "",
      isPinned: false,
      membersOnly: false, // Add default value for membersOnly
      ...defaultValues
    }
  });

  const handleSubmit = async (data: InsertPost) => {
    if (isSubmitting) return; // Prevent double submission

    setIsSubmitting(true);
    try {
      // Include tags in the submission
      await onSubmit({ ...data, tags });

      // Invalidate the public posts query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: PUBLIC_POSTS_QUERY_KEY });

      toast({
        title: "Success",
        description: isEditing ? "Post updated successfully" : "Post published successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing ? "Failed to update post" : "Failed to publish post",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (!tags.includes(normalizedTag) && tags.length < 3) {
      setTags([...tags, normalizedTag]);
    } else if (tags.length >= 3) {
      toast({
        title: "Tag limit reached",
        description: "Maximum of 3 tags allowed per post",
        variant: "destructive"
      });
    }
    setCurrentTag("");
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      handleSelectTag(currentTag);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormControl>
                <Textarea
                  {...field}
                  className="text-2xl font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-0 h-auto overflow-hidden"
                  placeholder="Post title"
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="summary"
          render={({ field: { value, ...field } }) => (
            <FormItem className="space-y-0">
              <FormControl>
                <Textarea
                  {...field}
                  value={value || ""}
                  placeholder="Add your summary here..."
                  className="resize-none h-20 min-h-[80px] border-0 text-base px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-inherit"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormControl>
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  className="min-h-[320px] border-none [&_.ProseMirror]:min-h-[320px] [&_.ProseMirror]:text-base [&_.ProseMirror]:px-0 [&_.ProseMirror]:py-0 [&_.ProseMirror]:text-inherit"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags Section */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="relative">
            <Command className="rounded-lg overflow-visible border-0">
              <CommandInput
                placeholder="Search tags or create new ones..."
                value={currentTag}
                onValueChange={setCurrentTag}
                onKeyDown={handleAddTag}
                onFocus={() => setIsTagSearchFocused(true)}
                onBlur={() => {
                  // Small delay to allow clicking on suggestions
                  setTimeout(() => setIsTagSearchFocused(false), 200);
                }}
                className="border-0 focus:ring-0 focus-visible:ring-0"
              />
              {isTagSearchFocused && (currentTag || filteredTags.length > 0) && (
                <div className="absolute top-full left-0 right-0 bg-popover rounded-lg shadow-md mt-1 z-50">
                  <CommandEmpty>
                    {currentTag.trim() && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => handleSelectTag(currentTag)}
                      >
                        Create tag "{currentTag}"
                      </button>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredTags.map((tag) => (
                      <CommandItem
                        key={tag}
                        value={tag}
                        onSelect={handleSelectTag}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            tags.includes(tag.toLowerCase()) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tag}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              )}
            </Command>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <FormField
            control={form.control}
            name="featuredImage"
            render={({ field: { value, onChange } }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-sm text-muted-foreground">Featured Image</FormLabel>
                <FormControl>
                  <UnsplashPicker
                    value={value || ""}
                    onChange={onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="videoUrl"
            render={({ field: { value, ...field } }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-sm text-muted-foreground">Video URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="url"
                    value={value || ""}
                    placeholder="https://..."
                    className="border-0 bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="ctaLink"
              render={({ field: { value, ...field } }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm text-muted-foreground">CTA Link</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      value={value || ""}
                      placeholder="https://..."
                      className="border-0 bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ctaLabel"
              render={({ field: { value, ...field } }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm text-muted-foreground">CTA Label</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={value || ""}
                      placeholder="Learn more"
                      className="border-0 bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="isPinned"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg bg-muted/50 p-3 space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Pin Post</FormLabel>
                    <div className="text-xs text-muted-foreground">
                      Pinned posts will appear at the top of the list
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="membersOnly"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg bg-muted/50 p-3 space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Members Only</FormLabel>
                    <div className="text-xs text-muted-foreground">
                      This post will only be visible to logged-in members
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full mt-6"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? "Saving..." : "Publishing..."}
            </>
          ) : (
            isEditing ? "Save Changes" : "Publish Post"
          )}
        </Button>
      </form>
    </Form>
  );
}