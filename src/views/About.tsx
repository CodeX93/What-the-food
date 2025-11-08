export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">About WhatTheFood</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-lg text-muted-foreground mb-6">
            WhatTheFood was created to make nutritional information accessible to everyone.
            We believe that understanding what you eat shouldn&apos;t require a nutrition degree.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Our Mission</h2>
          <p className="text-muted-foreground mb-6">
            To empower people worldwide to make informed dietary choices through accessible,
            AI-powered nutritional analysis. We&apos;re committed to making healthy eating easier
            and more intuitive for everyone.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">How It Works</h2>
          <p className="text-muted-foreground mb-6">
            Our advanced AI technology analyzes food images using deep learning models trained
            on millions of meals. We combine computer vision with comprehensive nutritional
            databases to provide accurate, instant analysis of any dish.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Our Values</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Accessibility: Nutrition information should be free and easy to access</li>
            <li>Accuracy: We constantly improve our AI to provide the most reliable data</li>
            <li>Privacy: Your food data is yours - we never share it without permission</li>
            <li>Innovation: We&apos;re always working on new features to serve you better</li>
          </ul>
        </div>
      </div>
    </div>
  );
}