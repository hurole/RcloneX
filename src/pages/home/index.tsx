import { SidebarProvider } from '@/components/ui/sidebar';
import type { FC } from 'react';
import { AppSidebar } from './AppSidebar';
import { Outlet } from 'react-router';

const Home: FC = () => {
  return <SidebarProvider>
    <AppSidebar />
    <main>
      <Outlet/>
    </main>
  </SidebarProvider>;
};

export default Home;
