import { Link } from "react-router-dom";
import { Utensils } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative bg-gradient-to-br from-slate-100 via-gray-100 to-slate-50 dark:from-[#000000] dark:via-[#0A0A0A] dark:to-[#1A1A1A] border-t dark:border-slate-800 snap-start transition-colors duration-300">
      <div className="container mx-auto px-4 py-8 sm:py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <Utensils className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">WhatTheFood</span>
            </Link>
            <p className="text-sm text-muted-foreground dark:text-slate-400">
              AI-powered food analysis for healthier living. Scan, analyze, and understand your meals instantly.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/features" className="text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/widget" className="text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors">
                  Widget
                </Link>
              </li>
              <li>
                <Link to="/wall-of-love" className="text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors">
                  Wall of Love
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <a href="https://odehahwal.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors">
                  About Founder
                </a>
              </li>
              <li>
                <Link to="/blog" className="text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <a href="https://dashboard.simpleanalytics.com/whatthefood.io" target="_blank" rel="noopener noreferrer" className="text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors">
                  Analytics
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t dark:border-slate-800 mt-8 pt-8 text-center text-sm text-muted-foreground dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} WhatTheFood. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;