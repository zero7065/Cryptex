import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateWithdrawal, useGetUserBalance, getListWithdrawalsQueryKey, getGetUserBalanceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Landmark, ArrowRight, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const withdrawalSchema = z.object({
  amount: z.coerce.number().min(10, "Minimum withdrawal is 10 EUR"),
  method: z.enum(["interac", "sepa", "wise", "paypal", "bank_wire"]),
  // Dynamic fields
  email: z.string().email("Invalid email").optional(), // Interac, Wise, Paypal
  iban: z.string().min(15, "Invalid IBAN").optional(), // SEPA
  bic: z.string().min(8, "Invalid BIC/SWIFT").optional(), // SEPA
  accountName: z.string().min(2, "Name required").optional(), // SEPA, Wire
  bankName: z.string().min(2, "Bank name required").optional(), // Wire
  accountNumber: z.string().min(5, "Account number required").optional(), // Wire
  routingNumber: z.string().min(5, "Routing/SWIFT required").optional(), // Wire
}).superRefine((data, ctx) => {
  if (["interac", "wise", "paypal"].includes(data.method) && !data.email) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Email is required for this method", path: ["email"] });
  }
  if (data.method === "sepa") {
    if (!data.iban) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "IBAN is required", path: ["iban"] });
    if (!data.bic) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "BIC is required", path: ["bic"] });
    if (!data.accountName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Account Name is required", path: ["accountName"] });
  }
  if (data.method === "bank_wire") {
    if (!data.bankName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bank Name is required", path: ["bankName"] });
    if (!data.accountNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Account Number is required", path: ["accountNumber"] });
    if (!data.routingNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Routing/SWIFT is required", path: ["routingNumber"] });
    if (!data.accountName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Account Name is required", path: ["accountName"] });
  }
});

export default function Withdraw() {
  const { data: balance, isLoading: balanceLoading } = useGetUserBalance();
  const createWithdrawalMutation = useCreateWithdrawal();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof withdrawalSchema>>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: 100,
      method: "sepa",
      email: "",
      iban: "",
      bic: "",
      accountName: "",
      bankName: "",
      accountNumber: "",
      routingNumber: "",
    },
  });

  const method = form.watch("method");

  const onSubmit = (data: z.infer<typeof withdrawalSchema>) => {
    if (balance && data.amount > balance.availableEur) {
      form.setError("amount", { type: "manual", message: "Insufficient available balance" });
      return;
    }

    let accountDetails: Record<string, any> = {};
    if (["interac", "wise", "paypal"].includes(data.method)) {
      accountDetails = { email: data.email };
    } else if (data.method === "sepa") {
      accountDetails = { iban: data.iban, bic: data.bic, accountName: data.accountName };
    } else if (data.method === "bank_wire") {
      accountDetails = { 
        bankName: data.bankName, 
        accountNumber: data.accountNumber, 
        routingNumber: data.routingNumber, 
        accountName: data.accountName 
      };
    }

    createWithdrawalMutation.mutate(
      { data: { amount: data.amount, method: data.method as any, accountDetails } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWithdrawalsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUserBalanceQueryKey() });
          toast({
            title: "Withdrawal Requested",
            description: "Your withdrawal is being processed (1-3 business days).",
          });
          setLocation("/history");
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Withdrawal Failed",
            description: err.message,
          });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Withdraw Funds</h1>
          <p className="text-muted-foreground">Transfer your EUR balance directly to your bank account.</p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="bg-secondary/20 border-b border-border pb-6">
            <div className="flex items-center justify-between">
              <CardTitle>Withdrawal Details</CardTitle>
              <div className="flex items-center gap-2 text-sm bg-background px-3 py-1 rounded-full border border-border">
                <span className="text-muted-foreground">Available:</span>
                <span className="font-mono font-bold">€{balanceLoading ? "..." : balance?.availableEur.toFixed(2)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount to Withdraw (EUR)</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input 
                              type="number" 
                              className="text-lg h-12 pl-4 pr-12 font-mono bg-background" 
                              placeholder="0.00" 
                              {...field} 
                            />
                          </FormControl>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">
                            €
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Withdrawal Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sepa">SEPA Transfer (EU)</SelectItem>
                            <SelectItem value="interac">Interac e-Transfer (CA)</SelectItem>
                            <SelectItem value="wise">Wise Transfer</SelectItem>
                            <SelectItem value="paypal">PayPal</SelectItem>
                            <SelectItem value="bank_wire">International Bank Wire</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-5 rounded-xl bg-secondary/30 border border-border space-y-4">
                  <h3 className="font-medium flex items-center gap-2 mb-4 text-primary">
                    <Landmark className="h-4 w-4" /> Account Details
                  </h3>

                  {["interac", "wise", "paypal"].includes(method) && (
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {method === "sepa" && (
                    <>
                      <FormField
                        control={form.control}
                        name="accountName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Holder Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="iban"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IBAN</FormLabel>
                              <FormControl>
                                <Input placeholder="DE89..." className="font-mono uppercase" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>BIC / SWIFT</FormLabel>
                              <FormControl>
                                <Input placeholder="BANKDEF1XXX" className="font-mono uppercase" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {method === "bank_wire" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="accountName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Holder Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bank Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Chase Bank" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number</FormLabel>
                              <FormControl>
                                <Input placeholder="000123456789" className="font-mono" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="routingNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Routing / SWIFT</FormLabel>
                              <FormControl>
                                <Input placeholder="122000248" className="font-mono uppercase" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-4">
                  <div className="bg-primary/10 p-2 rounded-full shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Secure Withdrawal</h4>
                    <p className="text-xs text-muted-foreground">Standard processing time is 1-3 business days. Name on withdrawal account must match your verified identity.</p>
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={createWithdrawalMutation.isPending || !balance?.availableEur}>
                  {createWithdrawalMutation.isPending ? "Processing..." : "Submit Withdrawal Request"} 
                  {!createWithdrawalMutation.isPending && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
