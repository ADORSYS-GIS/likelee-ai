import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard } from "lucide-react";

type BrandSettingsBillingProps = {
  brand: any;
};

export const BrandSettingsBilling = ({ brand }: BrandSettingsBillingProps) => (
  <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
    <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
      <CreditCard className="w-6 h-6" /> Billing & Payment
    </h3>
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-2">
        <Label className="text-xs font-bold text-gray-500 block">
          Billing Address
        </Label>
        <Textarea
          placeholder="Enter your billing address"
          defaultValue={
            brand.industry === "Retail & E-commerce"
              ? "123 Main St\nLos Angeles, CA 90001\nUnited States"
              : ""
          }
          className="rounded-lg border border-gray-200 focus:border-gray-900 font-medium min-h-[120px]"
        />
      </div>
      <div className="space-y-8">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500 block">
            Billing Email
          </Label>
          <Input
            defaultValue={brand.contact_email}
            className="rounded-lg border border-gray-200 focus:border-gray-900 h-11 font-medium"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500 block">
            Tax Identification
          </Label>
          <Input
            placeholder="XX-XXXXXXX"
            className="rounded-lg border border-gray-200 focus:border-gray-900 h-11 font-medium"
          />
        </div>
      </div>
    </div>

    <div className="mt-10 space-y-2">
      <Label className="text-xs font-bold text-gray-500 block">
        Payment Method
      </Label>
      <div className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CreditCard className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 tracking-widest">
            •••• •••• •••• 4242
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border border-gray-200 font-bold text-xs"
        >
          Update
        </Button>
      </div>
    </div>
  </Card>
);
