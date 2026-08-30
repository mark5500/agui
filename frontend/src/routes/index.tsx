import { createFileRoute } from '@tanstack/react-router'
import { ListTodo } from 'lucide-react'
import { BackgroundColorTool } from '../BackgroundColorTool'
import { TodoList } from '../TodoList'

function DashboardPage() {
  return (
    <BackgroundColorTool>
      <div className="shrink-0 p-6 pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ListTodo className="size-4" />
          </span>
          Your Tasks
        </h1>
        <p className="text-sm text-muted-foreground">
          Everything on your plate — add, complete, or remove tasks yourself, or ask the agent.
        </p>
      </div>
      <TodoList />
    </BackgroundColorTool>
  )
}

export const Route = createFileRoute('/')({ component: DashboardPage })
