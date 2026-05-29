import { PublicLayout } from "@/components/layout/public-layout";

export default function Terms() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto py-16 px-4 prose dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Agreement to Terms</h2>
        <p>By accessing or using Cryptex, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
        
        <h2>2. Services</h2>
        <p>Cryptex provides a platform for exchanging cryptocurrency (USDT) for fiat currency (EUR), participating in yield-bearing savings plans, and executing fiat withdrawals. Cryptex is not a bank or depository institution.</p>
        
        <h2>3. User Responsibilities</h2>
        <ul>
          <li>You must be at least 18 years old to use the Service.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You agree to provide accurate, current, and complete information during registration and identity verification.</li>
          <li>You must not use the Service for any illegal or unauthorized purpose.</li>
        </ul>
        
        <h2>4. Financial Risks</h2>
        <p>Cryptocurrency markets are highly volatile. While fiat holdings (EUR) are stable, the exchange rates for USDT are subject to market fluctuations. Cryptex is not responsible for any financial losses incurred due to market changes before a transaction is confirmed.</p>
        
        <h2>5. Yield and Savings</h2>
        <p>Yield rates are dynamic and may change. Locked funds cannot be withdrawn without incurring an early withdrawal penalty as specified at the time of creation.</p>
        
        <h2>6. Modifications</h2>
        <p>Cryptex reserves the right to revise these terms of service at any time without notice. By using this website, you agree to be bound by the current version of these Terms of Service.</p>
      </div>
    </PublicLayout>
  );
}
