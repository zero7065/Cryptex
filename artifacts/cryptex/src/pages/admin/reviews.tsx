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
import { Plus, Pencil, Trash2, Star, Eye, EyeOff } from "lucide-react";

type Review = { id: number; name: string; avatarUrl: string | null; reviewText: string; stars: number; country: string; tradeCount: number; isVisible: boolean; createdAt: string };

const emptyForm = { name: "", avatarUrl: "", reviewText: "", stars: 5, country: "", tradeCount: 0, isVisible: true };

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["admin-reviews"],
    queryFn: () => apiGet("/admin/reviews"),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (r: Review) => {
    setEditing(r);
    setForm({ name: r.name, avatarUrl: r.avatarUrl || "", reviewText: r.reviewText, stars: r.stars, country: r.country, tradeCount: r.tradeCount, isVisible: r.isVisible });
    setShowModal(true);
  };

  const save = useMutation({
    mutationFn: () => editing ? apiPatch(`/admin/reviews/${editing.id}`, form) : apiPost("/admin/reviews", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); setShowModal(false); toast({ title: editing ? "Review updated" : "Review created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteReview = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/reviews/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast({ title: "Review deleted" }); },
  });

  const toggleVisibility = useMutation({
    mutationFn: ({ id, isVisible }: { id: number; isVisible: boolean }) => apiPatch(`/admin/reviews/${id}`, { isVisible }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  const F = (key: keyof typeof form, val: any) => setForm(f => ({ ...f, [key]: val }));

  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Star className="h-6 w-6 text-primary" />Reviews</h1>
            <p className="text-muted-foreground">Manage testimonials shown on the landing page.</p>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Add Review</Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {reviews.map(r => (
              <Card key={r.id} className={!r.isVisible ? "opacity-60" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{r.name}</span>
                        {r.country && <Badge variant="secondary" className="text-xs">{r.country}</Badge>}
                        <span className="text-yellow-500 text-sm">{stars(r.stars)}</span>
                      </div>
                      {r.tradeCount > 0 && <div className="text-xs text-muted-foreground mt-0.5">{r.tradeCount} trades</div>}
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{r.reviewText}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleVisibility.mutate({ id: r.id, isVisible: !r.isVisible })}>
                        {r.isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Delete?")) deleteReview.mutate(r.id); }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Review" : "Add Review"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => F("name", e.target.value)} placeholder="John D." /></div>
              <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={e => F("country", e.target.value)} placeholder="Germany" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stars (1-5)</Label>
                <div className="flex gap-1">{[1,2,3,4,5].map(s => <button key={s} type="button" className={s <= form.stars ? "text-yellow-500 text-2xl" : "text-muted-foreground text-2xl"} onClick={() => F("stars", s)}>★</button>)}</div>
              </div>
              <div className="space-y-2"><Label>Trade Count</Label><Input type="number" value={form.tradeCount} onChange={e => F("tradeCount", parseInt(e.target.value) || 0)} /></div>
            </div>
            <div className="space-y-2"><Label>Review Text</Label><Textarea value={form.reviewText} onChange={e => F("reviewText", e.target.value)} rows={4} /></div>
            <div className="flex items-center gap-3"><Switch checked={form.isVisible} onCheckedChange={v => F("isVisible", v)} /><Label>Visible on landing page</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || !form.reviewText || save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
