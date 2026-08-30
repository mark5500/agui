import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Star } from 'lucide-react'
import { useAgentTool } from './chat/useAgentTool'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const CATEGORIES = ['Bug', 'Feature Request', 'General', 'Praise'] as const

const feedbackSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Enter a valid email address.'),
  category: z.enum(CATEGORIES),
  rating: z.number().int().min(1, 'Please choose a rating.').max(5),
  comments: z.string().min(10, 'Please add a bit more detail (at least 10 characters).'),
})

type FeedbackValues = z.infer<typeof feedbackSchema>

interface Submission extends FeedbackValues {
  id: string
  submittedAt: string
}

const DEFAULT_VALUES: FeedbackValues = {
  name: '',
  email: '',
  category: 'General',
  rating: 0,
  comments: '',
}

/**
 * A single-record form (react-hook-form + zod), unlike the list-shaped
 * Tasks/Expenses pages. `submit_feedback` reuses the exact same zod schema the
 * visible form validates against — parsing the model's input with it (rather
 * than trusting the shape TanStack sent the model as a JSON schema) means a
 * malformed tool call fails the same way an invalid form submission would,
 * through the same validation path.
 */
export function FeedbackForm() {
  const [submissions, setSubmissions] = useState<Array<Submission>>([])

  const form = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: DEFAULT_VALUES,
  })

  function logSubmission(data: FeedbackValues) {
    const entry: Submission = { id: crypto.randomUUID(), ...data, submittedAt: new Date().toISOString() }
    setSubmissions((prev) => [entry, ...prev])
    return entry
  }

  function onSubmit(data: FeedbackValues) {
    logSubmission(data)
    form.reset(DEFAULT_VALUES)
  }

  useAgentTool({
    name: 'list_feedback',
    description: 'Get all feedback submitted so far.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      submissions: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
          category: z.string(),
          rating: z.number(),
          comments: z.string(),
        }),
      ),
    }),
    execute: () => ({ submissions }),
  })

  useAgentTool({
    name: 'submit_feedback',
    description:
      'Fill in and submit the feedback form on the user’s behalf. Rating is 1 (worst) to 5 (best).',
    inputSchema: feedbackSchema,
    outputSchema: z.object({ id: z.string() }),
    execute: (input) => {
      const data = feedbackSchema.parse(input)
      form.reset(data)
      const entry = logSubmission(data)
      return { id: entry.id }
    },
  })

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 pb-6 lg:flex-row">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full max-w-md flex-col gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Ada Lovelace" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="ada@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="!h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating</FormLabel>
                <FormControl>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        aria-label={`${value} star${value === 1 ? '' : 's'}`}
                        className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <Star
                          className={
                            'size-6 ' +
                            (value <= field.value
                              ? 'fill-primary text-primary'
                              : 'fill-none text-muted-foreground')
                          }
                        />
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="comments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comments</FormLabel>
                <FormControl>
                  <Textarea placeholder="What's on your mind?" rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="h-10 self-start">
            Submit feedback
          </Button>
        </form>
      </Form>

      <div className="flex-1">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {submissions.length === 0 ? 'No submissions yet' : `${submissions.length} submission(s)`}
        </h2>
        {submissions.length > 0 && (
          <ul>
            {submissions.map((s, index) => (
              <li key={s.id}>
                <div className="flex flex-col gap-1 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <Badge variant="outline">{s.category}</Badge>
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <Star
                          key={v}
                          className={
                            'size-3.5 ' + (v <= s.rating ? 'fill-primary text-primary' : 'fill-none text-muted-foreground')
                          }
                        />
                      ))}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.comments}</p>
                </div>
                {index < submissions.length - 1 && <Separator />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
