import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <div className="relative group">
        <Button
          variant="outline"
          disabled
          className="w-full justify-between rounded-lg border border-gray-200 font-bold text-sm h-12 opacity-50 blur-[1px] cursor-not-allowed"
        >
          Enable 2FA Protection (Coming Soon){" "}
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <Badge variant="secondary" className="bg-gray-900 text-white">
            Coming Soon
          </Badge>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full justify-between rounded-lg border border-gray-200 hover:border-gray-900 font-bold text-sm h-12"
      >
        View Active Sessions <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  </Card>
);
