import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChatContext } from './chat/ChatProvider'
import { SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function Chat() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, isLoading } = useChatContext()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Depends on `messages` itself, not just its length, so this also fires on
  // every streamed token (each delta produces a new `messages` array), not just
  // when a whole new message is appended.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage(text)
  }

  return (
    <>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="font-semibold">Chat</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-3 p-4">
            {messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => (
                <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className="flex max-w-[85%] flex-col items-start gap-1">
                    {m.parts.map((part, i) => {
                      if (part.type === 'text' && part.content) {
                        return (
                          <div
                            key={i}
                            className={
                              'prose prose-sm max-w-none rounded-lg px-3 py-2 ' +
                              'prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1.5 ' +
                              'prose-pre:my-1.5 prose-pre:bg-black/10 prose-code:before:content-none prose-code:after:content-none ' +
                              (m.role === 'user'
                                ? 'prose-invert bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground')
                            }
                          >
                            <Markdown remarkPlugins={[remarkGfm]}>{part.content}</Markdown>
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              ))}
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ask the agent to add to-dos or change the background color.
              </p>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Say something…"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>
      </SidebarFooter>
    </>
  )
}
