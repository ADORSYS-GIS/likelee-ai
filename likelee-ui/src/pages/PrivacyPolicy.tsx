import React from "react";
import { Card } from "@/components/ui/card";
import { PrivacyPolicyContent } from "@/components/PrivacyPolicyContent";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
          <PrivacyPolicyContent />
        </Card>
      </div>
    </div>
  );
}
