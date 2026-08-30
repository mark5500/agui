import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { z } from 'zod'
import { useAgentTool } from './chat/useAgentTool'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CATEGORIES = ['Food', 'Transport', 'Housing', 'Entertainment', 'Shopping', 'Health', 'Other'] as const
type Category = (typeof CATEGORIES)[number]

interface Expense {
  id: string
  description: string
  amount: number
  category: Category
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/**
 * Owns its own expense state and registers four tools for it — `list_expenses`,
 * `add_expense`, `remove_expense`, `get_expense_summary` — same id-based shape as
 * `TodoList`'s tools, plus one that isn't just a CRUD mirror: `get_expense_summary`
 * returns a computed total/by-category breakdown rather than raw rows, so the
 * model can answer "how much did I spend on X" without doing the arithmetic itself
 * over a `list_expenses` dump.
 */
export function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Array<Expense>>([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('Other')

  function addExpense(entry: { description: string; amount: number; category: Category }) {
    const expense: Expense = { id: crypto.randomUUID(), ...entry }
    setExpenses((prev) => [...prev, expense])
    return expense
  }

  function summarize() {
    const byCategory: Record<string, number> = {}
    let total = 0
    for (const e of expenses) {
      total += e.amount
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
    }
    return {
      total,
      byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })),
    }
  }

  useAgentTool({
    name: 'list_expenses',
    description: "Get every logged expense, including each item's id, amount, and category.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      expenses: z.array(
        z.object({ id: z.string(), description: z.string(), amount: z.number(), category: z.string() }),
      ),
    }),
    execute: () => ({ expenses }),
  })

  useAgentTool({
    name: 'get_expense_summary',
    description: 'Get the total amount spent and a breakdown by category, already computed.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      total: z.number(),
      byCategory: z.array(z.object({ category: z.string(), amount: z.number() })),
    }),
    execute: () => summarize(),
  })

  useAgentTool({
    name: 'add_expense',
    description: 'Log one or more expenses.',
    inputSchema: z.object({
      expenses: z
        .array(
          z.object({
            description: z.string().describe('What the expense was for.'),
            amount: z.number().positive().describe('Amount in dollars, e.g. 12.50.'),
            category: z.enum(CATEGORIES).describe('One of: ' + CATEGORIES.join(', ')),
          }),
        )
        .min(1),
    }),
    outputSchema: z.object({
      added: z.array(z.object({ id: z.string(), description: z.string(), amount: z.number() })),
    }),
    execute: ({ expenses: entries }) => ({ added: entries.map((entry) => addExpense(entry)) }),
  })

  useAgentTool({
    name: 'remove_expense',
    description: 'Remove one or more logged expenses, by id. Use list_expenses to find ids.',
    inputSchema: z.object({ ids: z.array(z.string()).min(1).describe('Ids of the expenses to remove.') }),
    outputSchema: z.object({
      results: z.array(z.object({ id: z.string(), success: z.boolean(), error: z.string().optional() })),
    }),
    execute: ({ ids }) => {
      const known = new Set(expenses.map((e) => e.id))
      setExpenses((prev) => prev.filter((e) => !ids.includes(e.id)))
      return {
        results: ids.map((id) =>
          known.has(id) ? { id, success: true } : { id, success: false, error: `No expense with id "${id}" was found.` },
        ),
      }
    },
  })

  const { total, byCategory } = summarize()

  return (
    <div className="flex flex-1 flex-col px-6 pb-6">
      <form
        className="mb-6 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const amountNum = Number(amount)
          if (!description.trim() || !Number.isFinite(amountNum) || amountNum <= 0) return
          addExpense({ description: description.trim(), amount: amountNum, category })
          setDescription('')
          setAmount('')
        }}
      >
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was it for?"
          className="h-10 flex-1"
        />
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          inputMode="decimal"
          className="h-10 w-28"
        />
        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger className="!h-10 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="h-10">
          <Plus />
          Add
        </Button>
      </form>

      {expenses.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Total: {currency.format(total)}</span>
          {byCategory.map(({ category: c, amount: a }) => (
            <Badge key={c} variant="secondary">
              {c}: {currency.format(a)}
            </Badge>
          ))}
        </div>
      )}

      {expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing logged yet — add one above, or ask the agent.</p>
      ) : (
        <ul>
          {expenses.map((expense, index) => (
            <li key={expense.id}>
              <div className="flex items-center gap-3 py-3">
                <span className="flex-1 text-base">{expense.description}</span>
                <Badge variant="outline">{expense.category}</Badge>
                <span className="w-20 text-right text-sm tabular-nums text-muted-foreground">
                  {currency.format(expense.amount)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setExpenses((prev) => prev.filter((e) => e.id !== expense.id))}
                  aria-label={`Remove ${expense.description}`}
                >
                  <X />
                </Button>
              </div>
              {index < expenses.length - 1 && <Separator />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
