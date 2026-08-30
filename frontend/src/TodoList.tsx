import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { z } from 'zod'
import { useAgentTool } from './chat/useAgentTool'
import { useLocalStorageState } from './useLocalStorageState'
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
 * in the app. `complete_todo`/`remove_todo` take ids, not text — `list_todos`
 * (or `add_todo`'s own return value) is how the model learns them, the same way
 * a human uses the checkbox/✕ next to a specific rendered row rather than typing
 * the task out again. It also means state changed by hand (an item added, checked,
 * or removed outside the tools) is always what the model is actually operating on.
 */
export function TodoList() {
  const [todos, setTodos] = useLocalStorageState<Todo[]>('agui:todos', [])
  const [draft, setDraft] = useState('')

  function addTodo(text: string) {
    const todo: Todo = { id: crypto.randomUUID(), text, done: false }
    setTodos((prev) => [...prev, todo])
    return todo
  }

  const idResultSchema = z.array(
    z.object({ id: z.string(), success: z.boolean(), error: z.string().optional() }),
  )

  useAgentTool({
    name: 'list_todos',
    description: "Get the current to-do list, including each item's id and completion status.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      todos: z.array(z.object({ id: z.string(), text: z.string(), done: z.boolean() })),
    }),
    execute: () => ({ todos }),
  })

  useAgentTool({
    name: 'add_todo',
    description: 'Add one or more new to-do items to the list.',
    inputSchema: z.object({
      texts: z.array(z.string()).min(1).describe('The to-do item texts to add.'),
    }),
    outputSchema: z.object({ added: z.array(z.object({ id: z.string(), text: z.string() })) }),
    execute: ({ texts }) => ({ added: texts.map((text) => addTodo(text)) }),
  })

  useAgentTool({
    name: 'complete_todo',
    description: 'Mark one or more to-do items as complete, by id. Use list_todos to find ids.',
    inputSchema: z.object({
      ids: z.array(z.string()).min(1).describe('Ids of the to-do items to complete.'),
    }),
    outputSchema: z.object({ results: idResultSchema }),
    execute: ({ ids }) => {
      const known = new Set(todos.map((t) => t.id))
      setTodos((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, done: true } : t)))
      return {
        results: ids.map((id) =>
          known.has(id)
            ? { id, success: true }
            : { id, success: false, error: `No to-do item with id "${id}" was found.` },
        ),
      }
    },
  })

  useAgentTool({
    name: 'remove_todo',
    description: 'Remove one or more to-do items from the list, by id. Use list_todos to find ids.',
    inputSchema: z.object({
      ids: z.array(z.string()).min(1).describe('Ids of the to-do items to remove.'),
    }),
    outputSchema: z.object({ results: idResultSchema }),
    execute: ({ ids }) => {
      const known = new Set(todos.map((t) => t.id))
      setTodos((prev) => prev.filter((t) => !ids.includes(t.id)))
      return {
        results: ids.map((id) =>
          known.has(id)
            ? { id, success: true }
            : { id, success: false, error: `No to-do item with id "${id}" was found.` },
        ),
      }
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
        <p className="text-muted-foreground mb-2 text-sm">
          {remaining} of {todos.length} remaining
        </p>
      )}

      {todos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing yet — add a task above, or ask the agent.
        </p>
      ) : (
        <ul>
          {todos.map((todo, index) => (
            <li key={todo.id}>
              <div className="flex items-center gap-3 py-3">
                <Checkbox
                  checked={todo.done}
                  onCheckedChange={() =>
                    setTodos((prev) =>
                      prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)),
                    )
                  }
                />
                <span
                  className={
                    todo.done ? 'flex-1 text-base line-through opacity-60' : 'flex-1 text-base'
                  }
                >
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
