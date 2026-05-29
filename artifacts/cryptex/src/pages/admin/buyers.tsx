import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, TrendingUp, Shield, Clock } from "lucide-react";

type Buyer = { id: number; name: string; avatarUrl: string | null; tradeCount: number; completionRate: number; avgReleaseTime: string; premiumPercent: number; walletAddress: string | null; description: string | null; isActive: boolean; createdAt: string };

const emptyForm = { name: "", avatarUrl: "", tradeCount: 0, completionRate: 99.5, avgReleaseTime: "~15 mins", premiumPercent: 0.2, walletAddress: "", description: "", isActive: true };

export default function AdminBuyersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Buyer | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: buyers = [], isLoading } = useQuery<Buyer[]>({
    queryKey: ["admin-buyers"],
    queryFn: () => apiGet("/admin/buyers"),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (b: Buyer) => {
    setEditing(b);
    setForm({ name: b.name, avatarUrl: b.avatarUrl || "", tradeCount: b.tradeCount, completionRate: b.completionRate, avgReleaseTime: b.avgReleaseTime, premiumPercent: b.premiumPercent, walletAddress: b.walletAddress || "", description: b.description || "", isActive: b.isActive });
    setShowModal(true);
  };

  const save = useMutation({
    mutationFn: () => editing
      ? apiPatch(`/admin/buyers/${editing.id}`, form)
      : apiPost("/admin/buyers", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-buyers"] }); setShowModal(false); toast({ title: editing ? "Buyer updated" : "Buyer created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteBuyer = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/buyers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-buyers"] }); toast({ title: "Buyer deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const F = (key: keyof typeof form, val: any) => setForm(f => ({ ...f, [key]: val }));

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="h-6 w-6 text-primary" />P2P Buyers</h1>
            <p className="text-muted-foreground">Manage verified buyer profiles shown to users.</p>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Add Buyer</Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {buyers.map(b => (
              <Card key={b.id} className={!b.isActive ? "opacity-60" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">{b.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{b.name}</span>
                        <Badge className={b.isActive ? "bg-green-500/20 text-green-500" : "bg-secondary text-muted-foreground"}>{b.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{b.tradeCount.toLocaleString()} trades</span>
                        <span className="flex items-center gap-1"><Shield className="h-3 w-3" />{b.completionRate}%</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.avgReleaseTime}</span>
                        <span className="font-medium text-primary">+{b.premiumPercent}%</span>
                      </div>
                      {b.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{b.description}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(b)}><Pencil className="h-3 w-3" />Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-500 gap-1" onClick={() => { if (confirm("Delete buyer?")) deleteBuyer.mutate(b.id); }}><Trash2 className="h-3 w-3" />Del</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Buyer" : "Add Buyer"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => F("name", e.target.value)} placeholder="e.g. CryptoKing_EU" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Trade Count</Label><Input type="number" value={form.tradeCount} onChange={e => F("tradeCount", parseInt(e.target.value))} /></div>
              <div className="space-y-2"><Label>Completion Rate (%)</Label><Input type="number" step="0.1" max="100" value={form.completionRate} onChange={e => F("completionRate", parseFloat(e.target.value))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Avg Release Time</Label><Input value={form.avgReleaseTime} onChange={e => F("avgReleaseTime", e.target.value)} placeholder="~15 mins" /></div>
              <div className="space-y-2"><Label>Premium (%)</Label><Input type="number" step="0.05" value={form.premiumPercent} onChange={e => F("premiumPercent", parseFloat(e.target.value))} /></div>
            </div>
            <div className="space-y-2"><Label>Wallet Address (TRC20)</Label><Input value={form.walletAddress} onChange={e => F("walletAddress", e.target.value)} placeholder="T..." className="font-mono" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => F("description", e.target.value)} rows={3} /></div>
            <div className="flex items-center gap-3"><Switch checked={form.isActive} onCheckedChange={v => F("isActive", v)} /><Label>Active (visible to users)</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
