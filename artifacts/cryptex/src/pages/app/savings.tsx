import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useListSavingsPlans, useGetSavingsRates, useCreateSavingsPlan, useEarlyWithdrawSavings, getListSavingsPlansQueryKey, getGetUserBalanceQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PiggyBank, Clock, TrendingUp, AlertTriangle, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const createPlanSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum 100 EUR"),
  durationDays: z.coerce.number(),
});

export default function Savings() {
  const { data: plansData, isLoading: plansLoading } = useListSavingsPlans({ query: { queryKey: getListSavingsPlansQueryKey() } });
  const { data: rates, isLoading: ratesLoading } = useGetSavingsRates();
  const createPlanMutation = useCreateSavingsPlan();
  const withdrawMutation = useEarlyWithdrawSavings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState<number | null>(null);

  const form = useForm<z.infer<typeof createPlanSchema>>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      amount: 1000,
      durationDays: 30,
    },
  });

  const amount = form.watch("amount");
  const durationDays = form.watch("durationDays");

  const getRateForDuration = (days: number) => {
    if (!rates) return 0;
    if (days === 7) return rates.rate7d;
    if (days === 14) return rates.rate14d;
    if (days === 30) return rates.rate30d;
    return 0;
  };

  const currentRate = getRateForDuration(durationDays);
  const projectedReturn = amount * (currentRate / 100) * durationDays;

  const onCreatePlan = (data: z.infer<typeof createPlanSchema>) => {
    createPlanMutation.mutate(
      { data: { amount: data.amount, durationDays: data.durationDays as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSavingsPlansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUserBalanceQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          setCreateOpen(false);
          form.reset();
          toast({
            title: "Savings Plan Created",
            description: `Successfully locked €${data.amount} for ${data.durationDays} days.`,
          });
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Failed to create plan",
            description: err.message,
          });
        }
      }
    );
  };

  const onEarlyWithdraw = (planId: number) => {
    withdrawMutation.mutate(
      { id: planId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSavingsPlansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUserBalanceQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          setWithdrawOpen(null);
          toast({
            title: "Funds Withdrawn",
            description: "Your funds have been returned to your available balance.",
          });
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Withdrawal failed",
            description: err.message,
          });
        }
      }
    );
  };

  const activePlans = plansData?.plans.filter((p: any) => p.status === 'active') || [];
  const completedPlans = plansData?.plans.filter((p: any) => p.status !== 'active') || [];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">High-Yield Savings</h1>
            <p className="text-muted-foreground">Earn daily compounding interest on your EUR balance.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-primary text-primary-foreground font-medium shadow-sm hover:opacity-90">
                <PiggyBank className="mr-2 h-5 w-5" />
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Savings Plan</DialogTitle>
                <DialogDescription>Lock in your EUR to earn daily yield.</DialogDescription>
              </DialogHeader>
              {ratesLoading ? (
                <div className="py-6 flex justify-center"><Skeleton className="h-32 w-full" /></div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onCreatePlan)} className="space-y-6 pt-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (EUR)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1000" className="font-mono text-lg" {...field} />
                          </FormControl>
                          <FormMessage />
                          <div className="text-xs text-muted-foreground mt-1">Min: €{rates?.minAmount || 100}</div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="durationDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(Number(val))} 
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="7">7 Days ({rates?.rate7d}% daily)</SelectItem>
                              <SelectItem value="14">14 Days ({rates?.rate14d}% daily)</SelectItem>
                              <SelectItem value="30">30 Days ({rates?.rate30d}% daily)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Daily Rate:</span>
                        <span className="font-mono font-medium">{currentRate}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Estimated Return:</span>
                        <span className="font-mono font-bold text-primary">+€{projectedReturn.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">End Date:</span>
                        <span className="font-mono font-medium">{format(addDays(new Date(), durationDays), "MMM d, yyyy")}</span>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={createPlanMutation.isPending}>
                      {createPlanMutation.isPending ? "Creating..." : "Confirm & Lock Funds"}
                    </Button>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Plans */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Plans</h2>
          {plansLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
          ) : activePlans.length === 0 ? (
            <Card className="border-dashed bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <PiggyBank className="h-12 w-12 mb-4 opacity-20" />
                <p>No active savings plans.</p>
                <Button variant="link" className="mt-2 text-primary" onClick={() => setCreateOpen(true)}>Create one now</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePlans.map((plan: any) => {
                const daysRemaining = differenceInDays(new Date(plan.endDate), new Date());
                const progress = ((plan.durationDays - Math.max(0, daysRemaining)) / plan.durationDays) * 100;
                
                return (
                  <Card key={plan.id} className="border-border shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-primary h-1 w-full" style={{ width: `${progress}%` }} />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardDescription>Locked Amount</CardDescription>
                          <CardTitle className="text-2xl font-mono">€{plan.amount.toFixed(2)}</CardTitle>
                        </div>
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                          {plan.dailyRate}% / day
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 flex-1">
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Earned</p>
                          <p className="font-mono text-green-500 font-bold">+€{plan.profitEarned.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Time Left</p>
                          <p className="font-mono font-medium flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {Math.max(0, daysRemaining)} days
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <div className="bg-secondary/30 p-4 border-t border-border flex justify-between items-center mt-auto">
                      <span className="text-xs text-muted-foreground">Ends: {format(new Date(plan.endDate), "MMM d, yyyy")}</span>
                      
                      <Dialog open={withdrawOpen === plan.id} onOpenChange={(open) => setWithdrawOpen(open ? plan.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8">
                            Early Withdraw
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-destructive flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5" /> Early Withdrawal Warning
                            </DialogTitle>
                            <DialogDescription>
                              Withdrawing before the end date will incur a penalty and forfeit unpaid interest.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Warning</AlertTitle>
                            <AlertDescription>
                              You are withdrawing €{plan.amount.toFixed(2)}. 
                              {rates?.earlyWithdrawPenalty && ` A penalty of ${rates.penaltyPercent}% will be applied.`}
                            </AlertDescription>
                          </Alert>
                          
                          <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" onClick={() => setWithdrawOpen(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => onEarlyWithdraw(plan.id)} disabled={withdrawMutation.isPending}>
                              {withdrawMutation.isPending ? "Processing..." : "Confirm Withdrawal"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed Plans */}
        {completedPlans.length > 0 && (
          <div className="space-y-4 pt-8">
            <h2 className="text-xl font-semibold">Past Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {completedPlans.map((plan: any) => (
                <Card key={plan.id} className="border-border shadow-sm bg-secondary/10">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-mono font-medium">€{plan.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{plan.durationDays} days</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-xs capitalize ${plan.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        {plan.status.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-border pt-3">
                      <span className="text-muted-foreground">Total Earned</span>
                      <span className="font-mono text-green-500 font-bold">+€{plan.profitEarned.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
