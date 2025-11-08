import Link from "next/link";
import { Utensils } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-background border-t dark:border-slate-800 transition-colors duration-300">
      <div className="container mx-auto px-4 py-10 sm:py-14">
        <div className="flex flex-col lg:flex-row lg:justify-between gap-12 lg:gap-20">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center space-x-2 mb-4 hover:text-primary transition-colors">
              <Utensils className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold text-foreground">WhatTheFood</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              AI-powered food analysis for healthier living. Scan, analyze, and understand your meals instantly.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 lg:gap-16 text-sm">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/features" className="text-muted-foreground hover:text-primary transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/widget" className="text-muted-foreground hover:text-primary transition-colors">
                    Widget
                  </Link>
                </li>
                <li>
                  <Link href="/wall-of-love" className="text-muted-foreground hover:text-primary transition-colors">
                    Wall of Love
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <a
                    href="https://odehahwal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    About Founder
                  </a>
                </li>
                <li>
                  <Link href="/blog" className="text-muted-foreground hover:text-primary transition-colors">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/refund" className="text-muted-foreground hover:text-primary transition-colors">
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <a
                    href="https://dashboard.simpleanalytics.com/whatthefood.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Analytics
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t dark:border-slate-800 mt-10 pt-6 text-center text-xs sm:text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} WhatTheFood. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;