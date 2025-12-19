"use client";

import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import type { Route } from "next";
import { LanguageContext } from "@/contexts/LanguageContext";

const navigationLinks: Array<{ href: Route; translationKey: string; defaultLabel: string; external?: boolean; showIndicator?: boolean }> = [
  { href: "/features", translationKey: "nav.features", defaultLabel: "Features" },
  { href: "/how-it-works", translationKey: "nav.howitworks", defaultLabel: "How It Works" },
  { href: "/pricing", translationKey: "nav.pricing", defaultLabel: "Pricing" },
  { href: "/widget", translationKey: "nav.widget", defaultLabel: "Widget" },
  { href: "/blog", translationKey: "nav.blog", defaultLabel: "Blog" },
  { href: "https://cloud.umami.is/share/Ax6TpdslJdkistST" as Route, translationKey: "nav.analytics", defaultLabel: "Analytics", external: true, showIndicator: true },
];

type NavigationLinksProps = {
  className?: string;
  onLinkClick?: () => void;
};

export function NavigationLinks({ className, onLinkClick }: NavigationLinksProps) {
  const [mounted, setMounted] = useState(false);
  const languageContext = useContext(LanguageContext);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get translation function if context is available, otherwise use default labels
  const getLabel = (link: typeof navigationLinks[0]) => {
    if (mounted && languageContext) {
      return languageContext.t(link.translationKey);
    }
    return link.defaultLabel;
  };

  return (
    <nav className={className}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:space-x-6">
        {navigationLinks.map((link) => {
          const label = getLabel(link);
          const linkContent = (
            <span className="flex items-center gap-2">
              {link.showIndicator && (
                <span className="relative inline-flex items-center">
                  <span className="absolute inline-flex h-2 w-2 rounded-full bg-green-500 opacity-75 animate-ping"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>
              )}
              {label}
            </span>
          );

          if (link.external) {
            return (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {linkContent}
              </a>
            );
          }

          return (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium hover:text-primary transition-colors"
            onClick={onLinkClick}
          >
              {linkContent}
          </Link>
          );
        })}
      </div>
    </nav>
  );
}

