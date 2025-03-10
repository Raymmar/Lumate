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
  Link2Off,
} from 'lucide-react'
import { Toggle } from './toggle'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  const [linkUrl, setLinkUrl] = React.useState('')
  const [showLinkInput, setShowLinkInput] = React.useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3]
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline decoration-primary cursor-pointer'
        }
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    }
  })

  const setLink = React.useCallback(() => {
    if (!editor) return

    // If there's no URL, remove the link
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run()
      return
    }

    // Add https:// if no protocol is specified
    const url = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`

    editor.chain().focus().setLink({ href: url }).run()
    setLinkUrl('')
    setShowLinkInput(false)
  }, [editor, linkUrl])

  if (!editor) {
    return null
  }

  const isLinkActive = editor.isActive('link')

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

        <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2 lg:px-3",
                isLinkActive && "bg-accent"
              )}
            >
              {isLinkActive ? (
                <Link2Off className="h-4 w-4" />
              ) : (
                <LinkIcon className="h-4 w-4" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setLink()
                  }
                }}
              />
              <Button onClick={setLink}>Add</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none min-h-[200px] p-0 focus:outline-none cursor-text dark:prose-invert [&_*]:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:text-base [&_.ProseMirror]:px-0 [&_.ProseMirror]:py-0 [&_.ProseMirror]:text-foreground [&_.ProseMirror_ul]:space-y-0.5 [&_.ProseMirror_ol]:space-y-0.5 [&_.ProseMirror_li_p]:my-0" 
      />
    </div>
  )
}