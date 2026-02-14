"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { Logo } from "./Logo";

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="bg-gradient-to-b from-[#f4f6f9] via-[#f6f8fb] to-[#fafbfd] dark:from-[#050506] dark:via-[#0b0b0d] dark:to-[#111113] border-t border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-24 xl:gap-32">
          <div className="max-w-xs space-y-4">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Logo />
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {t("footer.description")}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Tour Our Site</h3>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <a
                  href="https://odehahwal.com"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="hover:text-primary transition-colors"
                >
                  About Founder
                </a>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-primary transition-colors">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hi@whatthefood.io"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.contactsupport")}
                </a>
              </li>
              <li>
                <a href="/sitemap.xml" className="hover:text-primary transition-colors">
                  Sitemap
                </a>
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
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Resources</h3>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/keto-meal-planner" className="hover:text-primary transition-colors">
                  Keto Meal Planner
                </Link>
              </li>
              <li>
                <Link
                  href="https://whatthefood.io/blog/free-calorie-estimator"
                  className="hover:text-primary transition-colors"
                >
                  Free Calorie Estimator
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/random-recipe-generator"
                  className="hover:text-primary transition-colors"
                >
                  Random Recipe Generator
                </Link>
              </li>
              <li>
                <a
                  href="https://aitoolsforthat.com"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="hover:text-primary transition-colors"
                >
                  AI Tools For That
                </a>
              </li>
              {/* <li>
                <a
                  href="https://spanglishtranslator.net"
                  target="_blank"
                  rel="noopener"
                  className="hover:text-primary transition-colors"
                >
                  Spanglish Translator
                </a>
              </li> */}
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
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-primary transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="hover:text-primary transition-colors">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 mt-7 pt-5 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} WhatTheFood. {t("footer.rights")}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;