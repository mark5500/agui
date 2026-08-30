import { createFileRoute } from '@tanstack/react-router'
import { Receipt } from 'lucide-react'
import { ExpenseTracker } from '../ExpenseTracker'

function ExpensesPage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="shrink-0 p-6 pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <Receipt className="size-4" />
          </span>
          Expenses
        </h1>
        <p className="text-muted-foreground text-sm">
          Log what you spend — add or remove expenses yourself, or ask the agent.
        </p>
      </div>
      <ExpenseTracker />
    </div>
  )
}

export const Route = createFileRoute('/expenses')({ component: ExpensesPage })
