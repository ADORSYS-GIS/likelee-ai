import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";
import { getAgencyPayoutsAccountStatus } from "@/api/functions";
import { RefreshCw } from "lucide-react";
import {
  Building2,
  Upload,
  Save,
  DollarSign,
  CreditCard,
  Plus,
  Edit2,
  Mail,
  Copy,
  Bell,
  User,
  FileText,
  Users,
  Globe,
  Calendar,
  MoreVertical,
  Search,
  Shield,
  History,
  Trash2,
  XCircle,
  Eye,
  EyeOff,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ensureHexColor } from "@/utils/color";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FileStorageView from "./FileStorageView";
import { getUserFriendlyError } from "@/utils/error-utils";

const InviteTeamMemberModal = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Invite Team Member
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 font-medium">
            Send an email invitation to join your agency team
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">
              Email Address
            </Label>
            <Input
              placeholder="colleague@example.com"
              className="h-11 bg-gray-50 border-gray-200 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">User Role</Label>
            <Select defaultValue="booker">
              <SelectTrigger className="h-11 bg-gray-50 border-gray-200 rounded-xl">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  Admin - Full access, billing, settings
                </SelectItem>
                <SelectItem value="booker">
                  Booker - Create/edit bookings, view earnings
                </SelectItem>
                <SelectItem value="scout">
                  Scout - Add prospects, view scouting pipeline
                </SelectItem>
                <SelectItem value="accountant">
                  Accountant - View/create invoices, reports
                </SelectItem>
                <SelectItem value="coordinator">
                  Talent Coordinator - Manage talent profiles
                </SelectItem>
                <SelectItem value="readonly">
                  Read-Only - View everything
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-xs text-indigo-700 font-medium leading-relaxed">
              <span className="font-bold">Note:</span> The invited user will
              receive an email with instructions to set up their account and
              access the dashboard with the assigned role.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-bold"
          >
            Cancel
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EditPermissionsModal = ({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: any;
}) => {
  if (!member) return null;

  const sections = [
    {
      title: "Bookings & Calendar",
      permissions: [
        { label: "Can view bookings", default: true },
        { label: "Can create bookings", default: false },
        { label: "Can edit bookings", default: false },
        { label: "Can delete bookings", default: false },
      ],
    },
    {
      title: "Finance & Invoicing",
      permissions: [
        { label: "Can view finances", default: false },
        { label: "Can create invoices", default: false },
      ],
    },
    {
      title: "Talent Roster",
      permissions: [
        { label: "Can view roster", default: true },
        { label: "Can edit talent profiles", default: false },
        { label: "Can add prospects", default: true },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-gray-900">
            Edit Permissions - {member.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 font-medium">
            Role: {member.role}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {section.title}
              </h4>
              <div className="space-y-3">
                {section.permissions.map((perm) => (
                  <div
                    key={perm.label}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {perm.label}
                    </span>
                    <Switch checked={perm.default} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="p-6 border-t border-gray-100 gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-bold"
          >
            Cancel
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 rounded-xl">
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ActivityLogModal = ({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: any;
}) => {
  if (!member) return null;

  const activities = [
    {
      action: "Created booking",
      details: "Vogue Magazine - Emma Stone",
      time: "Jan 12, 2024 10:15 AM",
      icon: Calendar,
      color: "text-blue-600 bg-blue-50",
    },
    {
      action: "Updated talent profile",
      details: "Milan Anderson - Added new headshots",
      time: "Jan 12, 2024 9:45 AM",
      icon: User,
      color: "text-purple-600 bg-purple-50",
    },
    {
      action: "Generated invoice",
      details: "Invoice #2024-089 for Nike",
      time: "Jan 11, 2024 4:30 PM",
      icon: FileText,
      color: "text-green-600 bg-green-50",
    },
    {
      action: "Added prospect",
      details: "Alex Johnson from Instagram",
      time: "Jan 11, 2024 2:20 PM",
      icon: Users,
      color: "text-orange-600 bg-orange-50",
    },
    {
      action: "Logged in",
      details: "From Chrome on Windows",
      time: "Jan 12, 2024 8:00 AM",
      icon: Globe,
      color: "text-gray-600 bg-gray-50",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-gray-900">
            Activity Log - {member.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 font-medium">
            Recent actions and system events
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
          {activities.map((activity, idx) => (
            <div
              key={idx}
              className="flex gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl"
            >
              <div
                className={`w-10 h-10 rounded-xl ${activity.color} flex items-center justify-center shrink-0`}
              >
                <activity.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {activity.action}
                </p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {activity.details}
                </p>
                <p className="text-[10px] text-gray-400 font-medium mt-1">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="p-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full font-bold rounded-xl h-11"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const GeneralSettingsView = ({ kycStatus }: { kycStatus?: string }) => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("Profile");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [defaultCommissionRate, setDefaultCommissionRate] =
    useState<number>(20);
  const [divisionCommissions, setDivisionCommissions] = useState<
    { id: string; name: string; count: number; rate: number }[]
  >([
    { id: "women", name: "Women", count: 45, rate: 20 },
    { id: "men", name: "Men", count: 32, rate: 20 },
    { id: "kids", name: "Kids", count: 18, rate: 15 },
    { id: "curve", name: "Curve", count: 12, rate: 20 },
  ]);
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(
    null,
  );
  const [divisionDraft, setDivisionDraft] = useState({
    name: "",
    count: 0,
    rate: 20,
  });
  const [isSavingCommissions, setIsSavingCommissions] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<
    {
      id?: string;
      template_key: string;
      name: string;
      subject: string;
      body: string;
      is_active: boolean;
    }[]
  >([]);
  const [isLoadingEmailTemplates, setIsLoadingEmailTemplates] = useState(false);
  const [isSavingEmailTemplates, setIsSavingEmailTemplates] = useState(false);
  const [showEmailTemplateModal, setShowEmailTemplateModal] = useState(false);
  const [editingTemplateKey, setEditingTemplateKey] = useState<string | null>(
    null,
  );
  const [emailTemplateDraft, setEmailTemplateDraft] = useState({
    name: "",
    subject: "",
    body: "",
    is_active: true,
  });
  const [primaryColor, setPrimaryColor] = useState(
    profile?.primary_color || "#4F46E5",
  );
  const [secondaryColor, setSecondaryColor] = useState(
    profile?.secondary_color || "#10B981",
  );
  const primaryColorInputRef = useRef<HTMLInputElement>(null);
  const secondaryColorInputRef = useRef<HTMLInputElement>(null);
  const [prodKey, setProdKey] = useState("pk_live_51P2x8S2e3f4g5h6i7j8k9l0m");
  const [testKey, setTestKey] = useState("pk_test_51P2x8S2e3f4g5h6i7j8k9l0m");
  const [showProdKey, setShowProdKey] = useState(false);
  const [showTestKey, setShowTestKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bankStatusLoading, setBankStatusLoading] = useState(false);
  const [bankStatus, setBankStatus] = useState<{
    connected: boolean;
    bank_last4?: string;
  } | null>(null);

  const planTier = useMemo(() => {
    const t = (profile as any)?.plan_tier;
    return typeof t === "string" && t.trim() ? t.trim().toLowerCase() : "free";
  }, [profile]);

  const planLabel = useMemo(() => {
    if (planTier === "pro") return "Pro";
    if (planTier === "basic") return "Basic";
    if (planTier === "enterprise") return "Enterprise";
    return "Free";
  }, [planTier]);

  useEffect(() => {
    if (activeTab !== "Integrations") return;
    let mounted = true;
    (async () => {
      setBankStatusLoading(true);
      try {
        const resp = await getAgencyPayoutsAccountStatus();
        const data = (resp as any)?.data ?? resp;
        if (!mounted) return;
        const last4 = String((data as any)?.bank_last4 || "").trim();
        setBankStatus({
          connected: Boolean((data as any)?.connected),
          bank_last4: last4 || undefined,
        });
      } catch {
        if (!mounted) return;
        setBankStatus(null);
      } finally {
        if (mounted) setBankStatusLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeTab]);

  const defaultNotificationPrefs = [
    {
      key: "booking_created",
      title: "Booking Created",
      desc: "When a new booking is created",
      channels: { email: true, sms: false, push: false },
    },
    {
      key: "booking_confirmed",
      title: "Booking Confirmed",
      desc: "When a booking status changes to confirmed",
      channels: { email: true, sms: false, push: false },
    },
    {
      key: "payment_received",
      title: "Payment Received",
      desc: "When payment is received from a client",
      channels: { email: true, sms: false, push: false },
    },
    {
      key: "invoice_sent",
      title: "Invoice Sent",
      desc: "When an invoice is sent to a client",
      channels: { email: true, sms: false, push: false },
    },
    {
      key: "talent_book_out",
      title: "Talent Book Out",
      desc: "When talent marks themselves unavailable",
      channels: { email: true, sms: false, push: false },
    },
    {
      key: "license_expiring",
      title: "License Expiring",
      desc: "When a talent license is about to expire",
      channels: { email: true, sms: false, push: false },
    },
  ] as {
    key: string;
    title: string;
    desc: string;
    channels: { email: boolean; sms: boolean; push: boolean };
  }[];

  const [notificationPrefs, setNotificationPrefs] = useState(
    defaultNotificationPrefs,
  );
  const [notificationRecipients, setNotificationRecipients] = useState({
    primaryEmail: "",
    smsNumber: "",
    additionalEmails: "",
  });
  const [isSavingNotificationSettings, setIsSavingNotificationSettings] =
    useState(false);

  const [taxCurrencySettings, setTaxCurrencySettings] = useState({
    defaultCurrency: "usd",
    currencyDisplayFormat: "1234.56",
    defaultTaxRatePct: "8.875",
    taxDisplayName: "Sales Tax",
    includeTaxInDisplayedPrices: true,
    defaultPaymentTerms: "net30",
    latePaymentFeePct: "1.5",
    invoicePrefix: "INV-",
  });
  const [isSavingTaxCurrencySettings, setIsSavingTaxCurrencySettings] =
    useState(false);

  const [formData, setFormData] = useState({
    agency_name: "",
    legal_entity_name: "",
    address: "",
    city: "",
    state: "",
    zip_postal_code: "",
    country: "us",
    time_zone: "est",
    phone_number: "",
    email: "",
    website: "",
    tax_id_ein: "",
    email_signature: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        agency_name: profile.agency_name || "",
        legal_entity_name: profile.legal_entity_name || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zip_postal_code: profile.zip_postal_code || "",
        country: profile.country || "us",
        time_zone: profile.time_zone || "est",
        phone_number: profile.phone_number || "",
        email: profile.email || "",
        website: profile.website || "",
        tax_id_ein: profile.tax_id_ein || "",
        email_signature: profile.email_signature || "",
      });
      setPrimaryColor(profile.primary_color || "#4F46E5");
      setSecondaryColor(profile.secondary_color || "#10B981");

      (async () => {
        try {
          const { data, error } = await supabase
            .from("agency_commission_settings")
            .select("default_commission_bps, division_commissions")
            .eq("agency_id", profile.id)
            .maybeSingle();

          if (error) throw error;
          if (!data) return;

          if (typeof data.default_commission_bps === "number") {
            setDefaultCommissionRate(
              Math.max(0, Math.min(100, data.default_commission_bps / 100)),
            );
          }

          if (Array.isArray(data.division_commissions)) {
            const parsed = data.division_commissions
              .map((row: any) => {
                const id = String(row?.id || "");
                const name = String(row?.name || "");
                const count = Number.isFinite(row?.count)
                  ? Math.max(0, Math.floor(row.count))
                  : 0;
                const rateBps = Number.isFinite(row?.rate_bps)
                  ? Math.max(0, Math.min(10000, Math.floor(row.rate_bps)))
                  : null;
                const ratePct =
                  rateBps !== null
                    ? Math.max(0, Math.min(100, rateBps / 100))
                    : null;
                if (!id || !name) return null;
                return {
                  id,
                  name,
                  count,
                  rate: ratePct !== null ? ratePct : defaultCommissionRate,
                };
              })
              .filter(Boolean);
            setDivisionCommissions(parsed as any);
          }
        } catch (e: any) {
          toast({
            title: "Failed to load commission settings",
            description: getUserFriendlyError(e),
            variant: "destructive",
          });
        }
      })();

      (async () => {
        try {
          const { data, error } = await supabase
            .from("agency_notification_settings")
            .select("prefs, recipients")
            .eq("agency_id", profile.id)
            .maybeSingle();
          if (error) throw error;

          if (!data) {
            const seedPayload = {
              agency_id: profile.id,
              prefs: defaultNotificationPrefs,
              recipients: {
                primaryEmail: profile.email || "",
                smsNumber: "",
                additionalEmails: "",
              },
              updated_at: new Date().toISOString(),
            };
            const { error: seedError } = await supabase
              .from("agency_notification_settings")
              .upsert(seedPayload, { onConflict: "agency_id" });
            if (seedError) throw seedError;
            setNotificationPrefs(defaultNotificationPrefs);
            setNotificationRecipients(seedPayload.recipients);
            return;
          }

          const prefs = Array.isArray((data as any)?.prefs)
            ? (data as any).prefs
            : null;
          const recipientsObj =
            (data as any)?.recipients &&
            typeof (data as any).recipients === "object"
              ? (data as any).recipients
              : null;

          if (prefs) {
            const normalized = defaultNotificationPrefs.map((d) => {
              const found = prefs.find((p: any) => String(p?.key) === d.key);
              const ch = found?.channels || {};
              return {
                ...d,
                channels: {
                  email:
                    typeof ch.email === "boolean" ? ch.email : d.channels.email,
                  sms: false,
                  push: false,
                },
              };
            });
            setNotificationPrefs(normalized);
          } else {
            setNotificationPrefs(defaultNotificationPrefs);
          }

          setNotificationRecipients({
            primaryEmail:
              typeof recipientsObj?.primaryEmail === "string"
                ? recipientsObj.primaryEmail
                : profile.email || "",
            smsNumber:
              typeof recipientsObj?.smsNumber === "string"
                ? recipientsObj.smsNumber
                : "",
            additionalEmails:
              typeof recipientsObj?.additionalEmails === "string"
                ? recipientsObj.additionalEmails
                : "",
          });
        } catch (e: any) {
          setNotificationPrefs(defaultNotificationPrefs);
          setNotificationRecipients({
            primaryEmail: profile.email || "",
            smsNumber: "",
            additionalEmails: "",
          });
          toast({
            title: "Failed to load notification settings",
            description: getUserFriendlyError(e),
            variant: "destructive",
          });
        }
      })();

      (async () => {
        try {
          const { data, error } = await supabase
            .from("agency_tax_currency_settings")
            .select(
              "default_currency, currency_display_format, default_tax_rate, tax_display_name, include_tax_in_displayed_prices, default_payment_terms, late_payment_fee, invoice_prefix",
            )
            .eq("agency_id", profile.id)
            .maybeSingle();
          if (error) throw error;

          if (!data) {
            const seedPayload = {
              agency_id: profile.id,
              default_currency: taxCurrencySettings.defaultCurrency,
              currency_display_format:
                taxCurrencySettings.currencyDisplayFormat,
              default_tax_rate: Number(
                String(taxCurrencySettings.defaultTaxRatePct || "0").replace(
                  /,/g,
                  ".",
                ),
              ),
              tax_display_name: taxCurrencySettings.taxDisplayName,
              include_tax_in_displayed_prices:
                !!taxCurrencySettings.includeTaxInDisplayedPrices,
              default_payment_terms: taxCurrencySettings.defaultPaymentTerms,
              late_payment_fee: Number(
                String(taxCurrencySettings.latePaymentFeePct || "0").replace(
                  /,/g,
                  ".",
                ),
              ),
              invoice_prefix: taxCurrencySettings.invoicePrefix,
              updated_at: new Date().toISOString(),
            };
            const { error: seedError } = await supabase
              .from("agency_tax_currency_settings")
              .upsert(seedPayload, { onConflict: "agency_id" });
            if (seedError) throw seedError;
            return;
          }

          const d: any = data;
          setTaxCurrencySettings((prev) => ({
            ...prev,
            defaultCurrency:
              typeof d.default_currency === "string"
                ? d.default_currency
                : prev.defaultCurrency,
            currencyDisplayFormat:
              typeof d.currency_display_format === "string"
                ? d.currency_display_format
                : prev.currencyDisplayFormat,
            defaultTaxRatePct:
              typeof d.default_tax_rate === "number" ||
              typeof d.default_tax_rate === "string"
                ? String(d.default_tax_rate)
                : prev.defaultTaxRatePct,
            taxDisplayName:
              typeof d.tax_display_name === "string"
                ? d.tax_display_name
                : prev.taxDisplayName,
            includeTaxInDisplayedPrices:
              typeof d.include_tax_in_displayed_prices === "boolean"
                ? d.include_tax_in_displayed_prices
                : prev.includeTaxInDisplayedPrices,
            defaultPaymentTerms:
              typeof d.default_payment_terms === "string"
                ? d.default_payment_terms
                : prev.defaultPaymentTerms,
            latePaymentFeePct:
              typeof d.late_payment_fee === "number" ||
              typeof d.late_payment_fee === "string"
                ? String(d.late_payment_fee)
                : prev.latePaymentFeePct,
            invoicePrefix:
              typeof d.invoice_prefix === "string"
                ? d.invoice_prefix
                : prev.invoicePrefix,
          }));
        } catch (e: any) {
          toast({
            title: "Failed to load tax & currency settings",
            description: getUserFriendlyError(e),
            variant: "destructive",
          });
        }
      })();

      (async () => {
        try {
          setIsLoadingEmailTemplates(true);
          const { data, error } = await supabase
            .from("agency_email_templates")
            .select("id, template_key, name, subject, body, is_active")
            .eq("agency_id", profile.id)
            .order("updated_at", { ascending: false });

          if (error) throw error;

          if (Array.isArray(data) && data.length > 0) {
            const mapped = data.map((t: any) => ({
              id: t.id,
              template_key: t.template_key,
              name: t.name,
              subject: t.subject,
              body: t.body,
              is_active: !!t.is_active,
            }));
            const order = new Map<string, number>([
              ["booking_confirmation", 1],
              ["invoice_email", 2],
              ["payment_reminder", 3],
            ]);
            mapped.sort((a, b) => {
              const aKey = String(a.template_key || "");
              const bKey = String(b.template_key || "");
              const aRank = order.get(aKey) ?? 99;
              const bRank = order.get(bKey) ?? 99;
              if (aRank !== bRank) return aRank - bRank;
              return aKey.localeCompare(bKey);
            });
            setEmailTemplates(mapped);
            return;
          }

          const defaults = [
            {
              template_key: "booking_confirmation",
              name: "Booking Confirmation",
              subject: "Booking Confirmed - {client_name}",
              body: "Hi {talent_name},\n\nYour booking with {client_name} on {booking_date} at {call_time} has been confirmed.\n\nLocation: {location}\nRate: {rate}\n\nBest regards,\n{agency_name}",
              is_active: true,
            },
            {
              template_key: "invoice_email",
              name: "Invoice Email",
              subject: "Invoice {invoice_number} from {agency_name}",
              body: "Dear {client_name},\n\nPlease find attached invoice {invoice_number} for the amount of {invoice_total}.\n\nPayment terms: {payment_terms}\n\nThank you for your business.\n\n{agency_name}",
              is_active: true,
            },
            {
              template_key: "payment_reminder",
              name: "Payment Reminder",
              subject: "Payment Reminder - Invoice {invoice_number}",
              body: "Dear {client_name},\n\nThis is a friendly reminder that invoice {invoice_number} for {invoice_total} is due on {due_date}.\n\nIf you have already made the payment, please disregard this message.\n\nThank you,\n{agency_name}",
              is_active: true,
            },
          ];

          const seedPayload = defaults.map((t) => ({
            agency_id: profile.id,
            template_key: t.template_key,
            name: t.name,
            subject: t.subject,
            body: t.body,
            is_active: t.is_active,
            updated_at: new Date().toISOString(),
          }));

          const { error: seedError } = await supabase
            .from("agency_email_templates")
            .upsert(seedPayload, { onConflict: "agency_id,template_key" });

          if (seedError) throw seedError;
          setEmailTemplates(defaults);
        } catch (e: any) {
          toast({
            title: "Failed to load email templates",
            description: getUserFriendlyError(e),
            variant: "destructive",
          });
        } finally {
          setIsLoadingEmailTemplates(false);
        }
      })();
    }
  }, [profile]);

  const saveNotificationSettings = async () => {
    setIsSavingNotificationSettings(true);
    try {
      const payload = {
        agency_id: profile?.id,
        prefs: notificationPrefs,
        recipients: notificationRecipients,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("agency_notification_settings")
        .upsert(payload, { onConflict: "agency_id" });

      if (error) throw error;
      toast({
        title: "Notification settings saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to save notification settings",
        description: getUserFriendlyError(e),
        variant: "destructive" as any,
      });
    } finally {
      setIsSavingNotificationSettings(false);
    }
  };

  const persistDivisionCommissions = async (
    nextDivisions: { id: string; name: string; count: number; rate: number }[],
  ) => {
    if (!profile?.id) return;
    try {
      setIsSavingCommissions(true);
      const payload = {
        agency_id: profile.id,
        default_commission_bps: Math.round(
          Math.max(0, Math.min(100, defaultCommissionRate)) * 100,
        ),
        division_commissions: nextDivisions.map((d) => ({
          id: d.id,
          name: d.name,
          count: d.count,
          rate_bps: Math.round(Math.max(0, Math.min(100, d.rate)) * 100),
        })),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("agency_commission_settings")
        .upsert(payload, { onConflict: "agency_id" });
      if (error) throw error;
    } catch (e: any) {
      toast({
        title: "Failed to save division settings",
        description: getUserFriendlyError(e),
        variant: "destructive",
      });
    } finally {
      setIsSavingCommissions(false);
    }
  };

  const saveTaxCurrencySettings = async () => {
    setIsSavingTaxCurrencySettings(true);
    try {
      const defaultTaxRate = Number(
        String(taxCurrencySettings.defaultTaxRatePct || "0").replace(/,/g, "."),
      );
      const latePaymentFee = Number(
        String(taxCurrencySettings.latePaymentFeePct || "0").replace(/,/g, "."),
      );

      const payload = {
        agency_id: profile?.id,
        default_currency: taxCurrencySettings.defaultCurrency,
        currency_display_format: taxCurrencySettings.currencyDisplayFormat,
        default_tax_rate: Number.isFinite(defaultTaxRate) ? defaultTaxRate : 0,
        tax_display_name: taxCurrencySettings.taxDisplayName,
        include_tax_in_displayed_prices:
          !!taxCurrencySettings.includeTaxInDisplayedPrices,
        default_payment_terms: taxCurrencySettings.defaultPaymentTerms,
        late_payment_fee: Number.isFinite(latePaymentFee) ? latePaymentFee : 0,
        invoice_prefix: taxCurrencySettings.invoicePrefix,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("agency_tax_currency_settings")
        .upsert(payload, { onConflict: "agency_id" });

      if (error) throw error;
      toast({
        title: "Tax & currency settings saved",
        description: "Your settings have been updated.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to save tax & currency settings",
        description: getUserFriendlyError(e),
        variant: "destructive" as any,
      });
    } finally {
      setIsSavingTaxCurrencySettings(false);
    }
  };

  const openNewEmailTemplate = () => {
    setEditingTemplateKey(null);
    setEmailTemplateDraft({
      name: "",
      subject: "",
      body: "",
      is_active: true,
    });
    setShowEmailTemplateModal(true);
  };

  const openEditEmailTemplate = (template: {
    template_key: string;
    name: string;
    subject: string;
    body: string;
    is_active: boolean;
  }) => {
    setEditingTemplateKey(template.template_key);
    setEmailTemplateDraft({
      name: template.name,
      subject: template.subject,
      body: template.body,
      is_active: template.is_active,
    });
    setShowEmailTemplateModal(true);
  };

  const duplicateEmailTemplate = (template: {
    template_key: string;
    name: string;
    subject: string;
    body: string;
    is_active: boolean;
  }) => {
    const suffix = Math.random().toString(16).slice(2, 8);
    const template_key = `${template.template_key}_${suffix}`;
    setEmailTemplates((prev) => [
      {
        template_key,
        name: `${template.name} (Copy)`,
        subject: template.subject,
        body: template.body,
        is_active: template.is_active,
      },
      ...prev,
    ]);
  };

  const saveEmailTemplateDraft = () => {
    const name = (emailTemplateDraft.name || "").trim();
    const subject = (emailTemplateDraft.subject || "").trim();
    const body = (emailTemplateDraft.body || "").trim();
    if (!name || !subject || !body) {
      toast({
        title: "Missing fields",
        description: "Please fill in name, subject, and body.",
        variant: "destructive",
      });
      return;
    }

    setEmailTemplates((prev) => {
      if (editingTemplateKey) {
        return prev.map((t) =>
          t.template_key === editingTemplateKey
            ? {
                ...t,
                name,
                subject,
                body,
                is_active: emailTemplateDraft.is_active,
              }
            : t,
        );
      }
      const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 32);
      const template_key = `${base}_${Math.random().toString(16).slice(2, 8)}`;
      return [
        {
          template_key,
          name,
          subject,
          body,
          is_active: emailTemplateDraft.is_active,
        },
        ...prev,
      ];
    });

    setShowEmailTemplateModal(false);
  };

  const handleSaveEmailTemplates = async () => {
    if (!profile?.id) return;
    try {
      setIsSavingEmailTemplates(true);
      const payload = emailTemplates.map((t) => ({
        id: t.id,
        agency_id: profile.id,
        template_key: t.template_key,
        name: t.name,
        subject: t.subject,
        body: t.body,
        is_active: t.is_active,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("agency_email_templates")
        .upsert(payload, { onConflict: "agency_id,template_key" });

      if (error) throw error;
      toast({
        title: "Email templates saved",
        description: "Your email templates have been saved.",
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: getUserFriendlyError(e),
        variant: "destructive",
      });
    } finally {
      setIsSavingEmailTemplates(false);
    }
  };

  const openAddDivision = () => {
    setEditingDivisionId(null);
    setDivisionDraft({ name: "", count: 0, rate: defaultCommissionRate });
    setShowDivisionModal(true);
  };

  const openEditDivision = (division: {
    id: string;
    name: string;
    count: number;
    rate: number;
  }) => {
    setEditingDivisionId(division.id);
    setDivisionDraft({
      name: division.name,
      count: division.count,
      rate: division.rate,
    });
    setShowDivisionModal(true);
  };

  const saveDivision = () => {
    const name = (divisionDraft.name || "").trim();
    const count = Number.isFinite(divisionDraft.count)
      ? Math.max(0, Math.floor(divisionDraft.count))
      : 0;
    const rate = Number.isFinite(divisionDraft.rate)
      ? Math.max(0, Math.min(100, divisionDraft.rate))
      : defaultCommissionRate;

    if (!name) {
      toast({
        title: "Missing division name",
        description: "Please enter a division name.",
        variant: "destructive",
      });
      return;
    }

    setDivisionCommissions((prev) => {
      let next: { id: string; name: string; count: number; rate: number }[];
      if (editingDivisionId) {
        next = prev.map((d) =>
          d.id === editingDivisionId ? { ...d, name, count, rate } : d,
        );
      } else {
        const idBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const id = `${idBase}-${Math.random().toString(16).slice(2)}`;
        next = [...prev, { id, name, count, rate }];
      }
      void persistDivisionCommissions(next);
      return next;
    });

    setShowDivisionModal(false);
  };

  const removeDivision = (id: string) => {
    setDivisionCommissions((prev) => {
      const next = prev.filter((d) => d.id !== id);
      void persistDivisionCommissions(next);
      return next;
    });
  };

  const handleSaveCommissionSettings = async () => {
    if (!profile?.id) return;
    try {
      setIsSavingCommissions(true);

      const payload = {
        agency_id: profile.id,
        default_commission_bps: Math.round(
          Math.max(0, Math.min(100, defaultCommissionRate)) * 100,
        ),
        division_commissions: divisionCommissions.map((d) => ({
          id: d.id,
          name: d.name,
          count: d.count,
          rate_bps: Math.round(Math.max(0, Math.min(100, d.rate)) * 100),
        })),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("agency_commission_settings")
        .upsert(payload, { onConflict: "agency_id" });

      if (error) throw error;

      toast({
        title: "Commission settings saved",
        description: "Your commission settings have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    } finally {
      setIsSavingCommissions(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("agencies")
        .update({
          ...formData,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile?.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: "Settings Saved",
        description: "Your agency profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `agency-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("likelee-public")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("likelee-public").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("agencies")
        .update({ logo_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({
        title: "Logo Updated",
        description: "Your agency logo has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-full mx-auto">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Agency Settings
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium">
            Configure your agency profile and preferences
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-gray-100/50 rounded-xl w-full overflow-x-auto no-scrollbar lg:w-fit">
          {[
            "Profile",
            "Commissions",
            "Email Templates",
            "Notifications",
            "Tax & Currency",
            "Divisions",
            "Team",
            "File Storage",
            "Integrations",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Profile" && (
          <div className="space-y-6">
            <Card
              className={`p-4 sm:p-6 border shadow-sm rounded-2xl transition-all duration-300 ${
                planTier === "pro"
                  ? "bg-[#0F1225] border-indigo-500/30 text-white"
                  : planTier === "basic" || planTier === "agency"
                    ? "bg-emerald-50 border-emerald-100 text-gray-900"
                    : planTier === "enterprise"
                      ? "bg-amber-50 border-amber-200 text-gray-900"
                      : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div
                    className={`text-[11px] font-black uppercase tracking-[0.3em] ${
                      planTier === "pro" ? "text-indigo-300" : "text-gray-400"
                    }`}
                  >
                    Current Plan
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className={`text-xl font-black ${
                        planTier === "pro" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {planLabel}
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-black uppercase tracking-wider px-2 py-0.5 text-[10px] border-none ${
                        planTier === "pro"
                          ? "bg-indigo-500 text-white"
                          : planTier === "basic" || planTier === "agency"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : planTier === "enterprise"
                              ? "bg-amber-500 text-white shadow-sm"
                              : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {planTier}
                    </Badge>
                  </div>
                </div>
                <Button
                  asChild
                  variant={
                    planTier === "pro" ||
                    planTier === "basic" ||
                    planTier === "enterprise"
                      ? "default"
                      : "outline"
                  }
                  className={`rounded-xl font-bold ${
                    planTier === "pro"
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-500/20"
                      : planTier === "basic" || planTier === "agency"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg shadow-emerald-500/20"
                        : planTier === "enterprise"
                          ? "bg-amber-600 hover:bg-amber-700 text-white border-none shadow-lg shadow-amber-500/20"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <a href={createPageUrl("AgencySubscribe")}>
                    Billing & Subscription
                  </a>
                </Button>
              </div>
            </Card>

            {/* Agency Information */}
            {/* Agency Information */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                    Agency Information
                  </h3>
                  {(kycStatus === "approved" ||
                    kycStatus === "verified" ||
                    kycStatus === "active") && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full border border-green-100 shadow-sm animate-in fade-in zoom-in-95 duration-500">
                      <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
                        Verified
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Agency Name *
                  </Label>
                  <Input
                    value={formData.agency_name}
                    onChange={(e) =>
                      handleInputChange("agency_name", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Legal Entity Name
                  </Label>
                  <Input
                    value={formData.legal_entity_name}
                    onChange={(e) =>
                      handleInputChange("legal_entity_name", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Address
                  </Label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    City
                  </Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      State/Province
                    </Label>
                    <Input
                      value={formData.state}
                      onChange={(e) =>
                        handleInputChange("state", e.target.value)
                      }
                      className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      ZIP/Postal Code
                    </Label>
                    <Input
                      value={formData.zip_postal_code}
                      onChange={(e) =>
                        handleInputChange("zip_postal_code", e.target.value)
                      }
                      className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Country
                  </Label>
                  <Select
                    value={formData.country}
                    onValueChange={(val) => handleInputChange("country", val)}
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                      <SelectItem value="de">Germany</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Time Zone
                  </Label>
                  <Select
                    value={formData.time_zone}
                    onValueChange={(val) => handleInputChange("time_zone", val)}
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="est">Eastern Time (EST)</SelectItem>
                      <SelectItem value="cst">Central Time (CST)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Phone
                  </Label>
                  <Input
                    value={formData.phone_number}
                    onChange={(e) =>
                      handleInputChange("phone_number", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Email
                  </Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Website
                  </Label>
                  <Input
                    value={formData.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Tax ID / EIN
                  </Label>
                  <Input
                    value={formData.tax_id_ein}
                    onChange={(e) =>
                      handleInputChange("tax_id_ein", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
              </div>
            </Card>

            {/* Branding */}
            {/* Branding */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                Branding
              </h3>
              <div className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-sm font-bold text-gray-900">
                    Agency Logo
                  </Label>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm overflow-hidden p-2">
                      {profile?.logo_url ? (
                        <img
                          src={profile.logo_url}
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-indigo-600" />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      className="hidden"
                      accept="image/*"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                    >
                      {isUploading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isUploading ? "Uploading..." : "Upload New Logo"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-3 sm:space-y-4">
                    <Label className="text-xs sm:text-sm font-bold text-gray-900">
                      Primary Brand Color
                    </Label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-gray-200 shadow-sm shrink-0 overflow-hidden">
                        <input
                          type="color"
                          value={ensureHexColor(primaryColor, "#4F46E5")}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 w-full h-full cursor-pointer"
                          style={{
                            opacity: 0,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                          }}
                        />
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ backgroundColor: primaryColor }}
                        />
                      </div>
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="bg-white border-gray-200 h-9 sm:h-11 text-gray-500 font-medium rounded-xl flex-1 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <Label className="text-xs sm:text-sm font-bold text-gray-900">
                      Secondary Brand Color
                    </Label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-gray-200 shadow-sm shrink-0 overflow-hidden">
                        <input
                          type="color"
                          value={ensureHexColor(secondaryColor, "#10B981")}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="absolute inset-0 w-full h-full cursor-pointer"
                          style={{
                            opacity: 0,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                          }}
                        />
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ backgroundColor: secondaryColor }}
                        />
                      </div>
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="bg-white border-gray-200 h-9 sm:h-11 text-gray-500 font-medium rounded-xl flex-1 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Email Signature
                  </Label>
                  <Textarea
                    value={formData.email_signature}
                    onChange={(e) =>
                      handleInputChange("email_signature", e.target.value)
                    }
                    placeholder={`Best regards,\nAgency Name\nhttps://agency.com/\n+1 (212) 555-0123`}
                    className="bg-white border-gray-200 min-h-[120px] text-xs sm:text-sm text-gray-900 font-medium rounded-xl resize-none"
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSaving ? "Saving..." : "Save Profile Settings"}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Commissions" && (
          <div className="space-y-6">
            {/* Default Commission Rate */}
            {/* Default Commission Rate */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  Default Commission Rate
                </h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Agency Commission (%)
                  </Label>
                  <Input
                    value={String(defaultCommissionRate)}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      if (!Number.isFinite(n)) {
                        setDefaultCommissionRate(0);
                        return;
                      }
                      setDefaultCommissionRate(Math.max(0, Math.min(100, n)));
                    }}
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    Applied to all bookings unless overridden
                  </p>
                </div>
              </div>
            </Card>

            {/* Division Commissions */}
            {/* Division Commissions */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  Division Commissions
                </h3>
                <Button
                  variant="outline"
                  onClick={openAddDivision}
                  className="h-8 px-3 sm:h-9 sm:px-4 rounded-lg border-gray-200 font-bold text-xs flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Division
                </Button>
              </div>
              <div className="space-y-4">
                {divisionCommissions.map((division) => (
                  <div
                    key={division.id}
                    className="flex items-center justify-between gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {division.name}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {division.count} talent
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Input
                          value={String(division.rate)}
                          onChange={(e) => {
                            const next = parseFloat(e.target.value);
                            const clamped = Number.isFinite(next)
                              ? Math.max(0, Math.min(100, next))
                              : 0;
                            setDivisionCommissions((prev) =>
                              prev.map((d) =>
                                d.id === division.id
                                  ? { ...d, rate: clamped }
                                  : d,
                              ),
                            );
                          }}
                          className="w-10 h-7 sm:w-12 sm:h-8 bg-white border-gray-200 text-center font-bold text-xs rounded-lg"
                        />
                        <span className="text-xs font-bold text-gray-500">
                          %
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-gray-400 hover:text-indigo-600"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDivision(division)}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => removeDivision(division.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Per-Talent Custom Commissions */}
            {/* Per-Talent Custom Commissions */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">
                Per-Talent Custom Commissions
              </h3>
              <p className="text-sm text-gray-500 font-medium mb-8">
                Override commission rates for specific talent (edit from talent
                profile)
              </p>
              <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-500">
                  No custom commission rates set
                </p>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveCommissionSettings}
                disabled={isSavingCommissions}
                className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {isSavingCommissions ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSavingCommissions ? "Saving..." : "Save Commission Settings"}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Email Templates" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                      Email Templates
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      Customize automated email messages
                    </p>
                  </div>
                </div>
                <Button
                  onClick={openNewEmailTemplate}
                  className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  New Template
                </Button>
              </div>

              <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl mb-8">
                <h4 className="text-sm font-bold text-blue-900 mb-4">
                  Available Variables:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-y-3 gap-x-8">
                  {[
                    "{talent_name}",
                    "{client_name}",
                    "{booking_date}",
                    "{call_time}",
                    "{location}",
                    "{rate}",
                    "{invoice_number}",
                    "{invoice_total}",
                    "{payment_terms}",
                    "{due_date}",
                    "{agency_name}",
                  ].map((variable) => (
                    <code
                      key={variable}
                      className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded border border-blue-100 w-fit"
                    >
                      {variable}
                    </code>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {isLoadingEmailTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
                  </div>
                ) : (
                  emailTemplates.map((template) => (
                    <div
                      key={template.template_key}
                      className="p-4 sm:p-6 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                            {template.name}
                          </h4>
                          <Badge
                            className={`border font-bold text-[10px] h-5 shrink-0 ${template.is_active ? "bg-green-50 text-green-600 border-green-100" : "bg-gray-100 text-gray-600 border-gray-200"}`}
                          >
                            {template.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 rounded-lg border-gray-200"
                            onClick={() =>
                              openEditEmailTemplate(template as any)
                            }
                          >
                            <Edit2 className="w-3 h-3 text-gray-500" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 rounded-lg border-gray-200"
                            onClick={() =>
                              duplicateEmailTemplate(template as any)
                            }
                          >
                            <Copy className="w-3 h-3 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Subject:
                        </Label>
                        <p className="text-sm font-bold text-gray-900">
                          {template.subject}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Body:
                        </Label>
                        <div className="p-6 bg-gray-100 border border-gray-200 rounded-xl text-base text-gray-700 font-medium whitespace-pre-line leading-relaxed min-h-[150px]">
                          {template.body}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveEmailTemplates}
                disabled={isSavingEmailTemplates}
                className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {isSavingEmailTemplates ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSavingEmailTemplates ? "Saving..." : "Save Email Templates"}
              </Button>
            </div>

            <Dialog
              open={showEmailTemplateModal}
              onOpenChange={setShowEmailTemplateModal}
            >
              <DialogContent className="max-w-2xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    {editingTemplateKey ? "Edit Template" : "New Template"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      Template Name
                    </Label>
                    <Input
                      value={emailTemplateDraft.name}
                      onChange={(e) =>
                        setEmailTemplateDraft((p) => ({
                          ...p,
                          name: e.target.value,
                        }))
                      }
                      className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      Subject
                    </Label>
                    <Input
                      value={emailTemplateDraft.subject}
                      onChange={(e) =>
                        setEmailTemplateDraft((p) => ({
                          ...p,
                          subject: e.target.value,
                        }))
                      }
                      className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      Body
                    </Label>
                    <Textarea
                      value={emailTemplateDraft.body}
                      onChange={(e) =>
                        setEmailTemplateDraft((p) => ({
                          ...p,
                          body: e.target.value,
                        }))
                      }
                      className="bg-gray-50 border-gray-200 min-h-[200px] text-sm text-gray-900 font-medium rounded-xl resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Active</p>
                      <p className="text-xs text-gray-500 font-medium">
                        Enable this template for automated emails
                      </p>
                    </div>
                    <Switch
                      checked={emailTemplateDraft.is_active}
                      onCheckedChange={(checked) =>
                        setEmailTemplateDraft((p) => ({
                          ...p,
                          is_active: !!checked,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="ghost"
                    onClick={() => setShowEmailTemplateModal(false)}
                    className="font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEmailTemplateDraft}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl"
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {activeTab === "Notifications" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                    Notification Preferences
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">
                    Choose how you want to be notified about important events
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {notificationPrefs.map((pref) => (
                  <div
                    key={pref.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">
                        {pref.title}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {pref.desc}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <Switch
                          checked={pref.channels.email}
                          onCheckedChange={(checked) =>
                            setNotificationPrefs((prev) =>
                              prev.map((p) =>
                                p.key === pref.key
                                  ? {
                                      ...p,
                                      channels: {
                                        ...p.channels,
                                        email: !!checked,
                                      },
                                    }
                                  : p,
                              ),
                            )
                          }
                        />
                        <span className="text-xs font-bold text-gray-900">
                          Email
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <Switch checked={false} disabled />
                        <span className="text-xs font-bold text-gray-900 opacity-60">
                          SMS
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 opacity-80">
                          Coming Soon
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <Switch checked={false} disabled />
                        <span className="text-xs font-bold text-gray-900 opacity-60">
                          Push
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 opacity-80">
                          Coming Soon
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                Notification Recipients
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Primary Notification Email
                  </Label>
                  <Input
                    value={notificationRecipients.primaryEmail}
                    onChange={(e) =>
                      setNotificationRecipients((p) => ({
                        ...p,
                        primaryEmail: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-500 font-medium rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    SMS Notification Number
                  </Label>
                  <Input
                    value={notificationRecipients.smsNumber}
                    onChange={(e) =>
                      setNotificationRecipients((p) => ({
                        ...p,
                        smsNumber: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-500 font-medium rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Additional Recipients (comma-separated)
                  </Label>
                  <Input
                    value={notificationRecipients.additionalEmails}
                    onChange={(e) =>
                      setNotificationRecipients((p) => ({
                        ...p,
                        additionalEmails: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-500 font-medium rounded-xl"
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={saveNotificationSettings}
                disabled={isSavingNotificationSettings}
                className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Notification Settings
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Tax & Currency" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  Currency Settings
                </h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Default Currency
                  </Label>
                  <Select
                    value={taxCurrencySettings.defaultCurrency}
                    onValueChange={(v) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        defaultCurrency: v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                      <SelectItem value="eur">EUR - Euro</SelectItem>
                      <SelectItem value="gbp">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Currency Display Format
                  </Label>
                  <Select
                    value={taxCurrencySettings.currencyDisplayFormat}
                    onValueChange={(v) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        currencyDisplayFormat: v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="1234.56">$1,234.56</SelectItem>
                      <SelectItem value="1234,56">$1.234,56</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                Tax Rates
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Default Tax Rate (%)
                  </Label>
                  <Input
                    value={taxCurrencySettings.defaultTaxRatePct}
                    onChange={(e) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        defaultTaxRatePct: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    Applied to invoices (e.g., sales tax, VAT)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Tax Display Name
                  </Label>
                  <Input
                    value={taxCurrencySettings.taxDisplayName}
                    onChange={(e) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        taxDisplayName: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={taxCurrencySettings.includeTaxInDisplayedPrices}
                      onCheckedChange={(checked) =>
                        setTaxCurrencySettings((p) => ({
                          ...p,
                          includeTaxInDisplayedPrices: !!checked,
                        }))
                      }
                    />
                    <span className="text-sm font-bold text-gray-900">
                      Include tax in displayed prices
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                Payment Terms
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Default Payment Terms
                  </Label>
                  <Select
                    value={taxCurrencySettings.defaultPaymentTerms}
                    onValueChange={(v) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        defaultPaymentTerms: v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                      <SelectValue placeholder="Select terms" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="due">Due on Receipt</SelectItem>
                      <SelectItem value="net15">Net 15</SelectItem>
                      <SelectItem value="net30">Net 30</SelectItem>
                      <SelectItem value="net60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Late Payment Fee (%)
                  </Label>
                  <Input
                    value={taxCurrencySettings.latePaymentFeePct}
                    onChange={(e) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        latePaymentFeePct: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    Monthly interest on overdue invoices
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Invoice Prefix
                  </Label>
                  <Input
                    value={taxCurrencySettings.invoicePrefix}
                    onChange={(e) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        invoicePrefix: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    Example: INV-00001, INV-00002
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={saveTaxCurrencySettings}
                disabled={isSavingTaxCurrencySettings}
                className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Tax & Currency Settings
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Divisions" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                      Divisions / Boards
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      Organize your talent into divisions
                    </p>
                  </div>
                </div>
                <Button
                  onClick={openAddDivision}
                  className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Division
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {divisionCommissions.map((division) => (
                  <div
                    key={division.id}
                    className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-gray-900">
                        {division.name}
                      </h4>
                      <Badge className="bg-green-50 text-green-600 border-green-100 font-bold text-[10px] h-5">
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {division.count} talent assigned
                    </p>
                    <div className="flex items-end justify-between pt-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Commission Rate
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {division.rate}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-9 h-9 rounded-xl border-gray-200"
                          onClick={() => openEditDivision(division)}
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-9 h-9 rounded-xl border-red-100 bg-red-50 hover:bg-red-100"
                          onClick={() => removeDivision(division.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "File Storage" && <FileStorageView />}

        <Dialog open={showDivisionModal} onOpenChange={setShowDivisionModal}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {editingDivisionId ? "Edit Division" : "Add Division"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-900">
                  Division Name
                </Label>
                <Input
                  value={divisionDraft.name}
                  onChange={(e) =>
                    setDivisionDraft((p) => ({ ...p, name: e.target.value }))
                  }
                  className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Talent Count
                  </Label>
                  <Input
                    value={String(divisionDraft.count)}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setDivisionDraft((p) => ({
                        ...p,
                        count: Number.isFinite(n) ? n : 0,
                      }));
                    }}
                    className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Commission Rate (%)
                  </Label>
                  <Input
                    value={String(divisionDraft.rate)}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      setDivisionDraft((p) => ({
                        ...p,
                        rate: Number.isFinite(n) ? n : 0,
                      }));
                    }}
                    className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setShowDivisionModal(false)}
                className="font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={saveDivision}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {activeTab === "Team" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Team Management
                </h3>
                <p className="text-sm text-gray-500 font-medium hidden sm:block">
                  Manage team members, roles, and permissions
                </p>
              </div>
              <Button
                disabled
                className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                Invite User
              </Button>
            </div>

            <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 tracking-tight">
                      Coming Soon
                    </h4>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                      Team management (members, roles, and permissions) is not
                      available yet.
                    </p>
                    <p className="text-xs text-gray-500 font-medium mt-3">
                      You’ll be able to invite teammates, assign roles, and
                      manage access from this page.
                    </p>
                  </div>
                </div>
                <Badge className="bg-gray-50 text-gray-600 border-gray-200 font-bold text-[10px] h-6">
                  Coming Soon
                </Badge>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "Integrations" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Integrations
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  Connect your agency with other tools
                </p>
              </div>
              <Button
                disabled
                className="h-9 px-3 sm:h-10 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Integration
              </Button>
            </div>

            <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 tracking-tight">
                      Connect Bank Account
                    </h4>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                      Link your bank to receive client payments and manage
                      payouts.
                    </p>
                    {bankStatus?.connected && (
                      <p className="text-xs text-gray-600 font-medium mt-2">
                        Connected
                        {bankStatus.bank_last4
                          ? ` • Account ending in ••••${bankStatus.bank_last4}`
                          : ""}
                      </p>
                    )}
                    {!bankStatusLoading &&
                      bankStatus &&
                      !bankStatus.connected && (
                        <p className="text-xs text-gray-500 font-medium mt-2">
                          Not connected
                        </p>
                      )}
                  </div>
                </div>
                <Button asChild className="h-10 px-5 rounded-xl font-bold">
                  <a
                    href={`/AgencyDashboard?mode=IRL&tab=accounting&subTab=${encodeURIComponent(
                      "Connect Bank",
                    )}`}
                  >
                    {bankStatus?.connected ? "Change account" : "Connect"}
                  </a>
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 tracking-tight">
                      Coming Soon
                    </h4>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                      Integrations are not available yet.
                    </p>
                    <p className="text-xs text-gray-500 font-medium mt-3">
                      You’ll be able to connect tools like accounting, payments,
                      and calendars from this page.
                    </p>
                  </div>
                </div>
                <Badge className="bg-gray-50 text-gray-600 border-gray-200 font-bold text-[10px] h-6">
                  Coming Soon
                </Badge>
              </div>
            </Card>
          </div>
        )}

        <InviteTeamMemberModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
        />
        <EditPermissionsModal
          open={showPermissionsModal}
          onOpenChange={setShowPermissionsModal}
          member={selectedMember}
        />
        <ActivityLogModal
          open={showActivityModal}
          onOpenChange={setShowActivityModal}
          member={selectedMember}
        />
      </div>
    </div>
  );
};

export default GeneralSettingsView;
