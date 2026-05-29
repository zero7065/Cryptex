import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Percent, BellRing, DollarSign, Gift, Zap, Globe } from "lucide-react";

type PSettings = Record<string, string>;

export default function AdminSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery<PSettings>({ queryKey: ["admin-settings"], queryFn: () => apiGet("/admin/settings") });

  const [rate, setRate] = useState(""); const [rateOverride, setRateOverride] = useState(""); const [spread, setSpread] = useState("");
  const [r7, setR7] = useState(""); const [r14, setR14] = useState(""); const [r30, setR30] = useState(""); const [minAmt, setMinAmt] = useState(""); const [penalty, setPenalty] = useState(true); const [penaltyPct, setPenaltyPct] = useState("");
  const [welcomeBonus, setWelcomeBonus] = useState(""); const [refBonus, setRefBonus] = useState(""); const [refMinDeposit, setRefMinDeposit] = useState("");
  const [walletAddr, setWalletAddr] = useState(""); const [network, setNetwork] = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [vol24h, setVol24h] = useState(""); const [traders, setTraders] = useState(""); const [ordersCompleted, setOrdersCompleted] = useState("");
  const [notifTitle, setNotifTitle] = useState(""); const [notifMsg, setNotifMsg] = useState(""); const [notifUserId, setNotifUserId] = useState("");

  useEffect(() => {
    if (!settings) return;
    setRate(settings.exchange_rate || ""); setRateOverride(settings.rate_override || ""); setSpread(settings.rate_spread_percent || "");
    setR7(settings.savings_rate_7d || ""); setR14(settings.savings_rate_14d || ""); setR30(settings.savings_rate_30d || ""); setMinAmt(settings.savings_min_amount || ""); setPenalty(settings.savings_early_withdraw_penalty !== "false"); setPenaltyPct(settings.savings_penalty_percent || "");
    setWelcomeBonus(settings.welcome_bonus_amount || ""); setRefBonus(settings.referral_bonus_referrer || ""); setRefMinDeposit(settings.referral_min_deposit || "");
    setWalletAddr(settings.usdt_wallet_address || ""); setNetwork(settings.usdt_network || "");
    setMaintenance(settings.maintenance_mode === "true");
    setVol24h(settings.fake_volume_24h || ""); setTraders(settings.fake_traders_active || ""); setOrdersCompleted(settings.fake_orders_completed || "");
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: (updates: Record<string, string>) => apiPatch("/admin/settings", updates),
    onSuccess: () => { toast({ title: "Settings saved" }); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const broadcast = useMutation({
    mutationFn: () => apiPost("/admin/broadcast", { title: notifTitle, message: notifMsg, targetUserId: notifUserId ? parseInt(notifUserId) : undefined }),
    onSuccess: () => { toast({ title: "Broadcast sent" }); setNotifTitle(""); setNotifMsg(""); setNotifUserId(""); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <AppLayout><div className="p-12 text-center text-muted-foreground">Loading settings...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div><h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Settings className="h-6 w-6 text-primary" />Platform Settings</h1><p className="text-muted-foreground">Configure all platform variables.</p></div>

        {/* Exchange Rate */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Exchange Rate</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Base Rate (EUR/USDT)</Label><Input type="number" step="0.0001" value={rate} onChange={e => setRate(e.target.value)} className="font-mono" /></div>
              <div className="space-y-2"><Label>Rate Override (leave blank for live)</Label><Input type="number" step="0.0001" value={rateOverride} onChange={e => setRateOverride(e.target.value)} className="font-mono" placeholder="e.g. 0.9200" /></div>
              <div className="space-y-2"><Label>Spread (%)</Label><Input type="number" step="0.1" value={spread} onChange={e => setSpread(e.target.value)} className="font-mono" /></div>
            </div>
            <Button onClick={() => updateSettings.mutate({ exchange_rate: rate, rate_override: rateOverride, rate_spread_percent: spread })}>Save Rate Settings</Button>
          </CardContent>
        </Card>

        {/* Savings */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-green-500" />Savings Rates (% per day)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>7-Day Rate</Label><Input type="number" step="0.01" value={r7} onChange={e => setR7(e.target.value)} className="font-mono" /></div>
              <div className="space-y-2"><Label>14-Day Rate</Label><Input type="number" step="0.01" value={r14} onChange={e => setR14(e.target.value)} className="font-mono" /></div>
              <div className="space-y-2"><Label>30-Day Rate</Label><Input type="number" step="0.01" value={r30} onChange={e => setR30(e.target.value)} className="font-mono" /></div>
              <div className="space-y-2"><Label>Min Amount (€)</Label><Input type="number" value={minAmt} onChange={e => setMinAmt(e.target.value)} className="font-mono" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3"><Switch checked={penalty} onCheckedChange={setPenalty} /><Label>Early Withdrawal Penalty</Label></div>
              {penalty && <div className="space-y-2"><Label>Penalty %</Label><Input type="number" step="1" value={penaltyPct} onChange={e => setPenaltyPct(e.target.value)} className="font-mono" /></div>}
            </div>
            <Button onClick={() => updateSettings.mutate({ savings_rate_7d: r7, savings_rate_14d: r14, savings_rate_30d: r30, savings_min_amount: minAmt, savings_early_withdraw_penalty: penalty.toString(), savings_penalty_percent: penaltyPct })}>Save Savings Rates</Button>
          </CardContent>
        </Card>

        {/* Bonuses */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-pink-500" />Bonuses & Referrals</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Welcome Bonus (€)</Label><Input type="number" value={welcomeBonus} onChange={e => setWelcomeBonus(e.target.value)} className="font-mono" /></div>
              <div className="space-y-2"><Label>Referral Bonus (€ each)</Label><Input type="number" value={refBonus} onChange={e => setRefBonus(e.target.value)} className="font-mono" /></div>
              <div className="space-y-2"><Label>Min Deposit for Referral (USDT)</Label><Input type="number" value={refMinDeposit} onChange={e => setRefMinDeposit(e.target.value)} className="font-mono" /></div>
            </div>
            <Button onClick={() => updateSettings.mutate({ welcome_bonus_amount: welcomeBonus, referral_bonus_referrer: refBonus, referral_bonus_referred: refBonus, referral_min_deposit: refMinDeposit })}>Save Bonus Settings</Button>
          </CardContent>
        </Card>

        {/* Wallet */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-500" />Escrow Wallet</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-2"><Label>USDT Wallet Address</Label><Input value={walletAddr} onChange={e => setWalletAddr(e.target.value)} className="font-mono" /></div>
              <div className="space-y-2"><Label>Network</Label><Input value={network} onChange={e => setNetwork(e.target.value)} placeholder="TRC20 (TRON)" /></div>
            </div>
            <Button onClick={() => updateSettings.mutate({ usdt_wallet_address: walletAddr, usdt_network: network })}>Save Wallet</Button>
          </CardContent>
        </Card>

        {/* Fake Stats */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-blue-500" />Display Stats (Landing Page)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>24h Volume (€)</Label><Input type="number" value={vol24h} onChange={e => setVol24h(e.target.value)} className="font-mono" /></div>
              <div className="space-y-2"><Label>Active Traders</Label><Input type="number" value={traders} onChange={e => setTraders(e.target.value)} className="font-mono" /></div>
              <div className="space-y-2"><Label>Orders Completed</Label><Input type="number" value={ordersCompleted} onChange={e => setOrdersCompleted(e.target.value)} className="font-mono" /></div>
            </div>
            <Button onClick={() => updateSettings.mutate({ fake_volume_24h: vol24h, fake_traders_active: traders, fake_orders_completed: ordersCompleted })}>Save Display Stats</Button>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardHeader><CardTitle>Platform Control</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
              <div className="flex items-center gap-3 flex-1"><Switch checked={maintenance} onCheckedChange={v => { setMaintenance(v); updateSettings.mutate({ maintenance_mode: v.toString() }); }} /><div><Label>Maintenance Mode</Label><p className="text-xs text-muted-foreground">Displays a maintenance message to all users.</p></div></div>
            </div>
          </CardContent>
        </Card>

        {/* Broadcast */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-orange-500" />Broadcast Notification</CardTitle><CardDescription>Send a message to a specific user or all users.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Title</Label><Input placeholder="e.g. System Update" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} /></div>
              <div className="space-y-2"><Label>Target User ID <span className="text-muted-foreground">(blank = all)</span></Label><Input type="number" placeholder="Leave blank for all users" value={notifUserId} onChange={e => setNotifUserId(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Message</Label><Textarea placeholder="Your message..." value={notifMsg} onChange={e => setNotifMsg(e.target.value)} rows={3} /></div>
            <Button disabled={!notifTitle || !notifMsg || broadcast.isPending} onClick={() => broadcast.mutate()}>
              {broadcast.isPending ? "Sending..." : notifUserId ? "Send to User" : "Broadcast to All"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
