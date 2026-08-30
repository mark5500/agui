import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Sidebar, SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { ChatProvider } from '../chat/ChatProvider'
import { Chat } from '../Chat'

import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <TooltipProvider delayDuration={200}>
      <ChatProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <AppShell />
          </SidebarInset>
        </SidebarProvider>
      </ChatProvider>
    </TooltipProvider>
  )
}

/**
 * Everything below the outer (nav) SidebarProvider. Captures the outer sidebar's
 * `toggleSidebar` here — one level above the inner (chat) SidebarProvider — since
 * `useSidebar()` inside `SiteHeader` needs to resolve to the *inner* context (for
 * the chat trigger), which would otherwise shadow the outer one.
 */
function AppShell() {
  const { toggleSidebar: toggleNav } = useSidebar()

  return (
    <SidebarProvider
      className="min-h-0 flex-1 flex-col"
      style={{ '--sidebar-width': '26rem' } as React.CSSProperties}
    >
      <SiteHeader onToggleNav={toggleNav} />
      {/* `contain: layout` makes this the containing block for the chat Sidebar's
          `position: fixed` box below, so it's scoped to this row (below the header,
          to the bottom of the viewport) instead of the whole viewport — otherwise a
          fixed sidebar always spans from y=0, overlapping the header above it. */}
      <div className="flex min-h-0 flex-1" style={{ contain: 'layout' }}>
        <div className="relative flex w-full flex-1 flex-col overflow-y-auto">
          <Outlet />
        </div>
        {/* `h-svh` (the component's default) sizes against the real browser viewport,
            ignoring the `contain: layout` box above — so it always overflows past this
            row's actual (shorter, below-header) height, pushing the footer input out of
            view. Override to `h-full` so it sizes against its containing block instead. */}
        <Sidebar side="right" collapsible="offcanvas" className="h-full">
          <Chat />
        </Sidebar>
      </div>
    </SidebarProvider>
  )
}
