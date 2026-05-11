import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface AdvancedFiltersProps {
  onReset: () => void;
  filters: {
    gender: string;
    heightMinCm: string;
    heightMaxCm: string;
    ageMin: string;
    ageMax: string;
    hairColor: string;
    eyeColor: string;
    ethnicity: string;
    tattoos: string;
    piercings: string;
  };
  onChange: (next: AdvancedFiltersProps["filters"]) => void;
}

const AdvancedFilters = ({
  onReset,
  filters,
  onChange,
}: AdvancedFiltersProps) => {
  const { t } = useTranslation("agency");

  return (
    <Card className="p-8 bg-blue-50/30 border border-blue-100 rounded-xl shadow-sm mb-6 animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-gray-900">
          {t("agencyDashboard.roster.advancedFilters.title")}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Physical Attributes */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t("agencyDashboard.roster.advancedFilters.sections.physical")}
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                {t("agencyDashboard.roster.advancedFilters.fields.gender")}
              </label>
              <Select
                value={filters.gender}
                onValueChange={(value) =>
                  onChange({ ...filters, gender: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue
                    placeholder={t(
                      "agencyDashboard.roster.advancedFilters.placeholders.allGenders",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t(
                      "agencyDashboard.roster.advancedFilters.placeholders.allGenders",
                    )}
                  </SelectItem>
                  <SelectItem value="male">
                    {t("agencyDashboard.roster.advancedFilters.options.male")}
                  </SelectItem>
                  <SelectItem value="female">
                    {t("agencyDashboard.roster.advancedFilters.options.female")}
                  </SelectItem>
                  <SelectItem value="non-binary">
                    {t(
                      "agencyDashboard.roster.advancedFilters.options.nonBinary",
                    )}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                {t("agencyDashboard.roster.advancedFilters.fields.heightRange")}
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder={t(
                    "agencyDashboard.roster.advancedFilters.placeholders.minCm",
                  )}
                  className="bg-white"
                  type="number"
                  value={filters.heightMinCm}
                  onChange={(e) =>
                    onChange({ ...filters, heightMinCm: e.target.value })
                  }
                />
                <Input
                  placeholder={t(
                    "agencyDashboard.roster.advancedFilters.placeholders.maxCm",
                  )}
                  className="bg-white"
                  type="number"
                  value={filters.heightMaxCm}
                  onChange={(e) =>
                    onChange({ ...filters, heightMaxCm: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                {t("agencyDashboard.roster.advancedFilters.fields.ageRange")}
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder={t(
                    "agencyDashboard.roster.advancedFilters.placeholders.min",
                  )}
                  className="bg-white"
                  type="number"
                  value={filters.ageMin}
                  onChange={(e) =>
                    onChange({ ...filters, ageMin: e.target.value })
                  }
                />
                <Input
                  placeholder={t(
                    "agencyDashboard.roster.advancedFilters.placeholders.max",
                  )}
                  className="bg-white"
                  type="number"
                  value={filters.ageMax}
                  onChange={(e) =>
                    onChange({ ...filters, ageMax: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t("agencyDashboard.roster.advancedFilters.sections.appearance")}
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                {t("agencyDashboard.roster.advancedFilters.fields.hairColor")}
              </label>
              <Select
                value={filters.hairColor}
                onValueChange={(value) =>
                  onChange({ ...filters, hairColor: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue
                    placeholder={t(
                      "agencyDashboard.roster.advancedFilters.placeholders.allHairColors",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t(
                      "agencyDashboard.roster.advancedFilters.placeholders.allHairColors",
                    )}
                  </SelectItem>
                  <SelectItem value="black">
                    {t("agencyDashboard.roster.advancedFilters.options.black")}
                  </SelectItem>
                  <SelectItem value="brown">
                    {t("agencyDashboard.roster.advancedFilters.options.brown")}
                  </SelectItem>
                  <SelectItem value="blonde">
                    {t("agencyDashboard.roster.advancedFilters.options.blonde")}
                  </SelectItem>
                  <SelectItem value="red">
                    {t("agencyDashboard.roster.advancedFilters.options.red")}
                  </SelectItem>
                  <SelectItem value="gray">
                    {t("agencyDashboard.roster.advancedFilters.options.gray")}
                  </SelectItem>
                  <SelectItem value="other">
                    {t("agencyDashboard.roster.advancedFilters.options.other")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                {t("agencyDashboard.roster.advancedFilters.fields.eyeColor")}
              </label>
              <Select
                value={filters.eyeColor}
                onValueChange={(value) =>
                  onChange({ ...filters, eyeColor: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue
                    placeholder={t(
                      "agencyDashboard.roster.advancedFilters.placeholders.allEyeColors",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t(
                      "agencyDashboard.roster.advancedFilters.placeholders.allEyeColors",
                    )}
                  </SelectItem>
                  <SelectItem value="brown">
                    {t("agencyDashboard.roster.advancedFilters.options.brown")}
                  </SelectItem>
                  <SelectItem value="blue">
                    {t("agencyDashboard.roster.advancedFilters.options.blue")}
                  </SelectItem>
                  <SelectItem value="green">
                    {t("agencyDashboard.roster.advancedFilters.options.green")}
                  </SelectItem>
                  <SelectItem value="hazel">
                    {t("agencyDashboard.roster.advancedFilters.options.hazel")}
                  </SelectItem>
                  <SelectItem value="gray">
                    {t("agencyDashboard.roster.advancedFilters.options.gray")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                {t("agencyDashboard.roster.advancedFilters.fields.ethnicity")}
              </label>
              <Select
                value={filters.ethnicity}
                onValueChange={(value) =>
                  onChange({ ...filters, ethnicity: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue
                    placeholder={t(
                      "agencyDashboard.roster.advancedFilters.placeholders.allEthnicities",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t(
                      "agencyDashboard.roster.advancedFilters.placeholders.allEthnicities",
                    )}
                  </SelectItem>
                  <SelectItem value="white">
                    {t("agencyDashboard.roster.advancedFilters.options.white")}
                  </SelectItem>
                  <SelectItem value="black">
                    {t("agencyDashboard.roster.advancedFilters.options.black")}
                  </SelectItem>
                  <SelectItem value="asian">
                    {t("agencyDashboard.roster.advancedFilters.options.asian")}
                  </SelectItem>
                  <SelectItem value="hispanic">
                    {t(
                      "agencyDashboard.roster.advancedFilters.options.hispanic",
                    )}
                  </SelectItem>
                  <SelectItem value="middle_eastern">
                    {t(
                      "agencyDashboard.roster.advancedFilters.options.middleEastern",
                    )}
                  </SelectItem>
                  <SelectItem value="mixed">
                    {t("agencyDashboard.roster.advancedFilters.options.mixed")}
                  </SelectItem>
                  <SelectItem value="other">
                    {t("agencyDashboard.roster.advancedFilters.options.other")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Special Features */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t(
              "agencyDashboard.roster.advancedFilters.sections.specialFeatures",
            )}
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                {t("agencyDashboard.roster.advancedFilters.fields.tattoos")}
              </label>
              <Select
                value={filters.tattoos}
                onValueChange={(value) =>
                  onChange({ ...filters, tattoos: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue
                    placeholder={t(
                      "agencyDashboard.roster.advancedFilters.placeholders.any",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">
                    {t(
                      "agencyDashboard.roster.advancedFilters.placeholders.any",
                    )}
                  </SelectItem>
                  <SelectItem value="yes">
                    {t(
                      "agencyDashboard.roster.advancedFilters.options.hasTattoos",
                    )}
                  </SelectItem>
                  <SelectItem value="no">
                    {t(
                      "agencyDashboard.roster.advancedFilters.options.noTattoos",
                    )}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                {t("agencyDashboard.roster.advancedFilters.fields.piercings")}
              </label>
              <Select
                value={filters.piercings}
                onValueChange={(value) =>
                  onChange({ ...filters, piercings: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue
                    placeholder={t(
                      "agencyDashboard.roster.advancedFilters.placeholders.any",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">
                    {t(
                      "agencyDashboard.roster.advancedFilters.placeholders.any",
                    )}
                  </SelectItem>
                  <SelectItem value="yes">
                    {t(
                      "agencyDashboard.roster.advancedFilters.options.hasPiercings",
                    )}
                  </SelectItem>
                  <SelectItem value="no">
                    {t(
                      "agencyDashboard.roster.advancedFilters.options.noPiercings",
                    )}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4">
              <Button
                variant="outline"
                className="w-full border-gray-200 text-gray-600 hover:bg-white font-bold h-12 rounded-xl"
                onClick={onReset}
              >
                {t("agencyDashboard.roster.advancedFilters.actions.reset")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AdvancedFilters;
