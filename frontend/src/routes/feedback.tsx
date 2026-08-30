import { createFileRoute } from '@tanstack/react-router'
import { MessageSquareHeart } from 'lucide-react'
import { FeedbackForm } from '../FeedbackForm'

function FeedbackPage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="shrink-0 p-6 pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <MessageSquareHeart className="size-4" />
          </span>
          Feedback
        </h1>
        <p className="text-muted-foreground text-sm">
          Tell us what's working and what isn't — fill it out yourself, or ask the agent to submit
          it for you.
        </p>
      </div>
      <FeedbackForm />
    </div>
  )
}

export const Route = createFileRoute('/feedback')({ component: FeedbackPage })
