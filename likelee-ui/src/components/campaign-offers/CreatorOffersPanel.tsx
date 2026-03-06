import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  StoredCreatorOffer,
  readStoredCreatorOffers,
  writeStoredCreatorOffers,
} from "./storage";

type Props = {
  creatorIdCandidates: string[];
  onStatusChange?: (offer: StoredCreatorOffer) => void;
};

export default function CreatorOffersPanel({
  creatorIdCandidates,
  onStatusChange,
}: Props) {
  const [selectedOfferBrief, setSelectedOfferBrief] =
    useState<StoredCreatorOffer | null>(null);
  const [tick, setTick] = useState(0);

  const offers = useMemo(() => {
    const ids = new Set(creatorIdCandidates.filter(Boolean));
    return readStoredCreatorOffers()
      .filter((offer) => ids.has(String(offer.creator_id || "").trim()))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [creatorIdCandidates, tick]);

  const updateOfferStatus = (
    offerId: string,
    status: "accepted" | "declined",
  ) => {
    const list = readStoredCreatorOffers();
    let updated: StoredCreatorOffer | null = null;
    const next = list.map((offer) => {
      if (offer.id !== offerId) return offer;
      updated = { ...offer, status };
      return updated;
    });
    writeStoredCreatorOffers(next);
    if (updated && onStatusChange) onStatusChange(updated);
    setTick((v) => v + 1);
  };

  return (
    <div className="space-y-4">
      {offers.length === 0 && (
        <Card className="p-6">
          <p className="text-sm text-gray-600">
            No campaign offers yet. Offers from brands will appear here.
          </p>
        </Card>
      )}

      {offers.map((offer) => (
        <Card key={offer.id} className="p-6 border border-gray-200 rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {offer.campaign_name}
              </h3>
              <p className="text-lg text-gray-600 mt-1">{offer.brand_name}</p>
            </div>
            <Badge
              className={
                offer.status === "accepted"
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : offer.status === "declined"
                    ? "bg-red-100 text-red-700 border border-red-200"
                    : "bg-blue-100 text-blue-700 border border-blue-200"
              }
            >
              {offer.status}
            </Badge>
          </div>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Campaign name:</span>
              <span className="font-semibold text-gray-900">
                {offer.campaign_name || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Creator name(s):</span>
              <span className="font-semibold text-gray-900">
                {offer.creator_name || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Category:</span>
              <span className="font-semibold text-gray-900">
                {offer.campaign_details?.category || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Budget range:</span>
              <span className="font-semibold text-gray-900">
                {offer.campaign_details?.budget_range ||
                  offer.brief?.budget_total ||
                  "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Usage scope:</span>
              <span className="font-semibold text-gray-900">
                {offer.campaign_details?.usage_scope || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Territory:</span>
              <span className="font-semibold text-gray-900">
                {offer.campaign_details?.territory || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Start date:</span>
              <span className="font-semibold text-gray-900">
                {offer.campaign_details?.start_date || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration:</span>
              <span className="font-semibold text-gray-900">
                {offer.campaign_details?.duration_days
                  ? `${offer.campaign_details.duration_days} days`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Offer:</span>
              <span className="font-semibold text-gray-900">
                {offer.offer_amount ? `$${offer.offer_amount}` : "Base rate"}
              </span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="border-2 border-gray-300"
              onClick={() => setSelectedOfferBrief(offer)}
            >
              View Brief
            </Button>
            <Button
              className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              disabled={offer.status !== "pending"}
              onClick={() => updateOfferStatus(offer.id, "accepted")}
            >
              Accept Offer
            </Button>
            <Button
              variant="destructive"
              disabled={offer.status !== "pending"}
              onClick={() => updateOfferStatus(offer.id, "declined")}
            >
              Decline Offer
            </Button>
          </div>
        </Card>
      ))}

      <Dialog
        open={!!selectedOfferBrief}
        onOpenChange={(open) => !open && setSelectedOfferBrief(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Brief</DialogTitle>
            <DialogDescription>
              Review the campaign brief before accepting or declining.
            </DialogDescription>
          </DialogHeader>
          {selectedOfferBrief && (
            <div className="space-y-4 text-sm">
              <div className="border rounded p-3">
                <p className="font-semibold text-gray-900">
                  {selectedOfferBrief.campaign_name}
                </p>
                <p className="text-gray-600">{selectedOfferBrief.brand_name}</p>
              </div>
              {Object.entries(selectedOfferBrief.brief || {}).map(([k, v]) => (
                <div key={k} className="border rounded p-3">
                  <p className="text-xs uppercase text-gray-500 font-semibold">
                    {k}
                  </p>
                  <p className="text-gray-800 mt-1 whitespace-pre-wrap">
                    {Array.isArray(v)
                      ? v
                          .map((item: any) =>
                            item?.name ? item.name : String(item),
                          )
                          .join(", ")
                      : String(v || "—")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
