import { PublicLayout } from "@/components/layout/public-layout";

export default function Privacy() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto py-16 px-4 prose dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly to us when you register for an account, complete identity verification, or communicate with us. This includes:</p>
        <ul>
          <li>Contact information (email address)</li>
          <li>Identity information required for KYC/AML compliance</li>
          <li>Financial information (bank account details for withdrawals)</li>
          <li>Transaction history and wallet addresses</li>
        </ul>
        
        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve our services</li>
          <li>Process transactions and send related information</li>
          <li>Verify your identity and prevent fraud or illegal activities</li>
          <li>Send administrative messages, security alerts, and support messages</li>
        </ul>
        
        <h2>3. Data Security</h2>
        <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, loss, or alteration. All financial data is encrypted in transit and at rest.</p>
        
        <h2>4. Information Sharing</h2>
        <p>We do not sell your personal information. We may share your information with third-party service providers (such as banking partners) strictly for the purpose of executing your requested transactions.</p>
        
        <h2>5. Your Rights</h2>
        <p>Depending on your location, you may have rights to access, correct, or delete your personal data. Contact our support team to exercise these rights.</p>
      </div>
    </PublicLayout>
  );
}
