"use client";

import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import type { Route } from "next";
import { LanguageContext } from "@/contexts/LanguageContext";

const navigationLinks: Array<{ href: Route; translationKey: string; defaultLabel: string }> = [
  { href: "/features", translationKey: "nav.features", defaultLabel: "Features" },
  { href: "/how-it-works", translationKey: "nav.howitworks", defaultLabel: "How It Works" },
  { href: "/pricing", translationKey: "nav.pricing", defaultLabel: "Pricing" },
  { href: "/widget", translationKey: "nav.widget", defaultLabel: "Widget" },
  { href: "/blog", translationKey: "nav.blog", defaultLabel: "Blog" },
];

type NavigationLinksProps = {
  className?: string;
};

export function NavigationLinks({ className }: NavigationLinksProps) {
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
        {navigationLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            {getLabel(link)}
          </Link>
        ))}
      </div>
    </nav>
  );
}

