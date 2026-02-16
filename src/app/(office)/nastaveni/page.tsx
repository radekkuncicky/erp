import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/utils/format"
import { Settings, Webhook } from "lucide-react"

export const metadata: Metadata = {
  title: "Nastavení",
}

export default async function NastaveniPage() {
  const supabase = await createClient()

  const { data: webhookLogs } = await supabase
    .from("webhook_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30)

  const logs = webhookLogs || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nastavení</h1>
        <p className="text-muted-foreground">Konfigurace systému</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Webhook konfigurace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Endpoint</span>
                <code className="text-xs bg-secondary px-2 py-1 rounded">/api/webhook/raynet</code>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Secret header</span>
                <code className="text-xs bg-secondary px-2 py-1 rounded">x-webhook-secret</code>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Stav</span>
                <Badge className="bg-green-100 text-green-800">Aktivní</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook logy ({logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Čas</TableHead>
                  <TableHead>Událost</TableHead>
                  <TableHead>Raynet ID</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Chyba</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Žádné logy</TableCell></TableRow>
                ) : (
                  logs.map((log: any) => {
                    const statusColors: Record<string, string> = {
                      processed: "bg-green-100 text-green-800",
                      processing: "bg-blue-100 text-blue-800",
                      error: "bg-red-100 text-red-800",
                    }
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{formatDateTime(log.created_at)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.event_type}</TableCell>
                        <TableCell className="font-mono text-sm">{log.raynet_id || "—"}</TableCell>
                        <TableCell><Badge className={statusColors[log.status] || ""}>{log.status}</Badge></TableCell>
                        <TableCell className="text-sm text-destructive max-w-[300px] truncate">{log.error_message || "—"}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
