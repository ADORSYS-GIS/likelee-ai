import React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Label as UILabel } from "@/components/ui/label";
import { Input as UIInput } from "@/components/ui/input";
import { Button as UIButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";

const Label: any = UILabel;
const Input: any = UIInput;
const Button: any = UIButton;

export default function LicensingSettings() {
  const { t } = useTranslation();
  const { user, initialized, authenticated } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [monthlyUsd, setMonthlyUsd] = React.useState<string>("");
  const { toast } = useToast();

  React.useEffect(() => {
    if (!initialized || !authenticated || !user || !supabase) return;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("base_monthly_price_cents, currency_code")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          if (typeof data.base_monthly_price_cents === "number") {
            setMonthlyUsd(
              String(Math.round(data.base_monthly_price_cents / 100)),
            );
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [initialized, authenticated, user?.id]);

  const save = async () => {
    if (!user) return;
    const monthly = Number(monthlyUsd);
    if (!Number.isFinite(monthly) || monthly < 150) {
      toast({
        title: t("licensingSettingsPage.invalidPriceTitle"),
        description: t("licensingSettingsPage.invalidPriceDesc"),
      });
      return;
    }
    try {
      setSaving(true);
      const payload: any = {
        id: user.id,
        base_monthly_price_cents: Math.round(monthly * 100),
        currency_code: "USD",
        pricing_updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;
      toast({
        title: t("licensingSettingsPage.successTitle"),
        description: t("licensingSettingsPage.successDesc"),
      });
    } catch (e: any) {
      toast({
        title: t("common.error"),
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const completion = (() => {
    const mOk = Number(monthlyUsd) >= 150;
    return mOk ? 100 : 0;
  })();

  if (!initialized) return null;
  if (!authenticated) return <div className="p-6">Please sign in.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("licensingSettingsPage.title")}
        </h1>
        <p className="text-sm text-gray-600">
          {t("licensingSettingsPage.subtitle")}
        </p>
      </div>

      <div className="w-full h-2 bg-gray-200">
        <div className="h-2 bg-teal-500" style={{ width: `${completion}%` }} />
      </div>

      <div className="w-full flex justify-center">
        <div className="w-full max-w-sm">
          <Label
            htmlFor="monthly"
            className="text-sm font-medium text-gray-700 mb-2 block"
          >
            {t("licensingSettingsPage.basePriceLabel")}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-gray-700">$</span>
            <Input
              id="monthly"
              type="number"
              min={150}
              step={1}
              value={monthlyUsd}
              onChange={(e: any) => {
                const v = String(e.target.value || "").replace(/[^0-9.]/g, "");
                setMonthlyUsd(v);
              }}
              className="border-2 border-gray-300 rounded-none"
              placeholder="150"
            />
            <span className="text-sm text-gray-600">
              {t("licensingSettingsPage.perMonth")}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t("licensingSettingsPage.minimumHint")}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={save}
          disabled={saving || loading}
          className="h-12 bg-black text-white border-2 border-black rounded-none"
        >
          {saving
            ? t("licensingSettingsPage.savingButton")
            : t("licensingSettingsPage.saveButton")}
        </Button>
      </div>
    </div>
  );
}

