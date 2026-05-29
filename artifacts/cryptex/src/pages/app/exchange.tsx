import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetExchangeRate, useGetWalletAddress, useCreateExchangeOrder, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, ArrowRight, ArrowDown, Copy, CheckCircle2, ShieldCheck, Clock, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const exchangeSchema = z.object({
  usdtAmount: z.coerce.number().min(50, "Minimum 50 USDT").max(50000, "Maximum 50,000 USDT per trade"),
});

const txidSchema = z.object({
  txid: z.string().min(10, "Valid TXID required"),
});

export default function Exchange() {
  const [step, setStep] = useState<"input" | "deposit">("input");
  const [usdtAmount, setUsdtAmount] = useState<number>(0);
  const { data: exchangeRate } = useGetExchangeRate({ query: { refetchInterval: 30000 } });
  const { data: wallet } = useGetWalletAddress();
  const createOrderMutation = useCreateExchangeOrder();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [copied, setCopied] = useState(false);

  const form = useForm<z.infer<typeof exchangeSchema>>({
    resolver: zodResolver(exchangeSchema),
    defaultValues: {
      usdtAmount: 1000,
    },
  });

  const txidForm = useForm<z.infer<typeof txidSchema>>({
    resolver: zodResolver(txidSchema),
    defaultValues: {
      txid: "",
    },
  });

  const onInitExchange = (data: z.infer<typeof exchangeSchema>) => {
    setUsdtAmount(data.usdtAmount);
    setStep("deposit");
  };

  const onSubmitTxid = (data: z.infer<typeof txidSchema>) => {
    createOrderMutation.mutate(
      { data: { usdtAmount, txid: data.txid } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          setLocation("/dashboard");
        }
      }
    );
  };

  const copyToClipboard = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const eurAmount = usdtAmount * (exchangeRate?.rate || 0);
  const currentRate = exchangeRate?.rate || 0;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Sell USDT</h1>
          <p className="text-muted-foreground">Instantly convert Tether to EUR via our trusted OTC desk.</p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="bg-secondary/20 border-b border-border pb-6">
            <div className="flex items-center justify-between">
              <CardTitle>Exchange Details</CardTitle>
              <div className="flex items-center gap-2 text-sm bg-background px-3 py-1 rounded-full border border-border">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live Rate: 1 USDT = {currentRate.toFixed(4)} EUR
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {step === "input" ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onInitExchange)} className="space-y-6">
                  <div className="grid gap-6 p-6 rounded-xl bg-secondary/10 border border-border">
                    <FormField
                      control={form.control}
                      name="usdtAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">You Send</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input 
                                type="number" 
                                className="text-2xl h-14 pl-4 pr-20 font-mono bg-background" 
                                placeholder="0.00" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  setUsdtAmount(Number(e.target.value));
                                }}
                              />
                            </FormControl>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                              USDT
                            </div>
                          </div>
                          <FormMessage />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Min: 50 USDT</span>
                            <span>Max: 50,000 USDT</span>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-center -my-2 relative z-10">
                      <div className="bg-background border border-border rounded-full p-2 shadow-sm">
                        <ArrowDown className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base">You Receive (Estimated)</Label>
                      <div className="relative">
                        <Input 
                          type="text" 
                          readOnly 
                          value={eurAmount.toFixed(2)} 
                          className="text-2xl h-14 pl-4 pr-20 font-mono bg-secondary/50 border-transparent text-foreground" 
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-foreground">
                          EUR
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Zero hidden fees. The rate is locked upon submission.</p>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-4">
                    <div className="bg-primary/10 p-2 rounded-full shrink-0">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1 flex items-center">
                        Verified OTC Merchant <span className="ml-2 text-yellow-500 text-xs tracking-wider">★ 4.98</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">Cryptex Prime Liquidity • 2,341 successful trades • Avg processing time: 15 mins</p>
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="w-full h-14 text-lg">
                    Continue to Deposit <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 p-4 rounded-lg flex gap-3 text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Please send exactly {usdtAmount.toFixed(2)} USDT</p>
                    <p>Send only USDT on the <strong>{wallet?.network}</strong> network. Any other asset will be lost forever.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Deposit Address ({wallet?.network})</Label>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={wallet?.address || ""} 
                      className="font-mono text-sm bg-secondary"
                    />
                    <Button variant="outline" size="icon" onClick={copyToClipboard} className="shrink-0">
                      {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border pt-6 mt-6">
                  <h3 className="font-semibold mb-4 text-lg">Confirm Transfer</h3>
                  <Form {...txidForm}>
                    <form onSubmit={txidForm.handleSubmit(onSubmitTxid)} className="space-y-4">
                      <FormField
                        control={txidForm.control}
                        name="txid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transaction ID (TXID / Hash)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter the transaction hash from your wallet/exchange" className="font-mono text-sm" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex gap-3 pt-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setStep("input")}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1"
                          disabled={createOrderMutation.isPending}
                        >
                          {createOrderMutation.isPending ? "Submitting..." : "I have sent the funds"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
