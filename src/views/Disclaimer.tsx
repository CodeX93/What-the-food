"use client";

export default function DisclaimerPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Disclaimer</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: December 18, 2025</p>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <p className="text-muted-foreground">
              The information provided by What The Food (whatthefood.io) is for general informational and entertainment
              purposes only. All information on the site and through the service is provided in good faith, however, we
              make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy,
              validity, reliability, availability, or completeness of any information or AI-generated analysis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">1. Not Professional Advice</h2>
            <p className="text-muted-foreground">
              The core function of What The Food is to generate AI-tuned content and provide an estimated nutritional
              analysis (macros, calories, etc.) from food photos.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>No Medical or Health Advice:</strong> The Service is not a substitute for professional medical
                advice, diagnosis, or treatment. It is not intended to be a source of medical or health information.
              </li>
              <li>
                <strong>No Dietitian or Nutritionist Replacement:</strong> The Service can never replace a diet expert or
                health coach. The analysis provided is for fun purposes to track macros on the go as accurately as
                possible, but it is not guaranteed to be 100% accurate.
              </li>
              <li>
                <strong>Consult a Professional:</strong> You should always seek the advice of a qualified healthcare
                provider, physician, registered dietitian, or other professional health expert with any questions you may
                have regarding a medical condition, diet, or nutritional program.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Accuracy of AI-Generated Content</h2>
            <p className="text-muted-foreground">
              The nutritional analysis provided by What The Food is based on artificial intelligence and machine learning
              models.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>&quot;Take it with a Grain of Salt&quot;:</strong> Due to the inherent limitations of AI and image
                recognition technology, the results may contain errors, inaccuracies, or omissions. You are strongly
                advised to take the results with a grain of salt and always follow up with a professional dietitian for
                critical health decisions.
              </li>
              <li>
                <strong>User Responsibility:</strong> Any reliance you place on the information provided by the Service is
                strictly at your own risk. ECOMDIMES LTD disclaims all liability for any loss or damage, including
                personal injury or death, that may arise from your use of, or reliance on, the Service&apos;s nutritional
                analysis.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. External Links Disclaimer</h2>
            <p className="text-muted-foreground">
              The Service may contain links to other websites or content belonging to or originating from third parties.
              Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity,
              reliability, availability, or completeness by us. We do not warrant, endorse, guarantee, or assume
              responsibility for the accuracy or reliability of any information offered by third-party websites linked
              through the site or any website or feature linked in any banner or other advertising.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Testimonials Disclaimer</h2>
            <p className="text-muted-foreground">
              The Service may contain testimonials by users of our products and/or services. These testimonials reflect
              the real-life experiences and opinions of such users. However, the experiences are personal to those
              particular users, and may not necessarily be representative of all users of our products and/or services.
              We do not claim, and you should not assume, that all users will have the same experiences. Your individual
              results may vary.
            </p>
          </section>

          <section>
            <p className="text-muted-foreground">ECOMDIMES LTD Operator of What The Food (whatthefood.io)</p>
          </section>
        </div>
      </div>
    </div>
  );
}

