import { PanelLeftIcon } from 'lucide-react'
import { Link, useLocation } from '@tanstack/react-router'
import { CURRENT_USER } from '@/currentUser'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChatSidebarTrigger } from '@/components/chat-sidebar-trigger'

const PAGE_LABELS: Record<string, string> = {
  '/': 'Tasks',
  '/expenses': 'Expenses',
  '/feedback': 'Feedback',
}

export function SiteHeader({ onToggleNav }: { onToggleNav: () => void }) {
  const location = useLocation()
  const pageLabel = PAGE_LABELS[location.pathname] ?? 'Tasks'

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <Button variant="ghost" size="icon-sm" onClick={onToggleNav} aria-label="Toggle navigation">
        <PanelLeftIcon />
      </Button>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink asChild>
              <Link to="/">AG-UI Chat</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        <ChatSidebarTrigger />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {CURRENT_USER.initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="truncate font-medium">{CURRENT_USER.name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {CURRENT_USER.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Settings</DropdownMenuItem>
            <DropdownMenuItem disabled>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
