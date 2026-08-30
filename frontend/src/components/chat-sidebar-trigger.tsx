import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSidebar } from '@/components/ui/sidebar'

/** Toggles the right-hand chat panel — reads the inner (chat) SidebarProvider's
 * context, which is distinct from the outer nav sidebar's. */
export function ChatSidebarTrigger() {
  const { toggleSidebar, state, isMobile, openMobile } = useSidebar()
  const open = isMobile ? openMobile : state === 'expanded'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label={open ? 'Hide chat' : 'Show chat'}>
          <MessageSquare />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{open ? 'Hide chat' : 'Show chat'}</TooltipContent>
    </Tooltip>
  )
}
