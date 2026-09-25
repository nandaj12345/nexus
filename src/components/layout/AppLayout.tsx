import React from 'react'
import { useAppStore } from '@/store/appStore'
import { CommunitySidebar } from './CommunitySidebar'
import { ChannelSidebar } from './ChannelSidebar'
import { MembersSidebar } from './MembersSidebar'
import { DMSidebar } from '@/components/messaging/DMSidebar'
import { ChannelView } from '@/components/messaging/ChannelView'
import { DMView } from '@/components/messaging/DMView'
import { HomeView } from './HomeView'

export const AppLayout: React.FC = () => {
  const { view, rightSidebarOpen } = useAppStore()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary">
      {/* Column 1: Community icons */}
      <CommunitySidebar />

      {/* Column 2: Channel/DM list */}
      {view === 'dm' ? (
        <DMSidebar />
      ) : (
        <ChannelSidebar />
      )}

      {/* Column 3: Main content */}
      <div className="flex flex-1 overflow-hidden min-w-0">
        {view === 'channel' && <ChannelView />}
        {view === 'dm' && <DMView />}
        {view === 'home' && <HomeView />}

        {/* Column 4: Members (only in channel view) */}
        {view === 'channel' && rightSidebarOpen && <MembersSidebar />}
      </div>
    </div>
  )
}

export default AppLayout
