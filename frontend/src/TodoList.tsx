import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { z } from 'zod'
import { useAgentTool } from './chat/useAgentTool'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface Todo {
  id: string
  text: string
  done: boolean
}

/**
 * Owns its own to-do state and registers four tools for it — `list_todos`,
 * `add_todo`, `complete_todo`, `remove_todo` — none of which exist anywhere else
 * in the app. `complete_todo`/`remove_todo` match by text rather than id, since
 * the model has no reliable way to know an item's id unless it was the one that
 * added it (a human could have added the item by hand instead); `list_todos`
 * lets it check current state — including items added by hand — before acting,
 * instead of only ever mutating blind.
 */
export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [draft, setDraft] = useState('')

  function addTodo(text: string) {
    const todo: Todo = { id: crypto.randomUUID(), text, done: false }
    setTodos((prev) => [...prev, todo])
    return todo
  }

  function findByText(needle: string) {
    const lower = needle.toLowerCase()
    return todos.find((t) => t.text.toLowerCase().includes(lower))
  }

  useAgentTool({
    name: 'list_todos',
    description: 'Get the current to-do list, including which items are already complete.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      todos: z.array(z.object({ text: z.string(), done: z.boolean() })),
    }),
    execute: () => ({ todos: todos.map(({ text, done }) => ({ text, done })) }),
  })

  useAgentTool({
    name: 'add_todo',
    description: 'Add a new to-do item to the list.',
    inputSchema: z.object({ text: z.string().describe('The to-do item text.') }),
    outputSchema: z.object({ id: z.string(), text: z.string() }),
    execute: ({ text }) => addTodo(text),
  })

  useAgentTool({
    name: 'complete_todo',
    description: 'Mark a to-do item as complete. Matches by (partial) text, not id.',
    inputSchema: z.object({
      text: z.string().describe('Text, or partial text, of the to-do item to complete.'),
    }),
    outputSchema: z.object({ success: z.boolean() }),
    execute: ({ text }) => {
      const match = findByText(text)
      if (!match) throw new Error(`No to-do item matching "${text}" was found.`)
      setTodos((prev) => prev.map((t) => (t.id === match.id ? { ...t, done: true } : t)))
      return { success: true }
    },
  })

  useAgentTool({
    name: 'remove_todo',
    description: 'Remove a to-do item from the list. Matches by (partial) text, not id.',
    inputSchema: z.object({
      text: z.string().describe('Text, or partial text, of the to-do item to remove.'),
    }),
    outputSchema: z.object({ success: z.boolean() }),
    execute: ({ text }) => {
      const match = findByText(text)
      if (!match) throw new Error(`No to-do item matching "${text}" was found.`)
      setTodos((prev) => prev.filter((t) => t.id !== match.id))
      return { success: true }
    },
  })

  const remaining = todos.filter((t) => !t.done).length

  return (
    <div className="flex flex-1 flex-col px-6 pb-6">
      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const text = draft.trim()
          if (!text) return
          addTodo(text)
          setDraft('')
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task…"
          className="h-10"
        />
        <Button type="submit" className="h-10">
          <Plus />
          Add
        </Button>
      </form>

      {todos.length > 0 && (
        <p className="mb-2 text-sm text-muted-foreground">
          {remaining} of {todos.length} remaining
        </p>
      )}

      {todos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet — add a task above, or ask the agent.</p>
      ) : (
        <ul>
          {todos.map((todo, index) => (
            <li key={todo.id}>
              <div className="flex items-center gap-3 py-3">
                <Checkbox
                  checked={todo.done}
                  onCheckedChange={() =>
                    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)))
                  }
                />
                <span className={todo.done ? 'flex-1 text-base line-through opacity-60' : 'flex-1 text-base'}>
                  {todo.text}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setTodos((prev) => prev.filter((t) => t.id !== todo.id))}
                  aria-label={`Remove ${todo.text}`}
                >
                  <X />
                </Button>
              </div>
              {index < todos.length - 1 && <Separator />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
