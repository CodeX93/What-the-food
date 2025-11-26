/**
 * Convenience hook for translations
 * Usage: const t = useTranslation();
 * Then: t("nav.home") or t("common.loading")
 */
import { useLanguage } from "@/contexts/LanguageContext";

export function useTranslation() {
  const { t } = useLanguage();
  return t;
}

