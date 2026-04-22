import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditCard, Loader2, Plus, Trash2, Check } from "lucide-react";
import { PaymentMethodModal } from "./PaymentMethodModal";
import {
  getBrandPaymentMethods,
  deleteBrandPaymentMethod,
  setBrandPrimaryPaymentMethod,
} from "@/api/functions";
import { toast } from "sonner";

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

interface PrimaryPaymentMethod {
  stripe_payment_method_id: string;
  card_last_four: string;
  card_brand: string;
  card_exp_month: number;
  card_exp_year: number;
}

export const BrandSettingsBilling = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [primaryPaymentMethod, setPrimaryPaymentMethod] =
    useState<PrimaryPaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const data = await getBrandPaymentMethods();
      const methods = data.payment_methods || [];
      const deduped = Array.from(
        new Map(methods.map((m) => [m.stripe_payment_method_id, m])).values(),
      );
      setPaymentMethods(deduped);
      setPrimaryPaymentMethod(data.primary_payment_method || null);
    } catch (err) {
      toast.error("Failed to load payment methods");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (stripePaymentMethodId: string) => {
    if (
      primaryPaymentMethod?.stripe_payment_method_id === stripePaymentMethodId
    ) {
      toast.error("Cannot delete the primary payment method");
      return;
    }
    try {
      setIsDeleting(stripePaymentMethodId);
      await deleteBrandPaymentMethod({
        stripe_payment_method_id: stripePaymentMethodId,
      });
      toast.success("Payment method removed");
      await loadPaymentMethods();
    } catch (err) {
      toast.error("Failed to delete payment method");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSetPrimary = async (stripePaymentMethodId: string) => {
    try {
      setIsSettingPrimary(stripePaymentMethodId);
      await setBrandPrimaryPaymentMethod({
        stripe_payment_method_id: stripePaymentMethodId,
      });
      toast.success("Primary payment method updated");
      await loadPaymentMethods();
    } catch (err) {
      toast.error("Failed to set primary payment method");
    } finally {
      setIsSettingPrimary(null);
    }
  };

  const getCardIcon = (brand: string) => {
    const b = brand.toLowerCase();
    if (b.includes("visa")) return "V";
    if (b.includes("master")) return "M";
    if (b.includes("amex")) return "A";
    if (b.includes("discover")) return "D";
    return brand.charAt(0).toUpperCase();
  };

  const getCardColor = (brand: string) => {
    const b = brand.toLowerCase();
    if (b.includes("visa")) return "bg-blue-600";
    if (b.includes("master")) return "bg-orange-500";
    if (b.includes("amex")) return "bg-green-600";
    if (b.includes("discover")) return "bg-orange-600";
    return "bg-gray-600";
  };

  return (
    <>
      <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
        <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <CreditCard className="w-6 h-6" /> Billing & Payment
        </h3>

        {/* Primary Payment Method Display */}
        <div className="mb-8">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Primary Payment Method
          </h4>
          {primaryPaymentMethod ? (
            <div className="p-5 border-2 border-gray-900 rounded-lg bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 ${getCardColor(primaryPaymentMethod.card_brand)} rounded-lg flex items-center justify-center`}
                >
                  <span className="text-white font-bold text-lg">
                    {getCardIcon(primaryPaymentMethod.card_brand)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {primaryPaymentMethod.card_brand.charAt(0).toUpperCase() +
                      primaryPaymentMethod.card_brand.slice(1)}{" "}
                    •••• {primaryPaymentMethod.card_last_four}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Expires{" "}
                    {String(primaryPaymentMethod.card_exp_month).padStart(
                      2,
                      "0",
                    )}
                    /{primaryPaymentMethod.card_exp_year}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setIsModalOpen(true)}
                variant="outline"
                size="sm"
                className="rounded-lg border border-gray-900 font-semibold text-xs text-gray-900 hover:bg-gray-900 hover:text-white"
              >
                Manage
              </Button>
            </div>
          ) : (
            <div className="p-5 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    No payment method on file
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setIsModalOpen(true)}
                size="sm"
                className="rounded-lg bg-gray-900 text-white hover:bg-gray-800 font-semibold text-xs"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Card
              </Button>
            </div>
          )}
        </div>

        {/* Saved Payment Methods */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Saved Payment Methods
            </h4>
            <Button
              onClick={() => setIsModalOpen(true)}
              size="sm"
              className="rounded-lg bg-gray-900 text-white hover:bg-gray-800 font-semibold text-xs"
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
            <div className="p-6 border border-gray-200 rounded-lg text-center">
              <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No saved payment methods</p>
              <p className="text-xs text-gray-400 mt-1">
                Add a card to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const isPrimary =
                  primaryPaymentMethod?.stripe_payment_method_id ===
                  method.stripe_payment_method_id;
                return (
                  <div
                    key={method.id}
                    className="p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-10 h-10 ${getCardColor(method.card_brand)} rounded-lg flex items-center justify-center flex-shrink-0`}
                      >
                        <span className="text-white font-bold text-sm">
                          {getCardIcon(method.card_brand)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {method.card_brand.charAt(0).toUpperCase() +
                            method.card_brand.slice(1)}{" "}
                          •••• {method.card_last_four}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Expires{" "}
                          {String(method.card_exp_month).padStart(2, "0")}/
                          {method.card_exp_year}
                        </p>
                      </div>
                      {isPrimary && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex-shrink-0">
                          <Check className="w-3 h-3" />
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      {!isPrimary && (
                        <Button
                          onClick={() =>
                            handleSetPrimary(method.stripe_payment_method_id)
                          }
                          disabled={
                            isSettingPrimary === method.stripe_payment_method_id
                          }
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 text-xs"
                        >
                          {isSettingPrimary ===
                          method.stripe_payment_method_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Set Primary"
                          )}
                        </Button>
                      )}
                      <Button
                        onClick={() =>
                          handleDeletePaymentMethod(
                            method.stripe_payment_method_id,
                          )
                        }
                        disabled={
                          isDeleting === method.stripe_payment_method_id
                        }
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        {isDeleting === method.stripe_payment_method_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
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
