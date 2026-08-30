import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useChatContext } from './chat/ChatProvider'
import { SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Chat() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, isLoading } = useChatContext()

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
                          <span
                            key={i}
                            className={
                              'inline-block rounded-lg px-3 py-2 text-sm ' +
                              (m.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground')
                            }
                          >
                            {part.content}
                          </span>
                        )
                      }
                      if (part.type === 'tool-call') {
                        return (
                          <Badge key={i} variant="outline" className="font-mono text-xs font-normal">
                            🎨 {part.name}({part.arguments})
                          </Badge>
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
