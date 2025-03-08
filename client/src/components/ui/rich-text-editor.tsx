import * as React from "react"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { cn } from "@/lib/utils"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Minus,
  Link as LinkIcon,
} from 'lucide-react'
import { Toggle } from './toggle'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "./button"
import { Input } from "./input"

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const MenuButton = ({ 
  isActive, 
  onClick, 
  children 
}: { 
  isActive?: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) => (
  <Toggle
    size="sm"
    pressed={isActive}
    onPressedChange={onClick}
    className="h-8 px-2 lg:px-3"
  >
    {children}
  </Toggle>
);

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = React.useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = React.useState(false);
  const linkInputRef = React.useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3]
        }
      }),
      Link.configure({
        protocols: ['http', 'https', 'mailto', 'tel'],
        openOnClick: true,
        validate: href => /^(https?:\/\/|mailto:|tel:)/.test(href),
        HTMLAttributes: {
          class: 'text-primary underline decoration-primary cursor-pointer',
          rel: 'noopener noreferrer',
          target: '_blank'
        }
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    }
  });

  if (!editor) {
    return null;
  }

  const handleSetLink = (e: React.MouseEvent | React.FormEvent) => {
    // Prevent the event from bubbling up and triggering form submissions
    e.preventDefault();
    e.stopPropagation();

    const url = linkUrl.trim();
    if (!url) return;

    // Add https:// if no protocol is specified
    const formattedUrl = /^(https?:\/\/|mailto:|tel:)/.test(url) 
      ? url 
      : `https://${url}`;

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: formattedUrl })
      .run();

    setIsLinkPopoverOpen(false);
    setLinkUrl('');
  };

  const handleRemoveLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    editor.chain().focus().unsetLink().run();
    setIsLinkPopoverOpen(false);
    setLinkUrl('');
  };

  const handleLinkButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { href } = editor.getAttributes('link');
    if (href) {
      setLinkUrl(href);
    }
    setIsLinkPopoverOpen(true);
  };

  // Focus the input when the popover opens
  React.useEffect(() => {
    if (isLinkPopoverOpen && linkInputRef.current) {
      setTimeout(() => {
        linkInputRef.current?.focus();
        linkInputRef.current?.select();
      }, 0);
    }
  }, [isLinkPopoverOpen]);

  return (
    <div 
      className={cn("flex flex-col gap-0 border rounded-md", className)}
      onClick={(e) => {
        e.preventDefault();
        editor.chain().focus().run();
      }}
    >
      <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-muted/50">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        >
          <Bold className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        >
          <Italic className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        >
          <List className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
        >
          <Quote className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          isActive={false}
        >
          <Minus className="h-4 w-4" />
        </MenuButton>

        <Popover 
          open={isLinkPopoverOpen} 
          onOpenChange={setIsLinkPopoverOpen}
          modal={true}
        >
          <PopoverTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('link')}
              onPressedChange={handleLinkButtonClick}
              className="h-8 px-2 lg:px-3"
            >
              <LinkIcon className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80" 
            align="start"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  ref={linkInputRef}
                  placeholder="Enter URL"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSetLink(e);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <Button 
                  onClick={handleSetLink} 
                  type="button"
                >
                  {editor.isActive('link') ? 'Update' : 'Add'}
                </Button>
              </div>
              {editor.isActive('link') && (
                <Button 
                  variant="outline" 
                  onClick={handleRemoveLink}
                  className="w-full"
                >
                  Remove Link
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none cursor-text dark:prose-invert [&_*]:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:text-base [&_.ProseMirror]:px-0 [&_.ProseMirror]:py-0 [&_.ProseMirror]:text-foreground [&_.ProseMirror_ul]:space-y-0.5 [&_.ProseMirror_ol]:space-y-0.5 [&_.ProseMirror_li_p]:my-0 [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:decoration-primary" 
      />
    </div>
  )
}