import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete, apiPatch } from "@/lib/api";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellRing, Trash2, RefreshCw, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Alert = { id: number; pair: string; targetRate: number; direction: string; isTriggered: boolean; triggeredAt: string | null; createdAt: string };
type RateData = { rate: number; source: string; updatedAt: string };

export default function RateAlertsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pair, setPair] = useState("USDT/EUR");
  const [targetRate, setTargetRate] = useState("");
  const [direction, setDirection] = useState("above");

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["rate-alerts"],
    queryFn: () => apiGet("/rate-alerts"),
  });

  const { data: rateData } = useQuery<RateData>({
    queryKey: ["live-rate"],
    queryFn: () => apiGet("/rates/live"),
    refetchInterval: 30000,
  });

  const createAlert = useMutation({
    mutationFn: () => apiPost("/rate-alerts", { pair, targetRate: parseFloat(targetRate), direction }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rate-alerts"] }); setTargetRate(""); toast({ title: "Alert created", description: `You'll be notified when ${pair} goes ${direction} ${targetRate}` }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteAlert = useMutation({
    mutationFn: (id: number) => apiDelete(`/rate-alerts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rate-alerts"] }); toast({ title: "Alert deleted" }); },
  });

  const resetAlert = useMutation({
    mutationFn: (id: number) => apiPatch(`/rate-alerts/${id}/reset`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rate-alerts"] }); toast({ title: "Alert reset" }); },
  });

  const currentRate = rateData?.rate;
  const activeAlerts = alerts.filter(a => !a.isTriggered);
  const triggeredAlerts = alerts.filter(a => a.isTriggered);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rate Alerts</h1>
          <p className="text-muted-foreground mt-1">Get notified when the USDT/EUR rate hits your target.</p>
        </div>

        {/* Current Rate */}
        <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Current USDT/EUR Rate</div>
              <div className="text-4xl font-bold font-mono text-primary">{currentRate?.toFixed(4) ?? "—"}</div>
              {rateData?.updatedAt && <div className="text-xs text-muted-foreground mt-1">Updated {new Date(rateData.updatedAt).toLocaleTimeString()}</div>}
            </div>
            <BellRing className="h-12 w-12 text-primary/30" />
          </CardContent>
        </Card>

        {/* Create Alert */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />New Alert</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pair</Label>
                <Select value={pair} onValueChange={setPair}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT/EUR">USDT/EUR</SelectItem>
                    <SelectItem value="USDT/USD">USDT/USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Goes Above</SelectItem>
                    <SelectItem value="below">Goes Below</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target Rate</Label>
              <Input type="number" step="0.0001" placeholder="e.g. 0.9500" value={targetRate} onChange={e => setTargetRate(e.target.value)} className="font-mono" />
              {currentRate && targetRate && (
                <p className="text-xs text-muted-foreground">Current rate is {currentRate.toFixed(4)} — alert will trigger when {direction} {parseFloat(targetRate).toFixed(4)}</p>
              )}
            </div>
            <Button className="w-full" disabled={!targetRate || !direction || createAlert.isPending} onClick={() => createAlert.mutate()}>
              {createAlert.isPending ? "Creating..." : "Create Alert"}
            </Button>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Active Alerts ({activeAlerts.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {activeAlerts.map(alert => (
                <div key={alert.id} className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
                  {alert.direction === "above" ? <TrendingUp className="h-5 w-5 text-green-500 shrink-0" /> : <TrendingDown className="h-5 w-5 text-red-500 shrink-0" />}
                  <div className="flex-1">
                    <div className="font-medium">{alert.pair} {alert.direction === "above" ? "▲" : "▼"} {alert.targetRate.toFixed(4)}</div>
                    <div className="text-xs text-muted-foreground">Created {new Date(alert.createdAt).toLocaleDateString()}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteAlert.mutate(alert.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Triggered Alerts */}
        {triggeredAlerts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-muted-foreground"><BellRing className="h-5 w-5" />Triggered ({triggeredAlerts.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {triggeredAlerts.map(alert => (
                <div key={alert.id} className={cn("flex items-center gap-4 p-4 rounded-xl opacity-75", "bg-primary/5 border border-primary/20")}>
                  <BellRing className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{alert.pair} {alert.direction === "above" ? "▲" : "▼"} {alert.targetRate.toFixed(4)}</div>
                    <div className="text-xs text-muted-foreground">Triggered {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString() : ""}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => resetAlert.mutate(alert.id)}><RefreshCw className="h-3 w-3" />Reset</Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteAlert.mutate(alert.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {alerts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No alerts set. Create one above to get started.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
