"use client";

import { useLanguage } from "@/contexts/LanguageContext";

const TopBar = () => {
  const { t } = useLanguage();
  
  return (
    <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-medium">
      {t("topbar.promo")}
    </div>
  );
};

export default TopBar;