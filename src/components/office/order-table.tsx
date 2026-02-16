"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OrderStatusBadge } from "@/components/shared/order-status-badge"
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from "@/lib/utils/format"
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import type { OrderStatus } from "@/lib/supabase/types"

interface Order {
  id: string
  order_number: string
  client_name: string
  category: string | null
  status: OrderStatus
  total_price_without_vat: number
  project_start_date: string | null
  project_manager?: { full_name: string } | null
  created_at: string
}

interface OrderTableProps {
  orders: Order[]
  totalCount: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onSearch: (query: string) => void
  onStatusFilter: (status: string | null) => void
  searchQuery: string
  statusFilter: string | null
}

export function OrderTable({
  orders,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onSearch,
  onStatusFilter,
  searchQuery,
  statusFilter,
}: OrderTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Hledat zakázky..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => onStatusFilter(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild>
          <Link href="/zakazky/nova">
            <Plus className="h-4 w-4" />
            Nová zakázka
          </Link>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Číslo</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="text-right">Cena bez DPH</TableHead>
              <TableHead>Termín</TableHead>
              <TableHead>Manažer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Žádné zakázky k zobrazení
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/zakazky/${order.id}`}
                      className="font-medium text-foreground hover:text-nanto-yellow transition-colors"
                    >
                      {order.order_number}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{order.client_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.category || "—"}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.total_price_without_vat)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.project_start_date
                      ? formatDate(order.project_start_date)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.project_manager?.full_name || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalCount} zakázek celkem
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
