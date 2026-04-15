import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CircleSlash, Download, FileText } from "lucide-react";

export const BrandSettingsLegal = () => (
  <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
      Compliance & Legal
    </h3>
    <div className="space-y-3">
      {[
        {
          title: "Terms & Conditions",
          icon: FileText,
          action: () =>
            window.open("/terms-and-conditions-agency.html", "_blank"),
        },
        {
          title: "Privacy Policy",
          icon: FileText,
          action: () =>
            window.open("https://likelee.ai/privacypolicy", "_blank"),
        },
        {
          title: "SAG-AFTRA Alignment Statement",
          icon: CircleSlash,
          action: () => {
            window.location.href = "/sagaftraalignment";
          },
        },
        {
          title: "Download My Data (GDPR) (Coming Soon)",
          icon: Download,
          action: () => {},
        },
      ].map((legal, i) => {
        const Icon = legal.icon;
        return legal.title.includes("Coming Soon") ? (
          <div key={i} className="relative group">
            <button
              disabled
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-400 text-left transition-colors opacity-50 blur-[1px] cursor-not-allowed"
            >
              <Icon className="w-4 h-4 text-gray-400 shrink-0" />
              {legal.title}
            </button>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Badge variant="secondary" className="bg-gray-900 text-white">
                Coming Soon
              </Badge>
            </div>
          </div>
        ) : (
          <button
            key={i}
            onClick={legal.action}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-800 text-left transition-colors"
          >
            <Icon className="w-4 h-4 text-gray-500 shrink-0" />
            {legal.title}
          </button>
        );
      })}
    </div>
  </Card>
);
