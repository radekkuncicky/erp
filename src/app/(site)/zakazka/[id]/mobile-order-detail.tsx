"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  formatCurrency, formatDate, formatPhone, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, UNIT_LABELS,
} from "@/lib/utils/format"
import {
  Phone, Mail, MapPin, Calendar, Camera, FileText, ClipboardCheck, ChevronDown, ChevronUp, Package,
} from "lucide-react"
import Link from "next/link"

interface MobileOrderDetailProps {
  order: any
}

export function MobileOrderDetail({ order }: MobileOrderDetailProps) {
  const [showItems, setShowItems] = useState(false)

  const address = order.installation_address || [order.address_street, order.address_city, order.address_zip].filter(Boolean).join(", ")
  const mapsUrl = address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{order.client_name}</h1>
            <p className="text-xs text-muted-foreground">{order.order_number}</p>
          </div>
          <Badge className={ORDER_STATUS_COLORS[order.status]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>
        {order.category && (
          <p className="text-sm text-muted-foreground mt-1">{order.category}</p>
        )}
      </div>

      {/* Quick Contact Actions */}
      <div className="grid grid-cols-3 gap-2">
        {order.client_phone && (
          <Button variant="outline" size="sm" asChild className="h-auto py-3 flex-col gap-1">
            <a href={`tel:${order.client_phone}`}>
              <Phone className="h-5 w-5 text-nanto-yellow" />
              <span className="text-xs">Volat</span>
            </a>
          </Button>
        )}
        {order.client_email && (
          <Button variant="outline" size="sm" asChild className="h-auto py-3 flex-col gap-1">
            <a href={`mailto:${order.client_email}`}>
              <Mail className="h-5 w-5 text-nanto-yellow" />
              <span className="text-xs">Email</span>
            </a>
          </Button>
        )}
        {mapsUrl && (
          <Button variant="outline" size="sm" asChild className="h-auto py-3 flex-col gap-1">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="h-5 w-5 text-nanto-yellow" />
              <span className="text-xs">Mapa</span>
            </a>
          </Button>
        )}
      </div>

      {/* Info Cards */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Adresa instalace</p>
                <p className="text-sm text-muted-foreground">{address}</p>
              </div>
            </div>
          )}
          {order.project_start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Termín</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(order.project_start_date)}
                  {order.project_end_date && ` — ${formatDate(order.project_end_date)}`}
                </p>
              </div>
            </div>
          )}
          {order.contact_person && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium">{order.contact_person}</p>
                {order.contact_phone && (
                  <a href={`tel:${order.contact_phone}`} className="text-sm text-nanto-yellow">
                    {formatPhone(order.contact_phone)}
                  </a>
                )}
              </div>
            </>
          )}
          {order.notes && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Items (collapsible) */}
      <Card>
        <button
          onClick={() => setShowItems(!showItems)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="font-medium text-sm">Položky ({order.order_items?.length || 0})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{formatCurrency(order.total_price_without_vat)}</span>
            {showItems ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
        {showItems && (
          <CardContent className="pt-0 pb-4">
            <div className="space-y-2">
              {(order.order_items || [])
                .sort((a: any, b: any) => a.sort_order - b.sort_order)
                .map((item: any) => {
                  const lineTotal = item.unit_price * item.quantity * (1 - item.discount_percent / 100)
                  return (
                    <div key={item.id} className="flex items-start justify-between py-2 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} {UNIT_LABELS[item.unit] || item.unit} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <span className="text-sm font-medium ml-2">{formatCurrency(lineTotal)}</span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
          <Link href={`/zakazka/${order.id}/fotky`}>
            <Camera className="h-6 w-6" />
            <span className="text-sm">Fotodokumentace</span>
          </Link>
        </Button>
        <Button className="h-auto py-4 flex-col gap-2" asChild>
          <Link href={`/zakazka/${order.id}/protokol`}>
            <ClipboardCheck className="h-6 w-6" />
            <span className="text-sm">Předávací protokol</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
