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
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  isMinified?: boolean;
}

export const LanguageSelector = ({ isMinified = false }: LanguageSelectorProps) => {
  const { i18n, t } = useTranslation();
  const current =
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ??
    SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
          isMinified && "justify-center px-0",
        )}
        title={isMinified ? t("common.language") : undefined}
        aria-label={t("common.language")}
      >
        <Globe className="w-5 h-5 shrink-0" />
        {!isMinified && (
          <span className="flex-1 text-left truncate">
            {current.flag} {current.label}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-48 z-[80]">
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
  );
};
