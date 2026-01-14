export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">About What The Food</h1>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">Our Mission: Informed Eating, Instantly.</h2>
            <p className="text-muted-foreground">
              At What The Food, we believe that understanding what you eat shouldn&apos;t be a chore. In today&apos;s
              fast-paced world, tracking nutrition often involves complex apps, manual data entry, and guesswork. We set
              out to change that by harnessing the power of artificial intelligence to deliver instant, accurate-as-possible
              nutritional analysis from a simple photo.
            </p>
            <p className="text-muted-foreground">
              Our mission is to empower everyone—from casual eaters to dedicated fitness enthusiasts—to make informed
              eating decisions on the go, turning your smartphone camera into your personal, pocket-sized nutrition
              analyzer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">The Technology: AI-Tuned Analysis</h2>
            <p className="text-muted-foreground">What The Food is a cutting-edge, freemium AI food scanner and nutrition analyzer. Our technology works by:</p>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>AI Food Recognition:</strong> Analyzing the food in your photo to identify ingredients and portion
                sizes.
              </li>
              <li>
                <strong>AI-Tuned Content:</strong> Generating estimated macro-nutrient and calorie counts based on our
                proprietary AI models.
              </li>
              <li>
                <strong>Personalized Context:</strong> Providing a personalized health context by integrating your optional
                profile data (age, weight, goals) with the scan results.
              </li>
            </ol>

            <p className="text-muted-foreground mt-6">
              <strong>A Note on Accuracy:</strong> While we strive for the highest possible accuracy, it is important to
              remember that our service generates AI-tuned content. It is designed to be a fun, fast, and highly convenient
              tracking tool. It is not a replacement for a professional dietitian or health coach. We encourage all users to
              take the results with a grain of salt and consult a professional for personalized health and dietary advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">The Founder: Odeh Ahwal</h2>
            <p className="text-muted-foreground">
              What The Food was founded by Odeh Ahwal, a dedicated serial internet solopreneur with over 8 years of
              experience building cool stuff and making a living online. Odeh&apos;s passion for combining technology with
              practical, everyday solutions led to the creation of this service.
            </p>

            <blockquote className="border-l-4 border-slate-200 dark:border-slate-800 pl-4 py-1 text-muted-foreground">
              &quot;I built What The Food to solve a personal pain point: the friction of logging meals. By making the process
              as simple as taking a photo, we hope to remove the biggest barrier to consistent nutrition tracking.&quot;— Odeh
              Ahwal (Portfolio:{" "}
              <a href="https://odehahwal.com" target="_blank" rel="noopener noreferrer">
                https://odehahwal.com
              </a>
              )
            </blockquote>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Our Business Model: Freemium and Value-Driven</h2>
            <p className="text-muted-foreground">We operate on a transparent freemium model designed to provide value to everyone:</p>

            <div className="not-prose">
              <div className="relative w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Tier
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Value Proposition
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-slate-900 dark:text-slate-100">
                        Key Features
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Free</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Get informed eating with limited features &amp; usage.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        3 free scans lifetime (or 3 days), limited customizable widget, basic email support.
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle font-medium">Premium</td>
                      <td className="p-4 align-middle text-muted-foreground">
                        An investment in your health that pays dividends.
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        Unlimited Scans, Scan history, Macro analytics, Meal planner, Ad removal, Full widget access.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-muted-foreground mt-6">
              The free tier allows anyone to experience the core value of instant scanning, while the Premium tier unlocks
              powerful features like unlimited scans, scan history, and macro analytics for users serious about their health
              journey.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">The Company</h2>
            <p className="text-muted-foreground">
              What The Food is powered by ECOMDIMES LTD, a company registered in the UK Companies House.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Parent Company:</strong> ECOMDIMES LTD
              </li>
              <li>
                <strong>Business Address:</strong> 182-184 High Street North, London, UK
              </li>
              <li>
                <strong>Payment Gateway:</strong> Stripe (for secure, recurrent monthly or yearly billing).
              </li>
            </ul>
            <p className="text-muted-foreground mt-6">
              We are committed to building a valuable, privacy-respecting service. We do not misuse or sell our clients&apos;
              data and information. We are focused on providing a tool that helps you track your health goals effectively.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}