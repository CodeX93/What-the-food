import Link from "next/link";
import { Utensils } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-[#f4f6f9] via-[#f6f8fb] to-[#fafbfd] dark:from-[#050506] dark:via-[#0b0b0d] dark:to-[#111113] border-t border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-24 xl:gap-32">
          <div className="max-w-xs space-y-4">
            <Link href="/" className="flex items-center space-x-2 hover:text-primary transition-colors">
              <Utensils className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold text-slate-900 dark:text-white">WhatTheFood</span>
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              AI-powered food analysis for healthier living. Scan, analyze, and understand your meals instantly.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Product</h3>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/features" className="hover:text-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/widget" className="hover:text-primary transition-colors">
                  Widget
                </Link>
              </li>
              <li>
                <Link href="/wall-of-love" className="hover:text-primary transition-colors">
                  Wall of Love
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Company</h3>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <a
                  href="https://odehahwal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  About Founder
                </a>
              </li>
              <li>
                <Link href="/blog" className="hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Legal</h3>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-primary transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <a
                  href="https://dashboard.simpleanalytics.com/whatthefood.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Analytics
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 mt-7 pt-5 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} WhatTheFood. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;