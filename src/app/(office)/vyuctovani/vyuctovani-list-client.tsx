"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { formatCurrency, formatDateTime } from "@/lib/utils/format"
import { Search } from "lucide-react"
import Link from "next/link"

const STATUS_LABELS: Record<string, string> = {
  koncept: "Koncept",
  ke_schvaleni: "Ke schválení",
  schvaleno: "Schváleno",
  zamitnuto: "Zamítnuto",
}

const STATUS_COLORS: Record<string, string> = {
  koncept: "bg-gray-100 text-gray-800",
  ke_schvaleni: "bg-yellow-100 text-yellow-800",
  schvaleno: "bg-green-100 text-green-800",
  zamitnuto: "bg-red-100 text-red-800",
}

interface VyuctovaniListClientProps {
  items: any[]
  error: string | null
  initialStatus: string | null
  initialSearch: string
}

export function VyuctovaniListClient({ items, error, initialStatus, initialSearch }: VyuctovaniListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      startTransition(() => {
        router.push(`/vyuctovani?${params.toString()}`)
      })
    },
    [router, searchParams, startTransition]
  )

  if (error) {
    return <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-8 text-center"><p className="text-destructive">{error}</p></div>
  }

  return (
    <div className={isPending ? "opacity-70 pointer-events-none transition-opacity" : ""}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Hledat vyúčtování..."
            defaultValue={initialSearch}
            onChange={(e) => updateParams({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select value={initialStatus || "all"} onValueChange={(v) => updateParams({ status: v === "all" ? null : v })}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Stav" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Číslo</TableHead>
                <TableHead>Zakázka</TableHead>
                <TableHead>Klient</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="text-right">Celkem s DPH</TableHead>
                <TableHead className="text-right">Záloha</TableHead>
                <TableHead className="text-right">Doplatek</TableHead>
                <TableHead>Vytvořeno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Žádná vyúčtování</TableCell></TableRow>
              ) : (
                items.map((item: any) => (
                  <TableRow key={item.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/vyuctovani/${item.id}`} className="font-medium text-foreground hover:text-nanto-yellow transition-colors">
                        {item.vyuctovani_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/zakazky/${item.order_id}`} className="text-muted-foreground hover:text-nanto-yellow transition-colors">
                        {(item.orders as any)?.order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{(item.orders as any)?.client_name}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[item.status] || ""}>{STATUS_LABELS[item.status] || item.status}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total_with_vat)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(item.deposit_paid)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.remaining_amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(item.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
