import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const languages = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
};

type LanguageSwitcherProps = {
  className?: string;
};

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className }) => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-2 text-black hover:text-gray-700 hover:bg-transparent px-2",
            className,
          )}
        >
          {languages[i18n.language.split("-")[0] as keyof typeof languages] ||
            "Language"}
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {Object.keys(languages).map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => changeLanguage(lng)}
            className={
              i18n.language.startsWith(lng) ? "text-[#32C8D1] font-bold" : ""
            }
          >
            {languages[lng as keyof typeof languages]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
