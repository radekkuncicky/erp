"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardList, Camera, FileCheck, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/prehled", label: "Zakázky", icon: ClipboardList },
  { href: "/prehled/fotky", label: "Fotky", icon: Camera },
  { href: "/prehled/protokoly", label: "Protokoly", icon: FileCheck },
  { href: "/prehled/profil", label: "Profil", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-bottom">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-nanto-black"
                  : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn("h-5 w-5", isActive && "text-nanto-yellow")}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
