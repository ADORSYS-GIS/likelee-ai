import React from "react";
import { Card } from "@/components/ui/card";
import { Calendar, FileText, HelpCircle, Info } from "lucide-react";

export const BrandSettingsSupport = () => (
  <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
      Support & Help Center
    </h3>
    <div className="grid md:grid-cols-2 gap-3">
      <button
        onClick={() => (window.location.href = "/support")}
        className="flex items-center gap-3 px-4 py-3.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-800 text-left transition-colors"
      >
        <HelpCircle className="w-4 h-4 text-gray-500 shrink-0" />
        Contact Support
      </button>
      <button
        onClick={() => (window.location.href = "/aboutus")}
        className="flex items-center gap-3 px-4 py-3.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-800 text-left transition-colors"
      >
        <FileText className="w-4 h-4 text-gray-500 shrink-0" />
        Knowledge Base
      </button>
      <button
        onClick={() =>
          (window.location.href = "/book-demo?source=brand_company_hero")
        }
        className="flex items-center gap-3 px-4 py-3.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-800 text-left transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
        Schedule a Call
      </button>
      <button
        onClick={() => (window.location.href = "/support")}
        className="flex items-center gap-3 px-4 py-3.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-800 text-left transition-colors"
      >
        <Info className="w-4 h-4 text-gray-500 shrink-0" />
        Report a Bug
      </button>
    </div>
  </Card>
);
