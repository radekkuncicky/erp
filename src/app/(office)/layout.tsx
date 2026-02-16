import { SidebarNav } from "@/components/office/sidebar-nav"

export default function OfficeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 overflow-y-auto bg-secondary/30">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
