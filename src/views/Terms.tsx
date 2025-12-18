export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Terms and Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: December 18, 2025</p>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <p className="text-muted-foreground">
              Please read these Terms and Conditions (&quot;Terms,&quot; &quot;Terms of Service&quot;) carefully before using the
              whatthefood.io website (the &quot;Service&quot;) operated by ECOMDIMES LTD (&quot;us,&quot; &quot;we,&quot; or
              &quot;our&quot;).
            </p>
            <p className="text-muted-foreground">
              Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms.
              These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
            <p className="text-muted-foreground">
              By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the
              terms, then you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">1. The Service</h2>
            <p className="text-muted-foreground">
              What The Food is a freemium AI food scanner and nutrition analyzer that provides estimated nutritional
              information from food photos.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.1. Nature of the Service and Disclaimer</h3>
            <p className="text-muted-foreground">
              <strong>Crucial Notice:</strong> The Service generates AI-tuned content and provides estimated nutritional
              information. The results should always be taken with a grain of salt and are intended for fun purposes to
              track macros on the go as accurately as possible. The Service is not a substitute for professional medical,
              dietary, or health advice. You must always follow up with a professional dietitian or health coach for
              personalized advice. ECOMDIMES LTD is not responsible for any health outcomes or decisions made based on the
              use of the Service.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.2. Freemium Access</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Initial Access:</strong> Users can perform 10 food scans without any obligation, sign-up, or
                payment.
              </li>
              <li>
                <strong>Continued Access:</strong> Once the 10-scan limit is reached, users must sign up for a totally
                free account to continue using the Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Accounts and Subscriptions</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.1. Free Account</h3>
            <div className="not-prose">
              {/**
               * Use a plain table (instead of prose tables) to ensure consistent styling.
               */}
              <div className="relative w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Feature
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Usage Limit</td>
                      <td className="p-4 align-middle text-muted-foreground">3 free scans per day.</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Widget Access</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Limited customizable widget access (100 API calls, 1 widget only).
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Widget Branding</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Branding (&quot;Powered by What The Food&quot;) cannot be hidden.
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Support</td>
                      <td className="p-4 align-middle text-muted-foreground">Basic email support.</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Monetization</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Free accounts are supported by pop-up ads delivered via TinyAdz.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-3">2.2. Premium Subscription</h3>
            <p className="text-muted-foreground">
              The Premium Subscription is a paid, recurring service that grants access to enhanced features.
            </p>
            <div className="not-prose">
              <div className="relative w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Feature
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Usage</td>
                      <td className="p-4 align-middle text-muted-foreground">Unlimited Scans.</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Features</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Scan history, Macro analytics, Personalized health context, Serving adjuster, Meal planner, PDF
                        reports.
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Widget Access</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Unlimited API calls, unlimited widgets, option to hide &quot;Powered by What The Food&quot;
                        branding.
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Support</td>
                      <td className="p-4 align-middle text-muted-foreground">Premium chat support.</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Ads</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Pop-up ads removal (ad-free experience).
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-3">2.3. Billing and Payments</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Payment Gateway:</strong> All payments are processed through our third-party payment provider,
                Stripe. We do not store your full payment card details.
              </li>
              <li>
                <strong>Recurring Payments:</strong> Subscriptions are billed on a recurring basis (monthly or yearly)
                depending on your selection. You will be billed in advance on a recurring and periodic basis.
              </li>
              <li>
                <strong>Price:</strong> The current prices are $14.99/month or $149.99/year. We reserve the right to
                change the subscription fees at any time, provided we give you reasonable prior notice.
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-3">2.4. Cancellation and Refunds</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Cancellation:</strong> You can cancel your subscription renewal at any time through your account
                settings. Cancellation will take effect at the end of your current billing period.
              </li>
              <li>
                <strong>Refunds:</strong> Our Refund Policy is detailed in a separate document, but is summarized as
                follows:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>
                    <strong>Monthly Plans:</strong> Eligible for a refund within 48 hours of purchase if the service was
                    not used or did not meet your expectations.
                  </li>
                  <li>
                    <strong>Yearly Plans:</strong> No refunds are provided for yearly subscriptions.
                  </li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Customizable Widget Terms</h2>
            <p className="text-muted-foreground">
              We grant you a non-exclusive, non-transferable, revocable license to embed the What The Food AI scanner
              widget on your website(s) subject to the following terms:
            </p>

            <div className="not-prose">
              <div className="relative w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Account Type
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        API Calls Limit
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Widget Count Limit
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Branding Requirement
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Free</td>
                      <td className="p-4 align-middle text-muted-foreground">100 API calls per month</td>
                      <td className="p-4 align-middle text-muted-foreground">1 widget only</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Branding (&quot;Powered by What The Food&quot;) cannot be hidden.
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Premium</td>
                      <td className="p-4 align-middle text-muted-foreground">Unlimited API calls</td>
                      <td className="p-4 align-middle text-muted-foreground">Unlimited widgets</td>
                      <td className="p-4 align-middle text-muted-foreground">Option to hide branding.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-muted-foreground mt-6">
              You agree not to use the widget in any manner that is illegal, misleading, or harmful, or on any website
              that promotes illegal activities, hate speech, or discrimination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Intellectual Property</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.1. Our Intellectual Property</h3>
            <p className="text-muted-foreground">
              The Service and its original content (excluding User Content), features, and functionality are and will
              remain the exclusive property of ECOMDIMES LTD and its licensors. The Service is protected by copyright,
              trademark, and other laws of both the United Kingdom and foreign countries.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.2. User Content and License</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Ownership:</strong> You retain all ownership rights to the food photos and other content you
                upload or create (&quot;User Content&quot;).
              </li>
              <li>
                <strong>License Grant:</strong> By uploading User Content, you grant ECOMDIMES LTD a worldwide,
                non-exclusive, royalty-free, transferable license to use, store, display, reproduce, and analyze your
                User Content solely for the purpose of operating, developing, and providing the Service (e.g., saving
                your scan history, performing macro analytics).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason
              whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the
              Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the
              Service or contact us to request account deletion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              In no event shall ECOMDIMES LTD, nor its directors, employees, partners, agents, suppliers, or affiliates,
              be liable for any indirect, incidental, special, consequential or punitive damages, including without
              limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your
              access to or use of or inability to access or use the Service; (ii) any conduct or content of any third
              party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or
              alteration of your transmissions or content, whether based on warranty, contract, tort (including
              negligence) or any other legal theory, whether or not we have been informed of the possibility of such
              damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed and construed in accordance with the laws of England and Wales, without
              regard to its conflict of law provisions. You agree to submit to the exclusive jurisdiction of the courts
              located in England and Wales to resolve any legal matter arising from these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision
              is material, we will try to provide at least 30 days&apos; notice prior to any new terms taking effect. What
              constitutes a material change will be determined at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms, please contact us.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}