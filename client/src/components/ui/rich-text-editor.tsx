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
        validate: href => /^https?:\/\//.test(href) || /^mailto:/.test(href) || /^tel:/.test(href),
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
    return null
  }

  const handleSetLink = (e?: React.MouseEvent | React.FormEvent) => {
    e?.preventDefault();
    const url = linkUrl.trim();

    // Add https:// if no protocol is specified
    const formattedUrl = /^(https?:\/\/|mailto:|tel:)/.test(url) 
      ? url 
      : `https://${url}`;

    if (formattedUrl === 'https://' || !url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link')
        .setLink({ href: formattedUrl })
        .run();
    }
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
    setTimeout(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }, 0);
  };

  return (
    <div 
      className={cn("flex flex-col gap-0 border rounded-md", className)}
      onClick={() => editor.chain().focus().run()}
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
        >
          <PopoverTrigger asChild>
            <button
              className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-2 lg:px-3",
                editor.isActive('link')
                  ? "bg-accent text-accent-foreground hover:bg-accent/80"
                  : "hover:bg-muted hover:text-muted-foreground"
              )}
              onClick={handleLinkButtonClick}
              type="button"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <form onSubmit={handleSetLink} className="flex gap-2">
              <Input
                ref={linkInputRef}
                placeholder="Enter URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <Button type="submit">
                {editor.isActive('link') ? 'Update' : 'Add'}
              </Button>
            </form>
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