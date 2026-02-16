"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, ORDER_STATUS_LABELS } from "@/lib/utils/format"
import { BarChart3, PieChart, Download, TrendingUp } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
} from "recharts"

const CHART_COLORS = ["#FFC93C", "#4A4A4A", "#6366f1", "#22c55e", "#ef4444", "#f97316", "#06b6d4", "#8b5cf6"]

interface ReportsClientProps {
  data: {
    orders: any[]
    vyuctovani: any[]
    stock: any[]
  }
}

export function ReportsClient({ data }: ReportsClientProps) {
  // Orders by status
  const statusCounts: Record<string, number> = {}
  for (const order of data.orders) {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
  }
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: ORDER_STATUS_LABELS[status] || status,
    value: count,
  }))

  // Orders by category
  const categoryCounts: Record<string, number> = {}
  const categoryRevenue: Record<string, number> = {}
  for (const order of data.orders) {
    const cat = order.category || "Neuvedeno"
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    categoryRevenue[cat] = (categoryRevenue[cat] || 0) + (order.total_price_without_vat || 0)
  }
  const categoryData = Object.entries(categoryRevenue).map(([name, revenue]) => ({
    name,
    revenue,
    count: categoryCounts[name],
  }))

  // Monthly revenue (group by month)
  const monthlyData: Record<string, number> = {}
  for (const order of data.orders) {
    const month = order.created_at?.substring(0, 7) // YYYY-MM
    if (month) {
      monthlyData[month] = (monthlyData[month] || 0) + (order.total_price_without_vat || 0)
    }
  }
  const monthlyChartData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({
      name: month,
      revenue,
    }))

  // Stock valuation
  const stockValuation = data.stock.reduce((sum, s) => {
    return sum + (s.on_hand * s.avg_purchase_price)
  }, 0)
  const stockSellValue = data.stock.reduce((sum, s) => {
    const sellPrice = (s.products as any)?.sell_price || 0
    return sum + (s.on_hand * sellPrice)
  }, 0)

  // Financial summary
  const totalRevenue = data.orders.reduce((sum, o) => sum + (o.total_price_without_vat || 0), 0)
  const totalSettled = data.vyuctovani.filter(v => v.status === "schvaleno").reduce((sum, v) => sum + (v.total_with_vat || 0), 0)
  const totalDeposits = data.vyuctovani.reduce((sum, v) => sum + (v.deposit_paid || 0), 0)
  const totalRemaining = data.vyuctovani.reduce((sum, v) => sum + (v.remaining_amount || 0), 0)

  function exportCSV() {
    const headers = ["Číslo", "Klient", "Kategorie", "Stav", "Cena bez DPH", "Datum vytvoření"]
    const rows = data.orders.map(o => [
      o.order_number || o.id,
      o.client_name || "",
      o.category || "",
      ORDER_STATUS_LABELS[o.status] || o.status,
      o.total_price_without_vat || 0,
      o.created_at || "",
    ])
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `zakazky-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Tabs defaultValue="prehled">
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          <TabsTrigger value="prehled">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Přehled
          </TabsTrigger>
          <TabsTrigger value="finance">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Finance
          </TabsTrigger>
        </TabsList>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <TabsContent value="prehled">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Orders by Status Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zakázky dle stavu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Category Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Obrat dle kategorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="revenue" fill="#FFC93C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Revenue */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Měsíční obrat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="revenue" fill="#4A4A4A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="finance">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Celkový obrat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">{data.orders.length} zakázek</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vyúčtováno</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalSettled)}</p>
              <p className="text-xs text-muted-foreground">schválených vyúčtování</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Přijaté zálohy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalDeposits)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">K doplacení</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalRemaining)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sklad — nákupní hodnota</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(stockValuation)}</p>
              <p className="text-xs text-muted-foreground">{data.stock.length} položek</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sklad — prodejní hodnota</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(stockSellValue)}</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}
