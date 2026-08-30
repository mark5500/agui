import { useEffect, useRef } from 'react'
import { toolDefinition } from '@tanstack/ai'
import type { z } from 'zod'
import { useChatContext } from './ChatProvider'

export interface UseAgentToolOptions<TInput, TOutput> {
  /** Tool name as the model sees it — must be stable for the lifetime of the component. */
  name: string
  description: string
  inputSchema: z.ZodType<TInput>
  outputSchema: z.ZodType<TOutput>
  /** Runs when the model calls this tool while the owning component is mounted. */
  execute: (input: TInput) => TOutput | Promise<TOutput>
}

/**
 * Registers a client-side tool for as long as the calling component is mounted —
 * the counterpart to assistant-ui's `useAssistantTool` / CopilotKit's `useFrontendTool`,
 * built on top of `ChatProvider`'s registry (see its comment for why: TanStack AI has
 * no such hook itself, only a single static `tools` array).
 *
 * `execute` is read from a ref on each call, so passing a fresh closure every render
 * (the common case — it usually closes over local state) does not re-register the tool.
 */
export function useAgentTool<TInput, TOutput>({
  name,
  description,
  inputSchema,
  outputSchema,
  execute,
}: UseAgentToolOptions<TInput, TOutput>) {
  const { registerTool, unregisterTool } = useChatContext()
  const executeRef = useRef(execute)
  executeRef.current = execute

  useEffect(() => {
    registerTool(name, {
      definition: toolDefinition({ name, description, inputSchema, outputSchema }),
      execute: (input) => executeRef.current(input as TInput),
    })
    return () => unregisterTool(name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, inputSchema, outputSchema, registerTool, unregisterTool])
}
