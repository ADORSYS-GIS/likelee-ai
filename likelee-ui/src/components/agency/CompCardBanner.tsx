import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout } from "lucide-react";

const CompCardBanner = () => {
  return (
    <Card className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-gray-900">Comp Card Generator</h3>
        <p className="text-sm text-gray-600">
          Auto-generate professional comp cards from talent profiles
        </p>
      </div>
      <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 px-6 h-12 rounded-xl shadow-lg shadow-purple-200">
        <Layout className="w-4 h-4" />
        Comp Card Generator
      </Button>
    </Card>
  );
};

export default CompCardBanner;
