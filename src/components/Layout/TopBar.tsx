"use client";

import { useLanguage } from "@/contexts/LanguageContext";

const TopBar = () => {
  const { t } = useLanguage();
  
  return (
    <div className="relative overflow-hidden bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-medium">
      <div aria-hidden className="topbar-snow pointer-events-none absolute inset-0" />
      <div aria-hidden className="topbar-snow topbar-snow--alt pointer-events-none absolute inset-0" />
      <span className="relative z-10">{t("topbar.promo")}</span>
    </div>
  );
};

export default TopBar;