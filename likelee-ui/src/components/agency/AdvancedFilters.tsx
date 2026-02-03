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
  return (
    <Card className="p-8 bg-blue-50/30 border border-blue-100 rounded-xl shadow-sm mb-6 animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-gray-900">Advanced Filters</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Physical Attributes */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Physical Attributes
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">Gender</label>
              <Select
                value={filters.gender}
                onValueChange={(value) =>
                  onChange({ ...filters, gender: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-Binary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                Height Range
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Min (cm)"
                  className="bg-white"
                  type="number"
                  value={filters.heightMinCm}
                  onChange={(e) =>
                    onChange({ ...filters, heightMinCm: e.target.value })
                  }
                />
                <Input
                  placeholder="Max (cm)"
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
                Age Range
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Min"
                  className="bg-white"
                  type="number"
                  value={filters.ageMin}
                  onChange={(e) =>
                    onChange({ ...filters, ageMin: e.target.value })
                  }
                />
                <Input
                  placeholder="Max"
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
            Appearance
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                Hair Color
              </label>
              <Select
                value={filters.hairColor}
                onValueChange={(value) =>
                  onChange({ ...filters, hairColor: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Hair Colors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hair Colors</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                  <SelectItem value="brown">Brown</SelectItem>
                  <SelectItem value="blonde">Blonde</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                Eye Color
              </label>
              <Select
                value={filters.eyeColor}
                onValueChange={(value) =>
                  onChange({ ...filters, eyeColor: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Eye Colors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Eye Colors</SelectItem>
                  <SelectItem value="brown">Brown</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="hazel">Hazel</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                Ethnicity
              </label>
              <Select
                value={filters.ethnicity}
                onValueChange={(value) =>
                  onChange({ ...filters, ethnicity: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Ethnicities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ethnicities</SelectItem>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                  <SelectItem value="asian">Asian</SelectItem>
                  <SelectItem value="hispanic">Hispanic</SelectItem>
                  <SelectItem value="middle_eastern">Middle Eastern</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Special Features */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Special Features
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">Tattoos</label>
              <Select
                value={filters.tattoos}
                onValueChange={(value) =>
                  onChange({ ...filters, tattoos: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="yes">Has Tattoos</SelectItem>
                  <SelectItem value="no">No Tattoos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                Piercings
              </label>
              <Select
                value={filters.piercings}
                onValueChange={(value) =>
                  onChange({ ...filters, piercings: value })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="yes">Has Piercings</SelectItem>
                  <SelectItem value="no">No Piercings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4">
              <Button
                variant="outline"
                className="w-full border-gray-200 text-gray-600 hover:bg-white font-bold h-12 rounded-xl"
                onClick={onReset}
              >
                Reset Advanced Filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AdvancedFilters;
