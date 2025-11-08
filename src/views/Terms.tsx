export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using WhatTheFood, you accept and agree to be bound by the terms
              and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
            <p className="text-muted-foreground">
              Permission is granted to temporarily use WhatTheFood for personal, non-commercial use only.
              This is the grant of a license, not a transfer of title.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Disclaimer</h2>
            <p className="text-muted-foreground">
              The nutritional information provided is for informational purposes only and should not
              be considered medical advice. Always consult with a healthcare professional for dietary
              guidance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Account Terms</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the security of your account and password.
              WhatTheFood cannot and will not be liable for any loss or damage from your failure
              to comply with this security obligation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Subscription Terms</h2>
            <p className="text-muted-foreground">
              Premium subscriptions are billed monthly or annually. You may cancel your subscription
              at any time, and cancellation will take effect at the end of your current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Modifications</h2>
            <p className="text-muted-foreground">
              WhatTheFood reserves the right to modify or replace these Terms at any time.
              Continued use of the service after any changes constitutes acceptance of the new Terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}