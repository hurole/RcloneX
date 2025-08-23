import { Calendar, Inbox, Search, Cog, Gauge } from "lucide-react";
import { Link } from "react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/assets/appIcon.png";
import { useTranslation } from "react-i18next";

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();

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
    <Sidebar collapsible="icon">
      <SidebarHeader className={`flex items-center p-4 border-b border-border/50 ${state === "collapsed" ? "justify-center" : "flex-row gap-3"}`}>
        <div className="p-1 rounded-lg bg-primary/10">
          <img src={logo} alt="logo" className="w-7 h-7" />
        </div>
        {state === "expanded" && (
          <h2 className="font-bold text-lg text-foreground tracking-tight">RcloneX</h2>
        )}
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarMenu className="space-y-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={state === "collapsed" ? item.title : undefined}
                className={`
                  group relative overflow-hidden rounded-xl transition-all duration-200 ease-in-out
                  hover:bg-primary/10 hover:shadow-sm hover:scale-[1.02]
                  active:scale-[0.98] active:bg-primary/15
                  data-[active=true]:bg-primary data-[active=true]:text-primary-foreground
                  data-[active=true]:shadow-md
                  ${state === "collapsed" ? "w-full justify-center p-3" : "p-3"}
                `}
              >
                <Link
                  to={item.url}
                  className={`
                    flex items-center w-full transition-all duration-200
                    ${state === "collapsed" ? "justify-center" : "gap-3"}
                  `}
                >
                  <div className={`
                    flex items-center justify-center transition-all duration-200
                    ${state === "collapsed" ? "" : "w-5 h-5"}
                  `}>
                    <item.icon className={`
                      transition-all duration-200
                      ${state === "collapsed" ? "size-5" : "size-4"}
                      group-hover:scale-110
                    `} />
                  </div>
                  {state === "expanded" && (
                    <span className="
                      font-medium text-sm transition-all duration-200
                      group-hover:translate-x-0.5
                      truncate
                    ">
                      {item.title}
                    </span>
                  )}
                  {/* 悬浮效果的装饰线 */}
                  <div className="
                    absolute inset-0 rounded-xl border border-primary/20 opacity-0
                    group-hover:opacity-100 transition-opacity duration-200
                  " />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
