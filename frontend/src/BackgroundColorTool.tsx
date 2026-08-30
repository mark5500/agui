import { useState, type ReactNode } from 'react'
import { z } from 'zod'
import { useAgentTool } from './chat/useAgentTool'

/**
 * Owns the background-color state itself and registers the tool that changes it —
 * nothing outside this component knows `set_background_color` exists. Demonstrates
 * `useAgentTool`: the tool is only callable by the model while this component is
 * mounted, and unregisters itself automatically on unmount.
 */
export function BackgroundColorTool({ children }: { children: ReactNode }) {
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null)

  useAgentTool({
    name: 'set_background_color',
    description:
      'Change the dashboard background color. Call this whenever the user asks to change, set, or update the background color.',
    inputSchema: z.object({
      color: z.string().describe('A CSS color name or hex code, e.g. "green" or "#00ff00".'),
    }),
    outputSchema: z.object({ success: z.boolean() }),
    execute: ({ color }) => {
      setBackgroundColor(color)
      return { success: true }
    },
  })

  return (
    <div
      className="flex flex-1 flex-col transition-colors duration-500"
      style={{ backgroundColor: backgroundColor ?? undefined }}
    >
      {children}
    </div>
  )
}
