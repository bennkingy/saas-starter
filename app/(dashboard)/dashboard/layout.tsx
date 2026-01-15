"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BellRing, Mail, Settings, Menu, BarChart3 } from "lucide-react";
import useSWR from "swr";
import { User } from "@/lib/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: user } = useSWR<User>("/api/user", fetcher);

  const navItems = [
    { href: "/dashboard/alerts", icon: BellRing, label: "Alerts" },
    { href: "/dashboard/preferences", icon: Mail, label: "Notifications" },
    { href: "/dashboard/general", icon: Settings, label: "General" },
    ...(user?.role === "admin"
      ? [{ href: "/dashboard/admin", icon: BarChart3, label: "Admin" }]
      : []),
  ];

  return (
    <div className="flex flex-col max-w-7xl mx-auto w-full">
      <div className="sm:flex flex-0 sm:flex-1">
        {/* Sidebar */}
        <aside
          className={`pt-16 lg:pt-0 w-64 bg-white lg:bg-gray-50 border-r border-gray-200 lg:block ${
            isSidebarOpen ? "block" : "hidden"
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="h-full overflow-y-auto p-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className={`shadow-none my-1 w-full justify-start ${
                    pathname === item.href ? "bg-gray-100" : ""
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}
