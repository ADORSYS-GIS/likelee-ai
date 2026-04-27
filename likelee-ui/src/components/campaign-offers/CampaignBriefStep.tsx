import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type CampaignBrief = {
  [key: string]: any;
  reference_images: { name: string; url: string }[];
  brand_assets: { name: string; size: number; url: string }[];
};

type Props = {
  campaignBrief: CampaignBrief;
  setCampaignBrief: React.Dispatch<React.SetStateAction<CampaignBrief>>;
  onBack: () => void;
  onNext: () => void;
  onReferenceImagesUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBrandAssetsUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading?: boolean;
};

export default function CampaignBriefStep({
  campaignBrief,
  setCampaignBrief,
  onBack,
  onNext,
  onReferenceImagesUpload,
  onBrandAssetsUpload,
  uploading = false,
}: Props) {
  const { t } = useTranslation();
  const referenceInputRef = useRef<HTMLInputElement | null>(null);
  const assetInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-6">
      <div className="border-2 border-gray-200 rounded-none p-4 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          {t("campaignsDashboard.builder.brief.step1Title")}
        </h3>
        <p className="text-sm font-semibold text-gray-700">
          {t("campaignsDashboard.builder.brief.brandVoiceTone")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaigns.myOffers.voice")}
            </p>
            <Textarea
              value={campaignBrief.voice}
              onChange={(e) =>
                setCampaignBrief((prev) => ({ ...prev, voice: e.target.value }))
              }
              placeholder={t("campaignsDashboard.builder.brief.placeholders.voice")}
              className="border-2 border-gray-300 rounded-none min-h-[90px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaigns.myOffers.tone")}
            </p>
            <Textarea
              value={campaignBrief.tone}
              onChange={(e) =>
                setCampaignBrief((prev) => ({ ...prev, tone: e.target.value }))
              }
              placeholder={t("campaignsDashboard.builder.brief.placeholders.tone")}
              className="border-2 border-gray-300 rounded-none min-h-[90px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaigns.myOffers.personality")}
            </p>
            <Textarea
              value={campaignBrief.personality}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  personality: e.target.value,
                }))
              }
              placeholder={t(
                "campaignsDashboard.builder.brief.placeholders.personality",
              )}
              className="border-2 border-gray-300 rounded-none min-h-[90px]"
            />
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-700">
          {t("campaigns.myOffers.keyMessages")}
        </p>
        <Textarea
          value={campaignBrief.key_messages}
          onChange={(e) =>
            setCampaignBrief((prev) => ({
              ...prev,
              key_messages: e.target.value,
            }))
          }
          placeholder={t(
            "campaignsDashboard.builder.brief.placeholders.keyMessages",
          )}
          className="border-2 border-gray-300 rounded-none min-h-[130px]"
        />

        <p className="text-sm font-semibold text-gray-700">
          {t("campaignsDashboard.builder.brief.scriptGuidelines")}
        </p>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {t("campaignsDashboard.builder.brief.opening")}
          </p>
          <Textarea
            value={campaignBrief.script_opening}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                script_opening: e.target.value,
              }))
            }
            placeholder={t(
              "campaignsDashboard.builder.brief.placeholders.opening",
            )}
            className="border-2 border-gray-300 rounded-none min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {t("campaignsDashboard.builder.brief.middle")}
          </p>
          <Textarea
            value={campaignBrief.script_middle}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                script_middle: e.target.value,
              }))
            }
            placeholder={t(
              "campaignsDashboard.builder.brief.placeholders.middle",
            )}
            className="border-2 border-gray-300 rounded-none min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {t("campaignsDashboard.builder.brief.closing")}
          </p>
          <Textarea
            value={campaignBrief.script_closing}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                script_closing: e.target.value,
              }))
            }
            placeholder={t(
              "campaignsDashboard.builder.brief.placeholders.closing",
            )}
            className="border-2 border-gray-300 rounded-none min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.do")}
            </p>
            <Textarea
              value={campaignBrief.dos}
              onChange={(e) =>
                setCampaignBrief((prev) => ({ ...prev, dos: e.target.value }))
              }
              placeholder={t("campaignsDashboard.builder.brief.placeholders.do")}
              className="border-2 border-gray-300 rounded-none min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.dont")}
            </p>
            <Textarea
              value={campaignBrief.donts}
              onChange={(e) =>
                setCampaignBrief((prev) => ({ ...prev, donts: e.target.value }))
              }
              placeholder={t(
                "campaignsDashboard.builder.brief.placeholders.dont",
              )}
              className="border-2 border-gray-300 rounded-none min-h-[120px]"
            />
          </div>
        </div>
      </div>

      <div className="border-2 border-gray-200 rounded-none p-4 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          {t("campaignsDashboard.builder.brief.step2Title")}
        </h3>
        <p className="text-sm font-semibold text-gray-700">
          {t("campaigns.myOffers.requiredDeliverables")}
        </p>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {t("campaignsDashboard.builder.brief.enterDeliverables")}
          </p>
          <Textarea
            value={
              campaignBrief.required_deliverables ??
              [
                campaignBrief.deliverables_reels,
                campaignBrief.deliverables_hero_image,
              ]
                .map((entry) => String(entry || "").trim())
                .filter(Boolean)
                .join("\n")
            }
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                required_deliverables: e.target.value,
              }))
            }
            placeholder={t(
              "campaignsDashboard.builder.brief.placeholders.requiredDeliverables",
            )}
            className="border-2 border-gray-300 rounded-none min-h-[130px]"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {t("campaignsDashboard.builder.brief.totalExpectedDeliverables")}{" "}
            <span className="text-red-600">*</span>
          </p>
          <Input
            type="number"
            min={1}
            step={1}
            value={campaignBrief.total_expected_deliverables || ""}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                total_expected_deliverables: e.target.value,
              }))
            }
            placeholder={t(
              "campaignsDashboard.builder.brief.placeholders.totalExpectedDeliverables",
            )}
            className="border-2 border-gray-300 rounded-none"
          />
          <p className="text-xs text-gray-500">
            {t("campaignsDashboard.builder.brief.totalExpectedDeliverablesHelp")}
          </p>
        </div>

        <p className="text-sm font-semibold text-gray-700">
          {t("campaignsDashboard.builder.brief.visualStyle")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.colorPalette")}
            </p>
            <Input
              value={campaignBrief.visual_color_palette}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  visual_color_palette: e.target.value,
                }))
              }
              placeholder={t(
                "campaignsDashboard.builder.brief.placeholders.colorPalette",
              )}
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.setting")}
            </p>
            <Input
              value={campaignBrief.visual_setting}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  visual_setting: e.target.value,
                }))
              }
              placeholder={t(
                "campaignsDashboard.builder.brief.placeholders.setting",
              )}
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.framing")}
            </p>
            <Input
              value={campaignBrief.visual_framing}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  visual_framing: e.target.value,
                }))
              }
              placeholder={t(
                "campaignsDashboard.builder.brief.placeholders.framing",
              )}
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.editing")}
            </p>
            <Input
              value={campaignBrief.visual_editing}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  visual_editing: e.target.value,
                }))
              }
              placeholder={t(
                "campaignsDashboard.builder.brief.placeholders.editing",
              )}
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-700">
          {t("campaigns.myOffers.referenceImages")}
        </p>
        <div className="border-2 border-dashed border-gray-300 rounded-none p-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-2 border-gray-300 rounded-none"
              onClick={() => referenceInputRef.current?.click()}
            >
              {t("campaignsDashboard.builder.brief.chooseFiles")}
            </Button>
            <span className="text-sm text-gray-600">
              {campaignBrief.reference_images.length > 0
                ? t("campaignsDashboard.builder.brief.imagesSelected", {
                    count: campaignBrief.reference_images.length,
                  })
                : t("campaignsDashboard.builder.brief.noFilesChosen")}
            </span>
          </div>
          <input
            ref={referenceInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onReferenceImagesUpload}
            className="hidden"
          />
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            {campaignBrief.reference_images.map((img, idx) => (
              <div
                key={`${img.name}-${idx}`}
                className="border border-gray-200 p-2 bg-white"
              >
                <img
                  src={img.url}
                  alt={t("campaignsDashboard.builder.brief.styleReferenceAlt", {
                    count: idx + 1,
                  })}
                  className="w-full h-24 object-contain bg-gray-100"
                />
                <p className="text-xs text-gray-700 mt-2 truncate">
                  {t("campaignsDashboard.builder.brief.styleReference", {
                    count: idx + 1,
                  })}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-7 px-2 text-xs border-gray-300 rounded-none"
                  onClick={() =>
                    setCampaignBrief((prev) => ({
                      ...prev,
                      reference_images: prev.reference_images.filter(
                        (_: any, i: number) => i !== idx,
                      ),
                    }))
                  }
                >
                  {t("campaignsDashboard.builder.brief.remove")}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-700">
          {t("campaignsDashboard.builder.brief.deliverableExpectations")}
        </p>
        <div className="border-2 border-dashed border-gray-300 rounded-none p-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-2 border-gray-300 rounded-none"
              onClick={() => assetInputRef.current?.click()}
            >
              {t("campaignsDashboard.builder.brief.chooseFiles")}
            </Button>
            <span className="text-sm text-gray-600">
              {campaignBrief.brand_assets.length > 0
                ? t("campaignsDashboard.builder.brief.pdfsSelected", {
                    count: campaignBrief.brand_assets.length,
                  })
                : t("campaignsDashboard.builder.brief.noFilesChosen")}
            </span>
          </div>
          <input
            ref={assetInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={onBrandAssetsUpload}
            className="hidden"
          />
          <div className="mt-3 space-y-2">
            {campaignBrief.brand_assets.map((asset, idx) => (
              <div
                key={`${asset.name}-${idx}`}
                className="flex items-center justify-between gap-3"
              >
                <a
                  href={asset.url}
                  download={asset.name}
                  className="block text-sm text-blue-700 hover:underline truncate"
                >
                  {t("campaignsDashboard.builder.brief.pdfLabel", {
                    count: idx + 1,
                    name: asset.name,
                  })}
                </a>
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 px-2 text-xs border-gray-300 rounded-none"
                  onClick={() =>
                    setCampaignBrief((prev) => ({
                      ...prev,
                      brand_assets: prev.brand_assets.filter(
                        (_: any, i: number) => i !== idx,
                      ),
                    }))
                  }
                >
                  {t("campaignsDashboard.builder.brief.remove")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-2 border-gray-200 rounded-none p-4 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          {t("campaignsDashboard.builder.brief.step3Title")}
        </h3>
        <p className="text-sm font-semibold text-gray-700">
          {t("campaignsDashboard.builder.brief.campaignOverview")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.objective")}
            </p>
            <Input
              value={campaignBrief.overview_objective}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  overview_objective: e.target.value,
                }))
              }
              placeholder={t(
                "campaignsDashboard.builder.brief.placeholders.objective",
              )}
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.targetAudience")}
            </p>
            <Input
              value={campaignBrief.overview_target_audience}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  overview_target_audience: e.target.value,
                }))
              }
              placeholder={t(
                "campaignsDashboard.builder.brief.placeholders.targetAudience",
              )}
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.campaignDuration")}
            </p>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={campaignBrief.overview_campaign_duration}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  overview_campaign_duration: e.target.value,
                }))
              }
              placeholder={t(
                "campaignsDashboard.builder.brief.placeholders.campaignDuration",
              )}
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.launchDate")}
            </p>
            <Input
              type="date"
              value={campaignBrief.overview_launch_date}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  overview_launch_date: e.target.value,
                }))
              }
              placeholder="2025-02-15"
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-700">
          {t("campaignsDashboard.builder.brief.paymentTimeline")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.collaboratorPayout")}
            </p>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={campaignBrief.budget_creator_payment}
              onChange={(e) => {
                const payout = Number(e.target.value) || 0;
                const total = (payout * 1.02).toFixed(2);
                setCampaignBrief((prev) => ({
                  ...prev,
                  budget_creator_payment: e.target.value,
                  budget_total: total,
                }));
              }}
              placeholder={t(
                "campaignsDashboard.builder.brief.placeholders.collaboratorPayout",
              )}
              className="border-2 border-gray-300 rounded-none"
            />
            <p className="text-[10px] text-gray-500">
              {t("campaignsDashboard.builder.brief.collaboratorPayoutHelp")}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.offerAmount")}
            </p>
            <Input
              type="number"
              readOnly
              value={campaignBrief.budget_total}
              className="border-2 border-gray-300 rounded-none bg-gray-50 font-bold"
            />
            <p className="text-[10px] text-blue-600 font-medium">
              {t("campaignsDashboard.builder.brief.platformFeePrefix")} ($
              {(
                Number(campaignBrief.budget_total || 0) -
                Number(campaignBrief.budget_creator_payment || 0)
              ).toFixed(2)}
              ).
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("campaignsDashboard.builder.brief.submissionDeadline")}
            </p>
            <Input
              type="date"
              value={campaignBrief.budget_submission_deadline}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  budget_submission_deadline: e.target.value,
                }))
              }
              placeholder="12/20/2025"
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
        </div>
        <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">
          {t("campaignsDashboard.builder.brief.renewalTerms")}
        </p>
          <Input
            value={campaignBrief.budget_renewal_terms}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                budget_renewal_terms: e.target.value,
              }))
            }
            placeholder={t(
              "campaignsDashboard.builder.brief.placeholders.renewalTerms",
            )}
            className="border-2 border-gray-300 rounded-none"
          />
        </div>

        <p className="text-sm font-semibold text-gray-700">
          {t("campaignsDashboard.builder.brief.revisionPolicy")}
        </p>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {t("campaignsDashboard.builder.brief.includedRevisions")}
          </p>
          <Input
            value={campaignBrief.revision_included}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                revision_included: e.target.value,
              }))
            }
            placeholder={t(
              "campaignsDashboard.builder.brief.placeholders.includedRevisions",
            )}
            className="border-2 border-gray-300 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {t("campaignsDashboard.builder.brief.majorChanges")}
          </p>
          <Input
            value={campaignBrief.revision_major_changes}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                revision_major_changes: e.target.value,
              }))
            }
            placeholder={t(
              "campaignsDashboard.builder.brief.placeholders.majorChanges",
            )}
            className="border-2 border-gray-300 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {t("campaignsDashboard.builder.brief.revisionTurnaround")}
          </p>
          <Input
            value={campaignBrief.revision_turnaround}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                revision_turnaround: e.target.value,
              }))
            }
            placeholder={t(
              "campaignsDashboard.builder.brief.placeholders.revisionTurnaround",
            )}
            className="border-2 border-gray-300 rounded-none"
          />
        </div>

        <p className="text-sm font-semibold text-gray-700">
          {t("campaignsDashboard.builder.brief.approvalProcess")}
        </p>
        <Textarea
          value={campaignBrief.approval_process}
          onChange={(e) =>
            setCampaignBrief((prev) => ({
              ...prev,
              approval_process: e.target.value,
            }))
          }
          placeholder={t(
            "campaignsDashboard.builder.brief.placeholders.approvalProcess",
          )}
          className="border-2 border-gray-300 rounded-none min-h-[120px]"
        />
        <p className="text-sm font-semibold text-gray-700">
          {t("campaignsDashboard.builder.brief.watermarkProtection")}
        </p>
        <Textarea
          value={campaignBrief.watermark_protection}
          onChange={(e) =>
            setCampaignBrief((prev) => ({
              ...prev,
              watermark_protection: e.target.value,
            }))
          }
          placeholder={t(
            "campaignsDashboard.builder.brief.placeholders.watermarkProtection",
          )}
          className="border-2 border-gray-300 rounded-none min-h-[90px]"
        />
        <p className="text-sm font-semibold text-gray-700">
          {t("campaignsDashboard.builder.brief.legalTerms")}
        </p>
        <Textarea
          value={campaignBrief.legal_terms}
          onChange={(e) =>
            setCampaignBrief((prev) => ({
              ...prev,
              legal_terms: e.target.value,
            }))
          }
          placeholder={t(
            "campaignsDashboard.builder.brief.placeholders.legalTerms",
          )}
          className="border-2 border-gray-300 rounded-none min-h-[120px]"
        />
      </div>

      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-2 border-gray-300 rounded-none bg-white text-black hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("campaignsDashboard.builder.actions.back")}
        </Button>
        <Button
          onClick={onNext}
          disabled={uploading}
          className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none min-w-[100px]"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("campaignsDashboard.builder.brief.uploading")}
            </>
          ) : (
            t("campaignsDashboard.builder.actions.next")
          )}
        </Button>
      </div>
    </div>
  );
}
