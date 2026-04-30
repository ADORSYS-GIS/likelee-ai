import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Building2, Loader2 } from "lucide-react";

type BrandSettingsProfileProps = {
  brand: any;
  originalBrand: any;
  uploadingLogo: boolean;
  isSavingProfile: boolean;
  onUpdateBrand: (next: any) => void;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveProfile: () => void;
  onShowLogoPreview: () => void;
};

const getBrandInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const BrandSettingsProfile = ({
  brand,
  originalBrand,
  uploadingLogo,
  isSavingProfile,
  onUpdateBrand,
  onLogoUpload,
  onSaveProfile,
  onShowLogoPreview,
}: BrandSettingsProfileProps) => (
  <>
    <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-none">
      <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">
        Company Logo
      </h3>
      <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar
            className="w-32 h-32 border-2 border-gray-200 rounded-lg bg-gray-50 cursor-pointer transition-opacity hover:opacity-80"
            onClick={onShowLogoPreview}
          >
            <AvatarImage src={brand.logo} alt={brand.name} />
            <AvatarFallback className="text-2xl font-bold text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              {getBrandInitials(brand.name || "Brand")}
            </AvatarFallback>
          </Avatar>
          <label className="absolute -bottom-2 -right-2 bg-white rounded-lg p-2 border-2 border-gray-900 cursor-pointer hover:bg-gray-50 shadow-sm">
            <Edit className="w-4 h-4 text-gray-900" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onLogoUpload}
              disabled={uploadingLogo}
            />
          </label>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 mb-1">
            Upload Official Logo
          </p>
          <p className="text-xs text-gray-500 font-medium">
            JPG or PNG, max 5MB, square format recommended
          </p>
        </div>
      </div>
    </Card>

    <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
      <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
        <Building2 className="w-6 h-6" /> Company Information
      </h3>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500 block">
            Organization Name
          </Label>
          <Input
            value={brand.name}
            onChange={(e) => onUpdateBrand({ ...brand, name: e.target.value })}
            className="rounded-lg border border-gray-200 focus:border-gray-900 h-11 text-sm font-medium"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500 block">
            Industry
          </Label>
          <Input
            value={brand.industry}
            onChange={(e) =>
              onUpdateBrand({ ...brand, industry: e.target.value })
            }
            className="rounded-lg border border-gray-200 focus:border-gray-900 h-11 text-sm font-medium"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500 block">
            Website
          </Label>
          <Input
            value={brand.website}
            onChange={(e) =>
              onUpdateBrand({ ...brand, website: e.target.value })
            }
            className="rounded-lg border border-gray-200 focus:border-gray-900 h-11 text-sm font-medium"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500 block">
            Contact Email
          </Label>
          <Input
            value={brand.contact_email}
            disabled
            className="rounded-lg border border-gray-200 bg-gray-50 h-11 text-sm font-medium cursor-not-allowed"
          />
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-100">
        <Button
          onClick={onSaveProfile}
          disabled={
            JSON.stringify(brand) === JSON.stringify(originalBrand) ||
            isSavingProfile
          }
          className="w-full rounded-lg bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-bold h-12 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSavingProfile ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Save Profile Changes
        </Button>
      </div>
    </Card>
  </>
);
