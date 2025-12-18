export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: December 18, 2025</p>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <p className="text-muted-foreground">
              This Privacy Policy describes how ECOMDIMES LTD (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;), the operator of What The Food (whatthefood.io), collects, uses, and discloses your personal
              information when you use our website and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">1. Data Controller</h2>
            <p className="text-muted-foreground">The data controller responsible for your personal information is:</p>
            <p className="text-muted-foreground">
              ECOMDIMES LTD182-184 High Street North
              <br />
              London, UK
            </p>
            <p className="text-muted-foreground">
              As a company registered in the United Kingdom, we are committed to protecting your personal data and your
              privacy in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act
              2018.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information that identifies, relates to, describes, or is capable of being associated with you
              (&quot;Personal Data&quot;).
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">A. Information You Provide to Us</h3>
            <div className="not-prose">
              <div className="relative w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Category
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Data Points
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Purpose of Collection
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Legal Basis (UK GDPR)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Account Data</td>
                      <td className="p-4 align-middle text-muted-foreground">Email address</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        To create and manage your free or premium account, and to send occasional promotions and updates.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Performance of a contract; Legitimate Interests (marketing).
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Optional Profile Data</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Name, Country, Age, Height, Weight, Health Goals
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        To provide the &quot;Personalized health context&quot; feature and improve the accuracy of the
                        nutrition analysis.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Consent (provided by voluntarily entering the data).
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">User Content</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Food photos uploaded for scanning, Scan history, Meal plans, Widget configurations.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        To provide the core service, save user progress, and enable the customizable widget feature.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">Performance of a contract.</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Payment Data</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Billing address, payment method details (handled by our payment processor).
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        To process subscription payments for Premium accounts.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">Performance of a contract.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-3">B. Information Collected Automatically</h3>
            <p className="text-muted-foreground">When you use our service, we automatically collect certain information:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Usage Data:</strong> Information about how you access and use the service, such as your IP
                address, browser type, operating system, pages viewed, and the time and date of your visit.
              </li>
              <li>
                <strong>Analytics Data:</strong> Data collected via third-party analytics tools (Umami, Google Analytics)
                to understand site traffic, user behavior, and service performance.
              </li>
              <li>
                <strong>Tracking Data:</strong> Data collected via Google Search Console to monitor traffic and
                performance from search engines.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground">We use the collected information for the following purposes:</p>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>To Provide and Maintain the Service:</strong> To operate the &quot;What The Food&quot; AI scanner,
                process food photos, and deliver nutrition analysis results.
              </li>
              <li>
                <strong>To Personalize the Service:</strong> To use optional profile data (age, weight, goals) to provide
                a more relevant and personalized health context with each scan.
              </li>
              <li>
                <strong>To Process Transactions:</strong> To manage your Premium subscription and process recurring
                payments via our payment gateway, Stripe.
              </li>
              <li>
                <strong>To Provide Customer Support:</strong> To respond to your inquiries and provide support via our
                Tawk.to widget.
              </li>
              <li>
                <strong>For Advertising (Free Users):</strong> To display personalized advertisements via TinyAdz to
                users on the Free tier, which is a core part of our freemium monetization model. Premium users receive an
                ad-free experience.
              </li>
              <li>
                <strong>For Marketing and Communications:</strong> To send you occasional promotions, updates, and news
                about the service, based on our legitimate interest in promoting our business. You can opt-out of these
                communications at any time.
              </li>
              <li>
                <strong>For Analytics and Improvement:</strong> To monitor and analyze usage and activity trends to
                improve the functionality and user experience of our service.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Sharing and Disclosure of Your Information</h2>
            <p className="text-muted-foreground">
              We do not misuse or sell your Personal Data. We only share your information with the following third
              parties as necessary to operate our business:
            </p>

            <div className="not-prose">
              <div className="relative w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Third Party Service
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Purpose
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Data Shared
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Storage Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Stripe</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Payment processing and recurring billing.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Payment details, billing address, subscription status.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Global (adheres to strict security standards).
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Tawk.to</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Customer support and live chat widget.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">Email, chat content, IP address.</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Global (adheres to data protection laws).
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">TinyAdz</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Personalized advertising for Free users.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Usage data, IP address, device information (for ad targeting).
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">Global.</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">
                        Umami, Google Analytics, Google Search Console
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Website analytics, traffic monitoring, and performance tracking.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Usage data, IP address, browser information.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">Global.</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Supabase</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Database hosting and storage of all user and service data.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        All collected data (Email, Optional Profile Data, User Content).
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Stored in accordance with UK law.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-muted-foreground mt-6">
              We may also disclose your Personal Data if required to do so by law or in the good faith belief that such
              action is necessary to comply with a legal obligation, protect and defend our rights or property, or protect
              the personal safety of users of the service or the public.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Data Storage and Security</h2>
            <p className="text-muted-foreground">
              Your data is stored on our own database hosted by Supabase. We have implemented appropriate technical and
              organizational measures to ensure a level of security appropriate to the risk, including encryption and
              access controls.
            </p>
            <p className="text-muted-foreground">
              While we strive to use commercially acceptable means to protect your Personal Data, no method of
              transmission over the Internet or method of electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Your Data Protection Rights (UK GDPR)</h2>
            <p className="text-muted-foreground">Under UK GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>The right to access:</strong> You have the right to request copies of your Personal Data.
              </li>
              <li>
                <strong>The right to rectification:</strong> You have the right to request that we correct any
                information you believe is inaccurate or complete information you believe is incomplete.
              </li>
              <li>
                <strong>The right to erasure (Right to be Forgotten):</strong> You have the right to request that we
                erase your Personal Data, under certain conditions.
              </li>
              <li>
                <strong>The right to restrict processing:</strong> You have the right to request that we restrict the
                processing of your Personal Data, under certain conditions.
              </li>
              <li>
                <strong>The right to object to processing:</strong> You have the right to object to our processing of
                your Personal Data, under certain conditions, particularly for direct marketing.
              </li>
              <li>
                <strong>The right to data portability:</strong> You have the right to request that we transfer the data
                that we have collected to another organization, or directly to you, under certain conditions.
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              If you make a request, we have one month to respond to you. To exercise any of these rights, please contact
              us using the details provided in Section 1.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground">
              Our service is not intended for use by children under the age of 13. We do not knowingly collect personally
              identifiable information from anyone under the age of 13. If you are a parent or guardian and you are aware
              that your child has provided us with Personal Data, please contact us. If we become aware that we have
              collected Personal Data from children without verification of parental consent, we take steps to remove
              that information from our servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the &quot;Last Updated&quot; date. You are advised to review this
              Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at the address provided in Section
              1.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}