import { AppLayout } from "@/components/layout/app-layout";
import { useAdminGetUser, useAdminAdjustBalance, getAdminGetUserQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, Wallet, Lock, Plus, ArrowRightLeft, Landmark, PiggyBank } from "lucide-react";
import { format } from "date-fns";

const adjustSchema = z.object({
  amount: z.coerce.number(),
  type: z.enum(["available", "locked"]),
  reason: z.string().min(1, "Reason required"),
});

export default function AdminUserDetail() {
  const params = useParams();
  const userId = Number(params.id);
  const { data, isLoading } = useAdminGetUser(userId, { query: { enabled: !!userId } });
  const adjustMutation = useAdminAdjustBalance(userId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof adjustSchema>>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { amount: 0, type: "available", reason: "" },
  });

  if (isLoading || !data) {
    return <AppLayout><div className="p-8 text-center text-muted-foreground">Loading...</div></AppLayout>;
  }

  const { user, recentExchanges, recentWithdrawals, activeSavings } = data;

  const onAdjust = (formData: z.infer<typeof adjustSchema>) => {
    adjustMutation.mutate(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(userId) });
          setOpen(false);
          form.reset();
          toast({ title: "Balance adjusted successfully" });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Adjustment failed", description: err.message });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-secondary p-3 rounded-full">
              <UserCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{user.email}</h1>
              <p className="text-sm text-muted-foreground">User ID: {user.id} • Joined {format(new Date(user.createdAt), "MMM d, yyyy")}</p>
            </div>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Adjust Balance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust User Balance</DialogTitle>
                <DialogDescription>Manually add or remove funds for {user.email}.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAdjust)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Balance Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="available">Available EUR</SelectItem>
                            <SelectItem value="locked">Locked EUR</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (Use negative to remove)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason / Note</FormLabel>
                        <FormControl><Input placeholder="Manual deposit" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={adjustMutation.isPending}>
                    {adjustMutation.isPending ? "Processing..." : "Confirm Adjustment"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Available EUR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-green-500">€{user.availableEur.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase flex items-center gap-2">
                <Lock className="h-4 w-4" /> Locked EUR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">€{user.lockedEur.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><ArrowRightLeft className="h-5 w-5 text-blue-500" /> Recent Exchanges</CardTitle>
            </CardHeader>
            <CardContent>
              {recentExchanges.length === 0 ? <p className="text-muted-foreground text-sm">No recent exchanges.</p> : (
                <div className="space-y-4">
                  {recentExchanges.map((ex) => (
                    <div key={ex.id} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                      <div>
                        <span className="font-mono text-xs">{format(new Date(ex.createdAt), "MMM d")}</span>
                        <div className="font-medium text-foreground">{ex.usdtAmount} USDT → €{ex.eurAmount.toFixed(2)}</div>
                      </div>
                      <span className={`capitalize ${ex.status === 'completed' ? 'text-green-500' : ex.status === 'pending' ? 'text-yellow-500' : 'text-red-500'}`}>{ex.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Landmark className="h-5 w-5 text-purple-500" /> Recent Withdrawals</CardTitle>
            </CardHeader>
            <CardContent>
              {recentWithdrawals.length === 0 ? <p className="text-muted-foreground text-sm">No recent withdrawals.</p> : (
                <div className="space-y-4">
                  {recentWithdrawals.map((wd) => (
                    <div key={wd.id} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                      <div>
                        <span className="font-mono text-xs">{format(new Date(wd.createdAt), "MMM d")}</span>
                        <div className="font-medium text-foreground">€{wd.amount.toFixed(2)} ({wd.method.replace('_', ' ')})</div>
                      </div>
                      <span className={`capitalize ${wd.status === 'completed' ? 'text-green-500' : wd.status === 'pending' ? 'text-yellow-500' : 'text-red-500'}`}>{wd.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
