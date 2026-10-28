"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { name: "Screenshots", href: "/screenshots", icon: "images" },
  { name: "Action Center", href: "/action-center", icon: "zap" },
  { name: "Calendar", href: "/calendar", icon: "calendar" },
  { name: "Vault", href: "/vault", icon: "shield" },
];

function SidebarIcon({ name, size = 19 }) {
  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    images: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </>
    ),
    zap: <path d="m13 2-3 8H5l6 12 3-8h5L13 2Z" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export default function Sidebar({
  mobileMenuOpen = false,
  setMobileMenuOpen,
  user,
  userName = "User",
}) {
  const pathname = usePathname();

  return (
    <>
      <aside
        className={`fixed bottom-0 left-0 top-[72px] z-30 flex w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#0b111b] transition-transform duration-200 ease-in-out md:sticky md:top-[72px] md:h-[calc(100vh-72px)] md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>

          <Link
            href="/dashboard"
            className="mb-4 block px-3 text-xl font-extrabold tracking-tight text-slate-100 transition-colors hover:text-[#45e5d0]"
          >
            ReSurface
          </Link>

            <nav className="space-y-1">
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen?.(false)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${active
                    ? "border border-teal-400/15 bg-teal-400/10 font-semibold text-teal-300"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                    }`}
                >
                  <SidebarIcon name={item.icon} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/[0.08] p-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Account
          </p>
          <p className="truncate text-sm font-semibold text-slate-200">
            {userName}
          </p>
          {user?.email && (
            <p className="mt-1 truncate text-xs text-slate-500">
              {user.email}
            </p>
          )}
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen?.(false)}
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
        />
      )}
    </>
  );
}
