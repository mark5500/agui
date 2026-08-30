import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { useChat, type UIMessage } from '@tanstack/ai-react'
import { fetchServerSentEvents } from '@tanstack/ai-client'
import type { AnyClientTool } from '@tanstack/ai'

const AGENT_URL = import.meta.env.VITE_AGENT_URL ?? 'http://localhost:5001/api/agent'

/** One entry in the tool registry: the schema TanStack sends to the model, plus the
 * function that actually runs when the model calls it. */
export interface RegisteredTool {
  definition: AnyClientTool
  execute: (input: unknown) => unknown | Promise<unknown>
}

interface ChatContextValue {
  messages: Array<UIMessage>
  sendMessage: (text: string) => Promise<void>
  isLoading: boolean
  registerTool: (name: string, tool: RegisteredTool) => void
  unregisterTool: (name: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within a <ChatProvider>')
  return ctx
}

/**
 * Owns the single `useChat` instance for the app and a registry of client tools
 * contributed by whichever components are currently mounted (see `useAgentTool`).
 *
 * `@tanstack/ai-client`'s built-in `.client(execute)` auto-continuation only fires
 * for TanStack's own server-side "interrupt" outcome on RUN_FINISHED, not for a
 * foreign AG-UI server's plain TOOL_CALL_END + RUN_FINISHED{outcome:"success"} (see
 * README, and github.com/TanStack/ai/discussions/{784,911}). So tools are always
 * registered bare, and `onFinish` below is the generic replacement: it looks up
 * whichever tool call just reached `input-complete` in the registry by name, runs
 * its executor, and reports the result via `addToolResult` — which drives the next
 * turn itself, the same as the automatic path would have.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const connection = useMemo(() => fetchServerSentEvents(AGENT_URL), [])

  const [registry, setRegistry] = useState<Map<string, RegisteredTool>>(() => new Map())
  const registryRef = useRef(registry)
  registryRef.current = registry

  const registerTool = useCallback((name: string, tool: RegisteredTool) => {
    setRegistry((prev) => {
      const next = new Map(prev)
      next.set(name, tool)
      return next
    })
  }, [])

  const unregisterTool = useCallback((name: string) => {
    setRegistry((prev) => {
      if (!prev.has(name)) return prev
      const next = new Map(prev)
      next.delete(name)
      return next
    })
  }, [])

  const tools = useMemo(() => Array.from(registry.values(), (t) => t.definition), [registry])

  const addToolResultRef = useRef<
    | ((result: {
        toolCallId: string
        tool: string
        output: unknown
        state?: 'output-available' | 'output-error'
        errorText?: string
      }) => Promise<void>)
    | null
  >(null)
  const handledToolCallIds = useRef(new Set<string>())

  const { messages, sendMessage, isLoading, addToolResult } = useChat({
    connection,
    tools,
    onFinish: (message) => {
      for (const part of message.parts) {
        if (part.type !== 'tool-call') continue
        if (part.state !== 'input-complete') continue
        if (handledToolCallIds.current.has(part.id)) continue
        const registered = registryRef.current.get(part.name)
        if (!registered) continue
        handledToolCallIds.current.add(part.id)

        void (async () => {
          try {
            const output = await registered.execute(part.input)
            await addToolResultRef.current?.({ toolCallId: part.id, tool: part.name, output })
          } catch (error) {
            await addToolResultRef.current?.({
              toolCallId: part.id,
              tool: part.name,
              output: null,
              state: 'output-error',
              errorText: error instanceof Error ? error.message : String(error),
            })
          }
        })()
      }
    },
  })
  addToolResultRef.current = addToolResult

  const value = useMemo<ChatContextValue>(
    () => ({ messages, sendMessage, isLoading, registerTool, unregisterTool }),
    [messages, sendMessage, isLoading, registerTool, unregisterTool],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
