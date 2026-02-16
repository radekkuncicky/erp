import { BottomNav } from "@/components/site/bottom-nav"

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-nanto-black">NANTO</span>
          <span className="text-nanto-yellow">.</span>
        </span>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
