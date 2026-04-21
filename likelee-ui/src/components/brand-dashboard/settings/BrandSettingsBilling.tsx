import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Loader2, Plus, Trash2 } from "lucide-react";
import { PaymentMethodModal } from "./PaymentMethodModal";
import { getBrandPaymentMethods, deleteBrandPaymentMethod } from "@/api/functions";
import { toast } from "sonner";

type BrandSettingsBillingProps = {
  brand: any;
};

interface PaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  card_last_four: string;
  card_brand: string;
  card_exp_month: number;
  card_exp_year: number;
  is_active: boolean;
  created_at: string;
}

export const BrandSettingsBilling = ({ brand }: BrandSettingsBillingProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [primaryPaymentMethod, setPrimaryPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await getBrandPaymentMethods();
      if (error) {
        console.error("Failed to load payment methods:", error);
        return;
      }
      if (data) {
        setPaymentMethods(data.payment_methods || []);
        setPrimaryPaymentMethod(data.primary_payment_method);
      }
    } catch (err) {
      console.error("Error loading payment methods:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (stripePaymentMethodId: string) => {
    try {
      setIsDeleting(stripePaymentMethodId);
      const { error } = await deleteBrandPaymentMethod({
        stripe_payment_method_id: stripePaymentMethodId,
      });
      if (error) {
        toast.error("Failed to delete payment method");
        return;
      }
      toast.success("Payment method deleted");
      await loadPaymentMethods();
    } catch (err) {
      toast.error("An error occurred while deleting the payment method");
    } finally {
      setIsDeleting(null);
    }
  };

  const formatCardDisplay = (brand: string, lastFour: string, expMonth: number, expYear: number) => {
    return `${brand.toUpperCase()} •••• •••• •••• ${lastFour} (${expMonth}/${expYear})`;
  };

  return (
    <>
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

        <div className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-gray-500 block">
              Payment Methods
            </Label>
            <Button
              onClick={() => setIsModalOpen(true)}
              size="sm"
              className="rounded-lg bg-gray-900 text-white hover:bg-gray-800 font-bold text-xs"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Card
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <p className="text-sm text-gray-600">
                No payment methods added yet. Add a card to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`p-4 border rounded-lg flex items-center justify-between transition-colors ${
                    method.is_active
                      ? "bg-white border-gray-200 hover:bg-gray-50"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 tracking-widest">
                        {formatCardDisplay(
                          method.card_brand,
                          method.card_last_four,
                          method.card_exp_month,
                          method.card_exp_year
                        )}
                      </p>
                      {method.is_active && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          Primary Payment Method
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDeletePaymentMethod(method.stripe_payment_method_id)}
                    disabled={isDeleting === method.stripe_payment_method_id}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {isDeleting === method.stripe_payment_method_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <PaymentMethodModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadPaymentMethods}
      />
    </>
  );
};
