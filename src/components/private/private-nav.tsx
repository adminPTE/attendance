"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { usePrivateData } from "@/components/private/private-data-provider";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/schedule", label: "ตารางทำงาน", icon: CalendarDays, staffOnly: false },
  { path: "/staff", label: "รายชื่อเจ้าหน้าที่", icon: Users, staffOnly: true },
];

export function PrivateNav() {
  const {
    canManageStaff,
    currentUserRole,
    currentUserName,
    currentDepartName,
    signOut,
  } = usePrivateData();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const visibleNavItems = navItems.filter((item) => !item.staffOnly || canManageStaff);
  const roleLabel =
    currentUserRole === "assigned" ? "ผู้ได้รับมอบหมาย" : "ผู้ใช้งานทั่วไป";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary">
            <LayoutDashboard className="size-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-foreground">
              ระบบตารางทำงาน
            </p>
            <p className="hidden text-xs text-muted-foreground lg:block">
              {roleLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen((currentState) => !currentState)}
            aria-label={isMobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
          >
            {isMobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>

          <nav className="hidden items-center gap-1 lg:flex">
            {visibleNavItems.map((item) => {
              const isActive =
                pathname === item.path || pathname.startsWith(`${item.path}/`);
              const linkClassName = [
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 lg:px-4",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              ].join(" ");

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={linkClassName}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsUserMenuOpen(false);
                  }}
                >
                  <item.icon className="size-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div ref={menuRef} className="relative">
            <Button
              type="button"
              variant="ghost"
              className="h-10 gap-2 rounded-xl px-2 text-muted-foreground lg:px-2.5"
              onClick={() => setIsUserMenuOpen((currentState) => !currentState)}
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserRound className="size-4" />
              </span>
              <span className="hidden text-left lg:block">
                <span className="block max-w-36 truncate text-sm font-medium text-foreground">
                  {currentUserName}
                </span>
                <span className="block text-xs text-muted-foreground">{roleLabel}</span>
              </span>
              <ChevronDown className="size-4" />
            </Button>

            {isUserMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] w-72 rounded-2xl border border-border bg-card p-3 shadow-[0_16px_50px_rgba(80,95,140,0.16)]">
                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="text-sm font-semibold text-foreground">{currentUserName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{currentDepartName}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{roleLabel}</p>
                </div>

                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    onClick={signOut}
                  >
                    <span>ออกระบบ</span>
                    <LogOut className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="border-t border-border bg-card/95 px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-2">
            {visibleNavItems.map((item) => {
              const isActive =
                pathname === item.path || pathname.startsWith(`${item.path}/`);
              const linkClassName = [
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              ].join(" ");

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={linkClassName}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
