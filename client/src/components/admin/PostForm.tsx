import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPostSchema, type InsertPost } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface PostFormProps {
  onSubmit: (data: InsertPost) => Promise<void>;
  defaultValues?: Partial<InsertPost>;
}

export function PostForm({ onSubmit, defaultValues }: PostFormProps) {
  const { toast } = useToast();

  const form = useForm<InsertPost>({
    resolver: zodResolver(insertPostSchema),
    defaultValues: {
      title: "",
      summary: "",
      body: "",
      featuredImage: "",
      videoUrl: "",
      ctaLink: "",
      ctaLabel: "",
      isPinned: false,
      ...defaultValues
    }
  });

  const handleSubmit = async (data: InsertPost) => {
    try {
      await onSubmit(data);
      toast({
        title: "Success",
        description: "Post saved successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save post",
        variant: "destructive"
      });
    }
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
                <Input 
                  {...field} 
                  className="text-2xl font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                  placeholder="Post title" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="summary"
          render={({ field: { value, ...field }}) => (
            <FormItem className="space-y-1">
              <FormControl>
                <Textarea 
                  {...field} 
                  value={value || ""} 
                  placeholder="Add your summary here and this will be used as post meta description as well."
                  className="resize-none h-20 min-h-[80px] border-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
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
                  className="min-h-[400px] border-none [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror]:p-0 [&_.ProseMirror]:text-base"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 pt-4 border-t">
          <FormField
            control={form.control}
            name="featuredImage"
            render={({ field: { value, ...field }}) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-sm text-muted-foreground">Featured Image URL</FormLabel>
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
            name="videoUrl"
            render={({ field: { value, ...field }}) => (
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
              render={({ field: { value, ...field }}) => (
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
              render={({ field: { value, ...field }}) => (
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
        </div>

        <Button type="submit" className="w-full mt-6">
          Save Post
        </Button>
      </form>
    </Form>
  );
}