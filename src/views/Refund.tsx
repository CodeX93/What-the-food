export default function RefundPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: December 18, 2025</p>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <p className="text-muted-foreground">
              This Refund Policy applies to all Premium subscriptions purchased for the What The Food service
              (whatthefood.io), operated by ECOMDIMES LTD.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">1. General Policy</h2>
            <p className="text-muted-foreground">
              We are committed to customer satisfaction. However, due to the nature of digital services and the immediate
              access granted upon subscription, our refund policy is structured to be fair while protecting the integrity
              of our business model.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Monthly Subscription Refunds</h2>
            <p className="text-muted-foreground">
              Refund requests for monthly Premium subscriptions are eligible under the following strict conditions:
            </p>

            <div className="not-prose">
              <div className="relative w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Condition
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Refund Window</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        The request must be submitted within 48 hours of the initial purchase date.
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Service Usage</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        The service must not have been used significantly. Significant usage includes, but is not limited
                        to, performing more than 5 scans or generating more than 1 PDF report during the 48-hour window.
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Expectation Mismatch</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        The refund is requested because the service did not meet the user&apos;s expectations (e.g., a core
                        feature was misunderstood or did not function as advertised).
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-muted-foreground mt-6">
              <strong>How to Request a Refund:</strong> To request a refund for a monthly subscription, please contact our
              Premium chat support or email us within the 48-hour window, providing your account email and a brief
              explanation of why you are requesting the refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Yearly Subscription Refunds (Best Value Plan)</h2>
            <p className="text-muted-foreground">
              All yearly Premium subscriptions are non-refundable.
            </p>
            <p className="text-muted-foreground">
              The yearly plan is offered at a significant discount (&quot;Save 2 months of service&quot;) and is considered a
              long-term commitment. By choosing the yearly plan, you acknowledge and agree that no refunds will be issued
              for any reason, including but not limited to cancellation, dissatisfaction, or non-use of the service.
            </p>
            <p className="text-muted-foreground">
              We strongly encourage users to first subscribe to the monthly plan to ensure the service meets their needs
              before committing to the yearly subscription.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Recurring Payments</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Cancellations:</strong> You may cancel your recurring monthly or yearly subscription at any time
                before the next billing date. Cancellation ensures that your subscription will not renew, but you will
                retain access to Premium features until the end of the current paid billing cycle.
              </li>
              <li>
                <strong>No Pro-Rata Refunds:</strong> We do not offer pro-rata refunds for partial months or years of
                service remaining after a cancellation.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Chargebacks</h2>
            <p className="text-muted-foreground">
              If you initiate a chargeback with your bank or payment provider (Stripe), we reserve the right to
              immediately terminate your account and access to the Service. If the chargeback is reversed in our favor, we
              may, at our sole discretion, reinstate your account.
            </p>
          </section>

          <section>
            <p className="text-muted-foreground">
              ECOMDIMES LTD182-184 High Street North
              <br />
              London, UK
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}