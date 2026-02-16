"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardList, Camera, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/prehled", label: "Zakázky", icon: ClipboardList },
  { href: "#", label: "Fotit", icon: Camera },
  { href: "#", label: "Profil", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = item.href !== "#" && pathname.startsWith(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 text-xs transition-colors",
                isActive
                  ? "text-nanto-yellow font-medium"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
