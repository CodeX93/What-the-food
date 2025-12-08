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
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t("footer.product")}</h3>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/features" className="hover:text-primary transition-colors">
                  {t("nav.features")}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-primary transition-colors">
                  {t("nav.howitworks")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary transition-colors">
                  {t("nav.pricing")}
                </Link>
              </li>
              <li>
                <Link href="/widget" className="hover:text-primary transition-colors">
                  {t("nav.widget")}
                </Link>
              </li>
              <li>
                <Link href="/wall-of-love" className="hover:text-primary transition-colors">
                  {t("footer.walloflove")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t("footer.company")}</h3>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  {t("footer.aboutus")}
                </Link>
              </li>
              <li>
                <a
                  href="https://odehahwal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.aboutfounder")}
                </a>
              </li>
              <li>
                <Link href="/blog" className="hover:text-primary transition-colors">
                  {t("nav.blog")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t("footer.legal")}</h3>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  {t("footer.privacypolicy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary transition-colors">
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-primary transition-colors">
                  {t("footer.refundpolicy")}
                </Link>
              </li>
              <li>
                <a
                  href="https://dashboard.simpleanalytics.com/whatthefood.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.analytics")}
                </a>
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