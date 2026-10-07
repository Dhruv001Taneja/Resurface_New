"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({
  mobileMenuOpen,
  setMobileMenuOpen,
  user,
  userName = "User",
  activePage = "Screenshots",
}) {
  const pathname = usePathname();

  const primaryNavItems = [
    { name: "Dashboard", icon: "📊", href: "/dashboard" },
    { name: "Screenshots", icon: "📸", href: "/screenshots" },
    { name: "Categories", icon: "📁", href: "/screenshots" },
    { name: "Action Center", icon: "⚡", href: "/dashboard" },
    { name: "Calendar", icon: "📅", href: "/dashboard" },
    { name: "Reminders", icon: "⏰", href: "/dashboard" },
    { name: "Vault", icon: "🔒", href: "/dashboard" },
  ];

  const secondaryNavItems = [
    { name: "Insights", icon: "💡", href: "/dashboard" },
    { name: "Settings", icon: "⚙️", href: "/dashboard" },
    { name: "Help", icon: "❓", href: "/dashboard" },
  ];

  const isCurrentActive = (item) => {
    if (activePage) return activePage === item.name;
    if (pathname === item.href) return true;
    return false;
  };

  return (
    <>
      <aside
        className={`${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0`}
      >
        <div className="p-4 overflow-y-auto">
          <Link
            href="/dashboard"
            className="block px-3 py-2 font-extrabold text-xl tracking-tight text-gray-900 hover:text-indigo-600 transition-colors"
          >
            RESecure
          </Link>

          <div className="border-t border-gray-200 my-3" />

          <nav className="space-y-1">
            {primaryNavItems.map((item) => {
              const active = isCurrentActive(item);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen?.(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-indigo-50 text-indigo-600 font-semibold border-r-4 border-indigo-600"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 my-4" />

          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const active = isCurrentActive(item);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen?.(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-indigo-50 text-indigo-600 font-semibold"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className={item.name === "Help" ? "text-rose-600 font-semibold" : ""}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50/50">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Logged in as
          </div>
          <div className="text-sm font-bold text-gray-900 truncate">{userName}</div>
          <div className="text-xs text-gray-500 truncate">{user?.email}</div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen?.(false)}
          className="md:hidden fixed inset-0 z-20 bg-gray-900/30 backdrop-blur-xs"
        />
      )}
    </>
  );
}
