import { PublicLayout } from "@/components/layout/public-layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Support() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">How can we help?</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse our frequently asked questions or contact our support team directly. We're available 24/7 for critical transaction issues.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How fast are fiat withdrawals?</AccordionTrigger>
                <AccordionContent>
                  Most SEPA and Interac e-Transfers are processed within 1-2 hours during business days. International bank wires may take 1-3 business days depending on the receiving bank.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Are there any hidden fees?</AccordionTrigger>
                <AccordionContent>
                  No. We operate a zero-fee OTC desk. The exchange rate you see is exactly what you get. We make our profit on the spread, which is tightly controlled to give you the best market rate.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>What happens if I withdraw savings early?</AccordionTrigger>
                <AccordionContent>
                  If you withdraw your funds before the savings plan duration completes, you will forfeit any unpaid interest and a standard early-withdrawal penalty (typically 2%) will be deducted from the principal amount.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>Is my data secure?</AccordionTrigger>
                <AccordionContent>
                  Yes. We use bank-grade encryption for all data in transit and at rest. We comply with strict EU data protection regulations (GDPR) and industry-standard security protocols.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold mb-6">Contact Support</h2>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input type="email" placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input placeholder="E.g., Missing withdrawal" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea placeholder="Describe your issue in detail..." className="min-h-[120px]" />
              </div>
              <Button type="submit" className="w-full">Send Message</Button>
            </form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
