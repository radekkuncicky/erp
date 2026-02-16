import { BottomNav } from "@/components/site/bottom-nav"

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center px-4">
          <span className="text-lg font-bold tracking-tight font-heading text-nanto-black">
            NANTO
          </span>
          <span className="text-lg font-bold text-nanto-yellow">.</span>
        </div>
      </header>
      <main className="px-4 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
