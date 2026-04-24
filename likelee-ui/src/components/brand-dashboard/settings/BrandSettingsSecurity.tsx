import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Shield } from "lucide-react";

type BrandSettingsSecurityProps = {
  onNavigate: (path: string) => void;
};

export const BrandSettingsSecurity = ({
  onNavigate,
}: BrandSettingsSecurityProps) => (
  <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
    <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
      <Shield className="w-6 h-6" /> Security Settings
    </h3>
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={() => onNavigate("/forgot-password")}
        className="w-full justify-between rounded-lg border border-gray-200 hover:border-gray-900 font-bold text-sm h-12"
      >
        Reset Admin Password <ChevronRight className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        onClick={() => onNavigate("/TwoFactorSetup")}
        className="w-full justify-between rounded-lg border border-gray-200 hover:border-gray-900 font-bold text-sm h-12"
      >
        Enable 2FA Protection <ChevronRight className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        className="w-full justify-between rounded-lg border border-gray-200 hover:border-gray-900 font-bold text-sm h-12"
      >
        View Active Sessions <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  </Card>
);
