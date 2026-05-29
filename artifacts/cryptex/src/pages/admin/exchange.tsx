import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { useAdminListExchangeOrders, useAdminConfirmExchangeOrder, useAdminRejectExchangeOrder, getAdminListExchangeOrdersQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function AdminExchange() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const { data, isLoading } = useAdminListExchangeOrders({ query: { status: tab === "pending" ? "pending" : undefined } });
  
  const confirmMutation = useAdminConfirmExchangeOrder();
  const rejectMutation = useAdminRejectExchangeOrder();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const handleConfirm = (id: number) => {
    confirmMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListExchangeOrdersQueryKey() });
          toast({ title: "Order confirmed", description: "EUR added to user's balance." });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message })
      }
    );
  };

  const handleReject = () => {
    if (!rejectId || !reason) return;
    rejectMutation.mutate(
      { id: rejectId, data: { reason } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListExchangeOrdersQueryKey() });
          setRejectId(null);
          setReason("");
          toast({ title: "Order rejected" });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message })
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Exchange Orders</h1>
          <p className="text-muted-foreground">Review and process OTC USDT deposits.</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="all">All Orders</TabsTrigger>
          </TabsList>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User / Date</TableHead>
                    <TableHead className="text-right">USDT Amount</TableHead>
                    <TableHead className="text-right">EUR Amount</TableHead>
                    <TableHead>TXID</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {tab === "pending" && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center h-24">Loading...</TableCell></TableRow>
                  ) : data?.orders.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center h-24">No orders found.</TableCell></TableRow>
                  ) : (
                    data?.orders.map(order => (
                      <TableRow key={order.id} className="hover:bg-secondary/20">
                        <TableCell>
                          <Link href={`/admin/users/${order.userId}`} className="font-medium text-primary hover:underline">{order.userEmail}</Link>
                          <div className="text-xs text-muted-foreground">{format(new Date(order.createdAt), "MMM d, HH:mm")}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{order.usdtAmount.toFixed(2)} USDT</TableCell>
                        <TableCell className="text-right font-mono font-bold text-green-500">€{order.eurAmount.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[150px] truncate" title={order.txid}>
                          {order.txid}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={order.status === 'completed' ? 'default' : order.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        {tab === "pending" && order.status === "pending" && (
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" onClick={() => handleConfirm(order.id)} disabled={confirmMutation.isPending}>
                              Confirm
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setRejectId(order.id)}>
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
              <DialogTitle>Reject Order</DialogTitle>
              <DialogDescription>Please provide a reason for rejecting this deposit.</DialogDescription>
            </DialogHeader>
            <Textarea 
              placeholder="e.g. TXID not found on network" 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending || !reason}>
                Reject Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
