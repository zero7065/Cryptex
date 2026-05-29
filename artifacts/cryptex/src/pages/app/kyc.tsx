import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Upload, CheckCircle, Clock, XCircle, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const EU_COUNTRIES = ["Austria","Belgium","Croatia","Cyprus","Czech Republic","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Ireland","Italy","Latvia","Lithuania","Luxembourg","Malta","Netherlands","Poland","Portugal","Romania","Slovakia","Slovenia","Spain","Sweden","United Kingdom","Switzerland","Norway"];

type KycStatus = { kycStatus: string; submission: { id: number; fullName: string; status: string; adminNotes: string | null; createdAt: string } | null };

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function FileUpload({ label, value, onChange, icon }: { label: string; value: string; onChange: (b64: string) => void; icon: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className={cn(
        "border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors",
        value ? "border-green-500/50 bg-green-500/5" : "border-border hover:border-primary/50 hover:bg-primary/5"
      )} onClick={() => ref.current?.click()}>
        {value ? (
          <>
            <CheckCircle className="h-8 w-8 text-green-500" />
            <span className="text-sm text-green-500 font-medium">Uploaded</span>
          </>
        ) : (
          <>
            {icon}
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-xs text-muted-foreground">JPG, PNG up to 10MB</span>
          </>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async e => {
          const file = e.target.files?.[0];
          if (file) { const b64 = await fileToBase64(file); onChange(b64); }
        }} />
      </div>
    </div>
  );
}

export default function KYCPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [idFront, setIdFront] = useState("");
  const [idBack, setIdBack] = useState("");
  const [selfie, setSelfie] = useState("");

  const { data: kycStatus, refetch } = useQuery<KycStatus>({
    queryKey: ["kyc-status"],
    queryFn: () => apiGet("/kyc/status"),
  });

  const submit = useMutation({
    mutationFn: () => apiPost("/kyc/submit", { fullName, dob, address, country, idFrontData: idFront, idBackData: idBack, selfieData: selfie }),
    onSuccess: () => {
      toast({ title: "KYC Submitted", description: "Your documents are under review (1-2 business days)." });
      updateUser({ ...user!, kycStatus: "pending" });
      refetch();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const status = kycStatus?.kycStatus || user?.kycStatus || "none";

  const StatusBanner = () => {
    if (status === "approved") return (
      <div className="flex items-center gap-4 p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
        <CheckCircle className="h-10 w-10 text-green-500 shrink-0" />
        <div>
          <h3 className="font-semibold text-green-500">Identity Verified</h3>
          <p className="text-sm text-muted-foreground">Your KYC has been approved. You can now make withdrawals and access all features.</p>
        </div>
      </div>
    );
    if (status === "pending") return (
      <div className="flex items-center gap-4 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
        <Clock className="h-10 w-10 text-yellow-500 shrink-0 animate-pulse" />
        <div>
          <h3 className="font-semibold text-yellow-500">Under Review</h3>
          <p className="text-sm text-muted-foreground">Your documents have been submitted and are being reviewed by our team. This typically takes 1-2 business days.</p>
          {kycStatus?.submission && <p className="text-xs text-muted-foreground mt-1">Submitted: {new Date(kycStatus.submission.createdAt).toLocaleDateString()}</p>}
        </div>
      </div>
    );
    if (status === "rejected") return (
      <div className="flex items-center gap-4 p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
        <XCircle className="h-10 w-10 text-red-500 shrink-0" />
        <div>
          <h3 className="font-semibold text-red-500">KYC Rejected</h3>
          <p className="text-sm text-muted-foreground">{kycStatus?.submission?.adminNotes || "Your documents could not be verified. Please re-submit with clearer documents."}</p>
        </div>
      </div>
    );
    return null;
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">KYC Verification</h1>
            <p className="text-muted-foreground mt-1">Verify your identity to unlock withdrawals and full trading access.</p>
          </div>
          <Badge className={cn(
            "text-sm px-3 py-1",
            status === "approved" ? "bg-green-500/20 text-green-500 border-green-500/30" :
            status === "pending" ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" :
            status === "rejected" ? "bg-red-500/20 text-red-500 border-red-500/30" :
            "bg-secondary text-muted-foreground"
          )}>
            {status === "none" ? "Not Submitted" : status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>

        <StatusBanner />

        {(status === "none" || status === "rejected") && (
          <>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[["Submit Documents", "Upload ID + selfie"], ["Under Review", "1-2 business days"], ["Verified", "Full access unlocked"]].map(([t, d], i) => (
                <div key={i} className={cn("p-4 rounded-xl border", i === 0 ? "border-primary/50 bg-primary/5" : "border-border bg-card")}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 font-bold", i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{i + 1}</div>
                  <div className="text-sm font-medium">{t}</div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </div>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle>Personal Information</CardTitle><CardDescription>Must match your government-issued ID exactly.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Legal Name</Label>
                    <Input placeholder="As on your ID" value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Residential Address</Label>
                  <Input placeholder="Street, City, Postal Code" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Country of Residence</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>{EU_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Document Upload</CardTitle><CardDescription>Passport, national ID, or driver's license.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FileUpload label="ID Front" value={idFront} onChange={setIdFront} icon={<Upload className="h-8 w-8 text-muted-foreground" />} />
                  <FileUpload label="ID Back" value={idBack} onChange={setIdBack} icon={<Upload className="h-8 w-8 text-muted-foreground" />} />
                </div>
                <FileUpload label="Selfie holding ID" value={selfie} onChange={setSelfie} icon={<Camera className="h-8 w-8 text-muted-foreground" />} />
              </CardContent>
            </Card>

            <Button className="w-full h-12 text-base" disabled={!fullName || !dob || !address || !country || !idFront || !idBack || !selfie || submit.isPending}
              onClick={() => submit.mutate()}>
              {submit.isPending ? "Submitting..." : "Submit KYC Documents"}
            </Button>
          </>
        )}
      </div>
    </AppLayout>
  );
}
