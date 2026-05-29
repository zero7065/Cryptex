import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { useAdminListWithdrawals, useAdminProcessWithdrawal, getAdminListWithdrawalsQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function AdminWithdrawals() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const { data, isLoading } = useAdminListWithdrawals({ query: { status: tab === "pending" ? "pending" : undefined } });
  
  const processMutation = useAdminProcessWithdrawal();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const handleMarkPaid = (id: number) => {
    processMutation.mutate(
      { id, data: { action: "complete" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListWithdrawalsQueryKey() });
          toast({ title: "Withdrawal marked as paid" });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message })
      }
    );
  };

  const handleReject = () => {
    if (!rejectId || !reason) return;
    processMutation.mutate(
      { id: rejectId, data: { action: "reject", reason } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListWithdrawalsQueryKey() });
          setRejectId(null);
          setReason("");
          toast({ title: "Withdrawal rejected", description: "Funds returned to user." });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message })
      }
    );
  };

  const renderAccountDetails = (method: string, details: any) => {
    return (
      <div className="text-xs space-y-1 mt-1 bg-secondary/30 p-2 rounded border border-border">
        {Object.entries(details).map(([k, v]) => (
          <div key={k}><span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span> <span className="font-mono">{String(v)}</span></div>
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Withdrawals</h1>
          <p className="text-muted-foreground">Process fiat payout requests.</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="all">All Requests</TabsTrigger>
          </TabsList>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User / Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method & Details</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {tab === "pending" && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
                  ) : data?.withdrawals.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center h-24">No withdrawals found.</TableCell></TableRow>
                  ) : (
                    data?.withdrawals.map(wd => (
                      <TableRow key={wd.id} className="hover:bg-secondary/20 items-start">
                        <TableCell className="align-top pt-4">
                          <Link href={`/admin/users/${wd.userId}`} className="font-medium text-primary hover:underline">{wd.userEmail}</Link>
                          <div className="text-xs text-muted-foreground">{format(new Date(wd.createdAt), "MMM d, HH:mm")}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold align-top pt-4">€{wd.amount.toFixed(2)}</TableCell>
                        <TableCell className="align-top pt-4">
                          <Badge variant="outline" className="mb-1 uppercase text-[10px]">{wd.method.replace('_', ' ')}</Badge>
                          {renderAccountDetails(wd.method, wd.accountDetails)}
                        </TableCell>
                        <TableCell className="text-center align-top pt-4">
                          <Badge variant={wd.status === 'completed' ? 'default' : wd.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {wd.status}
                          </Badge>
                        </TableCell>
                        {tab === "pending" && wd.status === "pending" && (
                          <TableCell className="text-right space-y-2 align-top pt-4">
                            <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => handleMarkPaid(wd.id)} disabled={processMutation.isPending}>
                              Mark Paid
                            </Button>
                            <Button size="sm" variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setRejectId(wd.id)}>
                              Reject
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Tabs>

        <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Withdrawal</DialogTitle>
              <DialogDescription>Provide a reason. The funds will be returned to the user's available balance.</DialogDescription>
            </DialogHeader>
            <Textarea 
              placeholder="e.g. Invalid bank details" 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={processMutation.isPending || !reason}>
                Reject & Return Funds
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
