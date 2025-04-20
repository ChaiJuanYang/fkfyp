"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  RiScanLine,
  RiBardLine,
  RiUserFollowLine,
  RiCodeSSlashLine,
  RiLoginCircleLine,
  RiLayoutLeftLine,
  RiSettings3Line,
  RiLeafLine,
  RiLogoutBoxLine,
  RiAdminLine,
  RiHome2Line,
  RiRobot2Line,
  RiLineChartLine,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../app/supabaseClient";
import Image from "next/image";

// This is sample data.
const data = {
  navMain: [
    {
      title: "Sections",
      url: "#",
      items: [
        {
          title: "Homepage",
          url: "/homepage",
          icon: RiHome2Line,
        },
        {
          title: "Admin",
          url: "/admin",
          icon: RiAdminLine,
        },
        {
          title: "Chatbot",
          url: "/chatbot",
          icon: RiRobot2Line,
        },
        {
          title: "Results",
          url: "/results",
          icon: RiLineChartLine,
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const handleSignOut = () => {
    localStorage.removeItem("sb-onroqajvamgdrnrjnzzu-auth-token");
    router.push("/");
  };
  const [email, setEmail] = useState("");
  const [perm, setPermission] = useState(0);

  useEffect(() => {
    const authToken = localStorage.getItem(
      "sb-onroqajvamgdrnrjnzzu-auth-token"
    );
    if (authToken) {
      const { user } = JSON.parse(authToken);
      setEmail(user.email);
      getPerm(user.email);
    }
  }, []);

  async function getPerm(email: string) {
    try {
      const { data: agentData, error: agentError } = await supabase
        .from("permission")
        .select("perm")
        .eq("email", email)
        .single(); // Use .single() if you expect only one row

      // Set the form fields with the fetched data
      if (agentData) {
        setPermission(agentData.perm);
        console.log(
          "Current permission:",
          agentData.perm,
          typeof agentData.perm
        );
      }

      console.log("Agent data fetched successfully:", agentData);
      return agentData;
    } catch (error) {
      console.error("Error fetching agent info:", error);
      throw error;
    }
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex justify-center items-center my-4"></div>
        <hr className="border-t border-border mx-2 -mt-px" />
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel className="uppercase text-muted-foreground/60">
              {item.title}
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu>
                {item.items
                  .filter((i) => i.title !== "Admin" || perm === 1)
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className="group/menu-button font-medium gap-3 h-9 rounded-lg bg-gradient-to-r hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:from-primary/20 data-[active=true]:to-primary/5 [&>svg]:size-auto"
                        isActive={item.url === pathname}
                      >
                        <Link href={item.url}>
                          {item.icon && (
                            <item.icon
                              className="text-muted-foreground/60 group-data-[active=true]/menu-button:text-primary"
                              size={22}
                              aria-hidden="true"
                            />
                          )}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <hr className="border-t border-border mx-2 -mt-px" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="font-medium gap-3 h-9 rounded-lg bg-gradient-to-r hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:from-primary/20 data-[active=true]:to-primary/5 [&>svg]:size-auto"
              onClick={handleSignOut}
            >
              <RiLogoutBoxLine
                className="text-muted-foreground/60 group-data-[active=true]/menu-button:text-primary"
                size={22}
                aria-hidden="true"
              />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
