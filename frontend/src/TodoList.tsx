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

  /**
   * Runs `apply` against a plain local snapshot of `todos` for each text in turn —
   * rather than dispatching one `setTodos` update per item — so a batch where two
   * texts match against the same evolving state (e.g. one item completed twice)
   * behaves predictably, and the whole batch lands in a single re-render.
   */
  function batchByText(texts: Array<string>, apply: (todos: Array<Todo>, match: Todo) => Array<Todo>) {
    let working = todos
    const results = texts.map((text) => {
      const lower = text.toLowerCase()
      const match = working.find((t) => t.text.toLowerCase().includes(lower))
      if (!match) return { text, success: false, error: `No to-do item matching "${text}" was found.` }
      working = apply(working, match)
      return { text, success: true }
    })
    if (working !== todos) setTodos(working)
    return results
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
    description: 'Add one or more new to-do items to the list.',
    inputSchema: z.object({ texts: z.array(z.string()).min(1).describe('The to-do item texts to add.') }),
    outputSchema: z.object({ added: z.array(z.object({ id: z.string(), text: z.string() })) }),
    execute: ({ texts }) => ({ added: texts.map((text) => addTodo(text)) }),
  })

  const batchResultSchema = z.array(
    z.object({ text: z.string(), success: z.boolean(), error: z.string().optional() }),
  )

  useAgentTool({
    name: 'complete_todo',
    description:
      'Mark one or more to-do items as complete. Each is matched by (partial) text, not id — an ' +
      'item not found is reported in the result rather than failing the whole call.',
    inputSchema: z.object({
      texts: z.array(z.string()).min(1).describe('Text, or partial text, of each to-do item to complete.'),
    }),
    outputSchema: z.object({ results: batchResultSchema }),
    execute: ({ texts }) => ({
      results: batchByText(texts, (list, match) =>
        list.map((t) => (t.id === match.id ? { ...t, done: true } : t)),
      ),
    }),
  })

  useAgentTool({
    name: 'remove_todo',
    description:
      'Remove one or more to-do items from the list. Each is matched by (partial) text, not id — an ' +
      'item not found is reported in the result rather than failing the whole call.',
    inputSchema: z.object({
      texts: z.array(z.string()).min(1).describe('Text, or partial text, of each to-do item to remove.'),
    }),
    outputSchema: z.object({ results: batchResultSchema }),
    execute: ({ texts }) => ({
      results: batchByText(texts, (list, match) => list.filter((t) => t.id !== match.id)),
    }),
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
