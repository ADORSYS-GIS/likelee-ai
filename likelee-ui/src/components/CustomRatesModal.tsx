import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "";
const API_BASE_ABS = (() => {
  try {
    if (!API_BASE) return new URL("/", window.location.origin).toString();
    if (API_BASE.startsWith("http")) return API_BASE;
    return new URL(API_BASE, window.location.origin).toString();
  } catch {
    return new URL("/", window.location.origin).toString();
  }
})();
const api = (path: string) => new URL(path, API_BASE_ABS).toString();

interface CustomRate {
  rate_type: string;
  rate_name: string;
  price_per_week_cents: number;
}

interface CustomRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: any; // Pass the full creator object
  onSave: (rates: CustomRate[]) => void;
}

export const CustomRatesModal: React.FC<CustomRatesModalProps> = ({
  isOpen,
  onClose,
  creator,
  onSave,
}) => {
  const [rates, setRates] = useState<CustomRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && creator?.id) {
      fetchRates();
    }
  }, [isOpen, creator?.id]);

  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        api(`/api/creator-rates?user_id=${creator.id}`),
      );
      if (!response.ok) throw new Error("Failed to fetch rates");
      const data = await response.json();
      // Combine fetched rates with all possible rates for a full UI
      const allPossibleRates = getAllPossibleRates();
      const combinedRates = allPossibleRates.map((p) => {
        const existing = data.find(
          (d: CustomRate) =>
            d.rate_type === p.rate_type && d.rate_name === p.rate_name,
        );
        return existing || { ...p, price_per_week_cents: 0 };
      });
      setRates(combinedRates);
    } catch (error) {
      console.error("Error fetching custom rates:", error);
      // Initialize with default structure on error
      setRates(
        getAllPossibleRates().map((p) => ({ ...p, price_per_week_cents: 0 })),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getAllPossibleRates = () => {
    const contentRates = (creator.content_types || []).map((name: string) => ({
      rate_type: "content_type",
      rate_name: name,
      price_per_week_cents: 0,
    }));
    const industryRates = (creator.industries || []).map((name: string) => ({
      rate_type: "industry",
      rate_name: name,
      price_per_week_cents: 0,
    }));
    return [...contentRates, ...industryRates];
  };

  const handleRateChange = (index: number, value: string) => {
    const newRates = [...rates];
    newRates[index].price_per_week_cents = parseInt(value, 10) * 100 || 0;
    setRates(newRates);
  };

  const handleSave = () => {
    onSave(rates.filter((r) => r.price_per_week_cents > 0));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Custom Licensing Rates</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
          <div className="space-y-6">
            {rates.map((rate, index) => (
              <div
                key={`${rate.rate_type}-${rate.rate_name}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800">{rate.rate_name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {rate.rate_type.replace("_", " ")}
                  </p>
                </div>
                <div className="flex items-center gap-2 w-40">
                  <span className="text-gray-600">$</span>
                  <Input
                    type="number"
                    value={rate.price_per_week_cents / 100}
                    onChange={(e) => handleRateChange(index, e.target.value)}
                    className="text-right"
                    placeholder="0"
                    min="0"
                  />
                  <span className="text-sm text-gray-500">/ week</span>
                </div>
              </div>
            ))}
            {isLoading && <p>Loading rates...</p>}
            {!isLoading && rates.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Select content types and industries in 'My Rules' to set custom
                rates.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Rates</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
