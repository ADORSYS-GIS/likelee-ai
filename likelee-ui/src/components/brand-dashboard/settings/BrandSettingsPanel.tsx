import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandSettingsProfile } from "./BrandSettingsProfile";
import { BrandSettingsNotifications } from "./BrandSettingsNotifications";
import { BrandSettingsBilling } from "./BrandSettingsBilling";
import { BrandSettingsTeam } from "./BrandSettingsTeam";
import { BrandSettingsSecurity } from "./BrandSettingsSecurity";
import { BrandSettingsLegal } from "./BrandSettingsLegal";
import { BrandSettingsSupport } from "./BrandSettingsSupport";

type BrandSettingsPanelProps = {
  activeSettingsTab: string;
  onChangeTab: (value: string) => void;
  brand: any;
  originalBrand: any;
  uploadingLogo: boolean;
  isSavingProfile: boolean;
  onUpdateBrand: (brand: any) => void;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveProfile: () => void;
  onShowLogoPreview: () => void;
  notificationPrefs: Record<string, boolean>;
  onToggleNotificationPref: (prefId: string, value: boolean) => void;
  isSavingNotificationPrefs: boolean;
  onNavigate: (path: string) => void;
};

export const BrandSettingsPanel = ({
  activeSettingsTab,
  onChangeTab,
  brand,
  originalBrand,
  uploadingLogo,
  isSavingProfile,
  onUpdateBrand,
  onLogoUpload,
  onSaveProfile,
  onShowLogoPreview,
  notificationPrefs,
  onToggleNotificationPref,
  isSavingNotificationPrefs,
  onNavigate,
}: BrandSettingsPanelProps) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-600">
        Manage your company profile and preferences
      </p>
    </div>

    <Tabs
      value={activeSettingsTab}
      onValueChange={onChangeTab}
      className="w-full"
    >
      <TabsList className="w-full flex justify-start bg-gray-100/50 p-1 mb-6 overflow-x-auto no-scrollbar rounded-lg border-b border-gray-200 h-auto">
        <TabsTrigger
          value="profile"
          className="rounded-lg border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold text-xs"
        >
          Profile
        </TabsTrigger>
        <TabsTrigger
          value="notifications"
          className="rounded-lg border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold text-xs"
        >
          Notifications
        </TabsTrigger>
        <TabsTrigger
          value="billing"
          className="rounded-lg border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold text-xs"
        >
          Billing
        </TabsTrigger>
        <TabsTrigger
          value="team"
          className="rounded-lg border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold text-xs"
        >
          Team
        </TabsTrigger>
        <TabsTrigger
          value="security"
          className="rounded-lg border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold text-xs"
        >
          Security
        </TabsTrigger>
        <TabsTrigger
          value="legal"
          className="rounded-lg border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold text-xs"
        >
          Compliance & Legal
        </TabsTrigger>
        <TabsTrigger
          value="support"
          className="rounded-lg border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold text-xs"
        >
          Support & Help
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="space-y-6 mt-0">
        <BrandSettingsProfile
          brand={brand}
          originalBrand={originalBrand}
          uploadingLogo={uploadingLogo}
          isSavingProfile={isSavingProfile}
          onUpdateBrand={onUpdateBrand}
          onLogoUpload={onLogoUpload}
          onSaveProfile={onSaveProfile}
          onShowLogoPreview={onShowLogoPreview}
        />
      </TabsContent>

      <TabsContent value="notifications" className="space-y-6 mt-0">
        <BrandSettingsNotifications
          notificationPrefs={notificationPrefs}
          onToggleNotificationPref={onToggleNotificationPref}
          isSavingNotificationPrefs={isSavingNotificationPrefs}
        />
      </TabsContent>

      <TabsContent value="billing" className="space-y-6 mt-0">
        <BrandSettingsBilling brand={brand} />
      </TabsContent>

      <TabsContent value="team" className="space-y-6 mt-0">
        <BrandSettingsTeam brand={brand} />
      </TabsContent>

      <TabsContent value="security" className="space-y-6 mt-0">
        <BrandSettingsSecurity onNavigate={onNavigate} />
      </TabsContent>

      <TabsContent value="legal" className="space-y-6 mt-0">
        <BrandSettingsLegal />
      </TabsContent>

      <TabsContent value="support" className="space-y-6 mt-0">
        <BrandSettingsSupport />
      </TabsContent>
    </Tabs>
  </div>
);
