import { Calendar, Inbox, Search, Cog, Gauge } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import logo from "@/assets/appIcon.png";
import { useTranslation } from "react-i18next";

export function AppSidebar() {
  const { t } = useTranslation();
  // Menu items.
const items = [
  {
    title: t('Dashboard'),
    url: "/dashboard",
    icon: Gauge,
  },
  {
    title: t('Configs'),
    url: "/configs",
    icon: Cog,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  }
];

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center gap-2">
        <img src={logo} alt="logo" className="w-8 h-8" />
        <h2>RcloneX</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title} className="px-4 py-1">
              <SidebarMenuButton asChild>
                <a href={item.url}>
                  <item.icon />
                  <span className="text-base">{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
