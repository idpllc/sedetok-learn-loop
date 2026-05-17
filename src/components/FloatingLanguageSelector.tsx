import { Globe, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES } from "@/i18n";

export const FloatingLanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const current =
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ??
    SUPPORTED_LANGUAGES[0];

  return (
    <div className="fixed top-4 right-4 z-[70]">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-2 text-sm shadow-md backdrop-blur transition-colors hover:bg-card"
          aria-label={t("common.language")}
        >
          <Globe className="w-4 h-4" />
          <span>{current.flag}</span>
          <span className="hidden sm:inline">{current.label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 z-[80]">
          <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SUPPORTED_LANGUAGES.map((lng) => (
            <DropdownMenuItem
              key={lng.code}
              onClick={() => i18n.changeLanguage(lng.code)}
              className="cursor-pointer"
            >
              <span className="mr-2">{lng.flag}</span>
              <span className="flex-1">{lng.label}</span>
              {current.code === lng.code && <Check className="w-4 h-4 text-pink" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
