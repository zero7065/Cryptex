import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Eye, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type KycSub = {
  id: number; userId: number; fullName: string; dob: string; address: string; country: string;
  idFrontData: string | null; idBackData: string | null; selfieData: string | null;
  status: string; adminNotes: string | null; createdAt: string; reviewedAt: string | null;
  userEmail: string; username: string;
};

export default function AdminKYCPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<KycSub | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: submissions = [], isLoading } = useQuery<KycSub[]>({
    queryKey: ["admin-kyc", statusFilter],
    queryFn: () => apiGet(`/admin/kyc${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
    refetchInterval: 15000,
  });

  const approve = useMutation({
    mutationFn: (id: number) => apiPost(`/admin/kyc/${id}/approve`, {}),
    onSuccess: () => { toast({ title: "KYC Approved", description: "User has been notified." }); qc.invalidateQueries({ queryKey: ["admin-kyc"] }); setSelected(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => apiPost(`/admin/kyc/${id}/reject`, { reason }),
    onSuccess: () => { toast({ title: "KYC Rejected", description: "User has been notified." }); qc.invalidateQueries({ queryKey: ["admin-kyc"] }); setSelected(null); setShowReject(false); setRejectReason(""); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const counts = {
    pending: submissions.filter(s => s.status === "pending").length,
    approved: submissions.filter(s => s.status === "approved").length,
    rejected: submissions.filter(s => s.status === "rejected").length,
  };

  const filtered = submissions.filter(s =>
    s.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColor = (s: string) => s === "approved" ? "bg-green-500/20 text-green-500" : s === "rejected" ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500";

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />KYC Queue</h1>
            <p className="text-muted-foreground">Review and approve identity verification submissions.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-8 w-8 text-yellow-500" /><div><div className="text-2xl font-bold">{counts.pending}</div><div className="text-xs text-muted-foreground">Pending</div></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><div className="text-2xl font-bold">{counts.approved}</div><div className="text-xs text-muted-foreground">Approved</div></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><XCircle className="h-8 w-8 text-red-500" /><div><div className="text-2xl font-bold">{counts.rejected}</div><div className="text-xs text-muted-foreground">Rejected</div></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
              <Input placeholder="Search email or name..." className="w-full sm:w-64" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No submissions found.</div>
            ) : (
              <div className="space-y-3">
                {filtered.map(sub => (
                  <div key={sub.id} className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setSelected(sub)}>
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary shrink-0">{sub.fullName?.[0] || "?"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{sub.fullName}</div>
                      <div className="text-sm text-muted-foreground">{sub.userEmail} • {sub.country}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Submitted {new Date(sub.createdAt).toLocaleDateString()}</div>
                    </div>
                    <Badge className={statusColor(sub.status)}>{sub.status}</Badge>
                    <Button variant="outline" size="sm" className="gap-1"><Eye className="h-3 w-3" />Review</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Modal */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader><DialogTitle>KYC Review: {selected.fullName}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Email:</span> {selected.userEmail}</div>
                  <div><span className="text-muted-foreground">DOB:</span> {selected.dob}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {selected.address}, {selected.country}</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[{ label: "ID Front", data: selected.idFrontData }, { label: "ID Back", data: selected.idBackData }, { label: "Selfie", data: selected.selfieData }].map(({ label, data }) => (
                    <div key={label} className="space-y-1">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      {data ? (
                        <img src={data} alt={label} className="w-full rounded-lg object-cover aspect-[4/3] cursor-pointer hover:opacity-90" onClick={() => window.open(data, "_blank")} />
                      ) : (
                        <div className="w-full aspect-[4/3] bg-secondary rounded-lg flex items-center justify-center text-muted-foreground text-sm">No image</div>
                      )}
                    </div>
                  ))}
                </div>
                {selected.adminNotes && (
                  <div className="p-3 bg-secondary rounded-lg text-sm"><span className="text-muted-foreground">Admin notes: </span>{selected.adminNotes}</div>
                )}
                {selected.status === "pending" && (
                  <DialogFooter className="gap-2 flex-col sm:flex-row">
                    <Button variant="outline" className="flex-1 text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => setShowReject(true)}>
                      <XCircle className="h-4 w-4 mr-2" />Reject
                    </Button>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => approve.mutate(selected.id)} disabled={approve.isPending}>
                      <CheckCircle className="h-4 w-4 mr-2" />{approve.isPending ? "Approving..." : "Approve"}
                    </Button>
                  </DialogFooter>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Modal */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject KYC Submission</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason for rejection (will be shown to user)..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => selected && reject.mutate({ id: selected.id, reason: rejectReason })} disabled={reject.isPending}>
              {reject.isPending ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
