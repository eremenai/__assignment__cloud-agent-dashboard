import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { BreadcrumbsNav } from "./dashboard/_components/breadcrumbs-nav";
import { DashboardLayoutClient, HeaderControls } from "./dashboard/_components/dashboard-layout-client";

export default async function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <DashboardLayoutClient>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset
          className={cn(
            // Adds right margin for inset sidebar up to 113rem.
            // On wider screens with collapsed sidebar, removes margin and sets margin auto for alignment.
            "max-[113rem]:peer-data-[variant=inset]:mr-2! min-[101rem]:peer-data-[variant=inset]:peer-data-[state=collapsed]:mr-auto!",
          )}
        >
          <header
            className={cn(
              "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
              // Navbar is always sticky
              "sticky top-0 z-50 overflow-hidden rounded-t-[inherit] bg-background/50 backdrop-blur-md",
            )}
          >
            <div className="flex w-full items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-1 lg:gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
                <BreadcrumbsNav />
              </div>
              <HeaderControls />
            </div>
          </header>
          <div className="h-full p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardLayoutClient>
  );
}
