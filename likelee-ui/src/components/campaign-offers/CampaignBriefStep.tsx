import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

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
};

export default function CampaignBriefStep({
  campaignBrief,
  setCampaignBrief,
  onBack,
  onNext,
  onReferenceImagesUpload,
  onBrandAssetsUpload,
}: Props) {
  const referenceInputRef = useRef<HTMLInputElement | null>(null);
  const assetInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-6">
      <div className="border-2 border-gray-200 rounded-none p-4 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          Section 1: General Dialogue & Voice Direction
        </h3>
        <p className="text-sm font-semibold text-gray-700">
          Brand Voice & Tone
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Voice</p>
            <Textarea
              value={campaignBrief.voice}
              onChange={(e) =>
                setCampaignBrief((prev) => ({ ...prev, voice: e.target.value }))
              }
              placeholder="Friendly, authentic, approachable"
              className="border-2 border-gray-300 rounded-none min-h-[90px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Tone</p>
            <Textarea
              value={campaignBrief.tone}
              onChange={(e) =>
                setCampaignBrief((prev) => ({ ...prev, tone: e.target.value }))
              }
              placeholder="Upbeat and energetic, but not over-the-top. Natural enthusiasm that feels genuine."
              className="border-2 border-gray-300 rounded-none min-h-[90px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Personality</p>
            <Textarea
              value={campaignBrief.personality}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  personality: e.target.value,
                }))
              }
              placeholder='Think "your stylish friend giving honest recommendations" rather than polished influencer.'
              className="border-2 border-gray-300 rounded-none min-h-[90px]"
            />
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-700">Key Messages</p>
        <Textarea
          value={campaignBrief.key_messages}
          onChange={(e) =>
            setCampaignBrief((prev) => ({
              ...prev,
              key_messages: e.target.value,
            }))
          }
          placeholder={
            '• "Spring collection drops next week - these pieces are incredible"\n• "Quality you can feel, style you can trust"\n• "Perfect for everyday wear or special occasions"\n• Call to action: "Shop now at urbanapparel.com"'
          }
          className="border-2 border-gray-300 rounded-none min-h-[130px]"
        />

        <p className="text-sm font-semibold text-gray-700">
          Script Guidelines (For Video/Audio)
        </p>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Opening (0-5s)</p>
          <Textarea
            value={campaignBrief.script_opening}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                script_opening: e.target.value,
              }))
            }
            placeholder='Hook viewer with energy - "You guys! I just got early access to Urban Apparel&apos;s spring line..."'
            className="border-2 border-gray-300 rounded-none min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Middle (5-20s)</p>
          <Textarea
            value={campaignBrief.script_middle}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                script_middle: e.target.value,
              }))
            }
            placeholder="Show product features, talk about quality, fit, versatility. Be specific about what you love."
            className="border-2 border-gray-300 rounded-none min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Closing (20-30s)</p>
          <Textarea
            value={campaignBrief.script_closing}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                script_closing: e.target.value,
              }))
            }
            placeholder='Clear CTA - "Link in bio to shop" or "Head to urbanapparel.com before it sells out"'
            className="border-2 border-gray-300 rounded-none min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">✓ DO:</p>
            <Textarea
              value={campaignBrief.dos}
              onChange={(e) =>
                setCampaignBrief((prev) => ({ ...prev, dos: e.target.value }))
              }
              placeholder={
                "• Be authentic and natural\n• Show product in real-life settings\n• Speak to camera directly\n• Mention brand name at least once"
              }
              className="border-2 border-gray-300 rounded-none min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">✗ DON'T:</p>
            <Textarea
              value={campaignBrief.donts}
              onChange={(e) =>
                setCampaignBrief((prev) => ({ ...prev, donts: e.target.value }))
              }
              placeholder={
                "• Use competitor brands in frame\n• Over-script - keep it natural\n• Include controversial topics\n• Disparage other brands"
              }
              className="border-2 border-gray-300 rounded-none min-h-[120px]"
            />
          </div>
        </div>
      </div>

      <div className="border-2 border-gray-200 rounded-none p-4 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          Section 2: Visual Requirements & Style Guide
        </h3>
        <p className="text-sm font-semibold text-gray-700">
          Required Deliverables
        </p>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            3x Instagram Reels (15-30 seconds each)
          </p>
          <Textarea
            value={campaignBrief.deliverables_reels}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                deliverables_reels: e.target.value,
              }))
            }
            placeholder={
              "Format: 9:16 vertical, 1080x1920, MP4\nContent: Product showcase, try-on, styling tips"
            }
            className="border-2 border-gray-300 rounded-none min-h-[90px]"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">1x Hero Image</p>
          <Textarea
            value={campaignBrief.deliverables_hero_image}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                deliverables_hero_image: e.target.value,
              }))
            }
            placeholder={
              "Format: 1920x1080, JPG/PNG, high resolution\nContent: Lifestyle shot wearing spring collection piece"
            }
            className="border-2 border-gray-300 rounded-none min-h-[90px]"
          />
        </div>

        <p className="text-sm font-semibold text-gray-700">
          Visual Style & Aesthetic
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Color Palette</p>
            <Input
              value={campaignBrief.visual_color_palette}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  visual_color_palette: e.target.value,
                }))
              }
              placeholder="Warm earth tones, natural lighting, bright but not oversaturated"
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Setting</p>
            <Input
              value={campaignBrief.visual_setting}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  visual_setting: e.target.value,
                }))
              }
              placeholder="Indoor/outdoor lifestyle settings - coffee shop, park, urban backdrop, home"
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Framing</p>
            <Input
              value={campaignBrief.visual_framing}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  visual_framing: e.target.value,
                }))
              }
              placeholder="Mix of close-ups and full-body shots. Show product clearly."
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Editing</p>
            <Input
              value={campaignBrief.visual_editing}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  visual_editing: e.target.value,
                }))
              }
              placeholder="Clean, minimal cuts. Trendy but not overly filtered. Authentic feel."
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-700">Reference Images</p>
        <div className="border-2 border-dashed border-gray-300 rounded-none p-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-2 border-gray-300 rounded-none"
              onClick={() => referenceInputRef.current?.click()}
            >
              Choose Files
            </Button>
            <span className="text-sm text-gray-600">
              {campaignBrief.reference_images.length > 0
                ? `${campaignBrief.reference_images.length} image(s) selected`
                : "No files chosen"}
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
                  alt={`Style Ref ${idx + 1}`}
                  className="w-full h-24 object-cover"
                />
                <p className="text-xs text-gray-700 mt-2 truncate">
                  Style Ref {idx + 1}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-700">
          Brand Assets Provided
        </p>
        <div className="border-2 border-dashed border-gray-300 rounded-none p-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-2 border-gray-300 rounded-none"
              onClick={() => assetInputRef.current?.click()}
            >
              Choose Files
            </Button>
            <span className="text-sm text-gray-600">
              {campaignBrief.brand_assets.length > 0
                ? `${campaignBrief.brand_assets.length} PDF(s) selected`
                : "No files chosen"}
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
              <a
                key={`${asset.name}-${idx}`}
                href={asset.url}
                download={asset.name}
                className="block text-sm text-blue-700 hover:underline"
              >
                PDF {idx + 1}: {asset.name}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-2 border-gray-200 rounded-none p-4 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          Section 3: Campaign Scope & Contract Details
        </h3>
        <p className="text-sm font-semibold text-gray-700">Campaign Overview</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Objective</p>
            <Input
              value={campaignBrief.overview_objective}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  overview_objective: e.target.value,
                }))
              }
              placeholder="Drive awareness and sales for Spring 2025 collection launch"
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Target Audience</p>
            <Input
              value={campaignBrief.overview_target_audience}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  overview_target_audience: e.target.value,
                }))
              }
              placeholder="Women 25-40, fashion-conscious, urban lifestyle"
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Campaign Duration
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
              placeholder="90"
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Launch Date</p>
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

        <p className="text-sm font-semibold text-gray-700">Budget & Timeline</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Total Budget</p>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={campaignBrief.budget_total}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  budget_total: e.target.value,
                }))
              }
              placeholder="5000"
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Creator Payment</p>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={campaignBrief.budget_creator_payment}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  budget_creator_payment: e.target.value,
                }))
              }
              placeholder="4500"
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Platform Fee</p>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={campaignBrief.budget_platform_fee}
              onChange={(e) =>
                setCampaignBrief((prev) => ({
                  ...prev,
                  budget_platform_fee: e.target.value,
                }))
              }
              placeholder="500"
              className="border-2 border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Submission Deadline
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
          <p className="text-sm font-medium text-gray-700">Renewal Terms</p>
          <Input
            value={campaignBrief.budget_renewal_terms}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                budget_renewal_terms: e.target.value,
              }))
            }
            placeholder="Auto-renewal available at end of term. Brand must notify 14 days prior if not renewing."
            className="border-2 border-gray-300 rounded-none"
          />
        </div>

        <p className="text-sm font-semibold text-gray-700">Revision Policy</p>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Included Revisions
          </p>
          <Input
            value={campaignBrief.revision_included}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                revision_included: e.target.value,
              }))
            }
            placeholder="2 rounds of minor edits (color correction, text changes, music swaps)"
            className="border-2 border-gray-300 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Major Changes</p>
          <Input
            value={campaignBrief.revision_major_changes}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                revision_major_changes: e.target.value,
              }))
            }
            placeholder="Require new brief and additional budget (e.g., re-shoot, complete re-edit)"
            className="border-2 border-gray-300 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Turnaround for Revisions
          </p>
          <Input
            value={campaignBrief.revision_turnaround}
            onChange={(e) =>
              setCampaignBrief((prev) => ({
                ...prev,
                revision_turnaround: e.target.value,
              }))
            }
            placeholder="24-48 hours depending on scope"
            className="border-2 border-gray-300 rounded-none"
          />
        </div>

        <p className="text-sm font-semibold text-gray-700">Approval Process</p>
        <Textarea
          value={campaignBrief.approval_process}
          onChange={(e) =>
            setCampaignBrief((prev) => ({
              ...prev,
              approval_process: e.target.value,
            }))
          }
          placeholder={
            "1 Creator submits deliverables to platform\n2 Brand has 48 hours to review and approve/request revisions\n3 Once approved, funds release from escrow to creator (3 business days)\n4 If no action taken, payment auto-releases after 48 hours"
          }
          className="border-2 border-gray-300 rounded-none min-h-[120px]"
        />
        <p className="text-sm font-semibold text-gray-700">
          Watermark & Protection
        </p>
        <Textarea
          value={campaignBrief.watermark_protection}
          onChange={(e) =>
            setCampaignBrief((prev) => ({
              ...prev,
              watermark_protection: e.target.value,
            }))
          }
          placeholder={
            "All delivered assets include embedded Likelee watermark for license verification and usage tracking.\nDMCA Protection: Automatic takedown notices if assets used outside approved scope."
          }
          className="border-2 border-gray-300 rounded-none min-h-[90px]"
        />
        <p className="text-sm font-semibold text-gray-700">Legal Terms</p>
        <Textarea
          value={campaignBrief.legal_terms}
          onChange={(e) =>
            setCampaignBrief((prev) => ({
              ...prev,
              legal_terms: e.target.value,
            }))
          }
          placeholder={
            "• Creator retains copyright; Brand receives usage license as specified\n• SAG-AFTRA compliant terms and fair compensation standards\n• Creator has right to approve final usage before publishing\n• Brand cannot sublicense without creator consent\n• Usage limited to approved channels, territories, and duration"
          }
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
          Back
        </Button>
        <Button
          onClick={onNext}
          className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
