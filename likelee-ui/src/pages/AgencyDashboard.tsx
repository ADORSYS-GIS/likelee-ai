import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  BarChart2,
  Settings,
  LogOut,
  Bell,
  HelpCircle,
  User,
  Search,
  Instagram,
  ArrowUpDown,
  ArrowLeft,
  X,
  Trophy,
  DollarSign,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Download,
  Filter,
  Target,
  MoreHorizontal,
  ShieldAlert,
  Calendar,
  Clock,
  Eye,
  RefreshCw,
  CheckCircle2,
  Copy,
  Edit,
  Trash2,
  ShieldCheck,
  XCircle,
  Link,
  Percent,
  History,
  Save,
  ArrowRight,
  Building2,
  CreditCard,
  Folder,
  Phone,
  Mail,
  Package,
  Globe,
  Video,
  File,
  Tag,
  HardDrive,
  Grid,
  List,
  MoreVertical,
  Share2,
  Upload,
  FolderPlus,
  FolderOpen,
  Briefcase,
  Receipt,
  Megaphone,
  Calculator,
  FileDown,
  Send,
  Printer,
  Files,
  TrendingDown,
  MapPin,
  Star,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import GeneralSettingsView from "@/components/dashboard/settings/GeneralSettingsView";
import FileStorageView from "@/components/dashboard/settings/FileStorageView";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../auth/AuthProvider";


import DashboardView from "@/components/dashboard/agency/DashboardView";
import RosterView from "@/components/dashboard/agency/RosterView";
import PerformanceTiersView from "@/components/dashboard/agency/PerformanceTiersView";
import { LicensingRequestsView, ActiveLicensesView, LicenseTemplatesView } from "@/components/dashboard/agency/LicensingViews";
import ProtectionUsageView from "@/components/dashboard/agency/ProtectionUsageView";
import ComplianceHubView from "@/components/dashboard/agency/ComplianceHubView";
import AnalyticsDashboardView from "@/components/dashboard/agency/AnalyticsDashboardView";
import RoyaltiesPayoutsView from "@/components/dashboard/agency/RoyaltiesPayoutsView";
import ScoutingHubView from "@/components/dashboard/agency/ScoutingHubView";
import ClientCRMView from "@/components/dashboard/agency/ClientCRMView";
import BookingsView from "@/components/dashboard/agency/BookingsView";
import GenerateInvoiceView from "@/components/dashboard/agency/GenerateInvoiceView";
import InvoiceManagementView from "@/components/dashboard/agency/InvoiceManagementView";
import PaymentTrackingView from "@/components/dashboard/agency/PaymentTrackingView";
import TalentStatementsView from "@/components/dashboard/agency/TalentStatementsView";
import FinancialReportsView from "@/components/dashboard/agency/FinancialReportsView";
import ExpenseTrackingView from "@/components/dashboard/agency/ExpenseTrackingView";
export default function AgencyDashboard() {
  const { logout, user, authenticated } = useAuth();
  const navigate = useNavigate();
  const [agencyMode, setAgencyMode] = useState<"AI" | "IRL">("AI");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeSubTab, setActiveSubTab] = useState("All Talent");
  const [activeScoutingTab, setActiveScoutingTab] =
    useState("Prospect Pipeline");
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "roster",
    "licensing",
    "protection",
    "analytics",
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [consentFilter, setConsentFilter] = useState("All Consent");
  const [sortConfig, setSortConfig] = useState<{
    direction: "asc" | "desc";
  } | null>(null);

  // Bookings State
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookOuts, setBookOuts] = useState<any[]>([]);
  const onAddBooking = (b: any) => console.log("Add booking", b);
  const onUpdateBooking = (b: any) => console.log("Update booking", b);
  const onCancelBooking = (id: string) => console.log("Cancel booking", id);
  const onAddBookOut = (b: any) => console.log("Add bookout", b);
  const onRemoveBookOut = (id: string) => console.log("Remove bookout", id);

  const { toast } = useToast();
  const [kycLoading, setKycLoading] = useState(false);
  const kycPollRef = useRef<number | undefined>(undefined);
  const veriffMsgHandlerRef = useRef<(e: MessageEvent) => void>();
  const keydownHandlerRef = useRef<(e: KeyboardEvent) => void>();
  const [kycStatus, setKycStatus] = useState<string | undefined>(undefined);
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);

  // Helper for API URLs
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

  const fetchKycStatus = async (id: string) => {
    try {
      const res = await fetch(
        api(`/api/kyc/organization/status?organization_id=${encodeURIComponent(id)}`),
      );
      if (!res.ok) return;
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : rows?.[0];
      const status: string | undefined = row?.kyc_status || row?.liveness_status || undefined;
      setKycStatus(status);
      return status;
    } catch { }
  };

  useEffect(() => {
    if (authenticated && user?.id) {
      const fetchOrg = async () => {
        try {
          const res = await fetch(api(`/api/organization-profile/user/${user.id}`));
          if (res.ok) {
            const data = await res.json();
            const org = Array.isArray(data) ? data[0] : data;
            if (org?.id) {
              setOrganizationId(org.id);
              fetchKycStatus(org.id);
            } else {
              // Fallback to user ID if no org found (should not happen for agency dashboard)
              fetchKycStatus(user.id);
            }
          }
        } catch (err) {
          console.error("Error fetching organization:", err);
          fetchKycStatus(user.id);
        }
      };
      fetchOrg();
    }
  }, [authenticated, user?.id]);

  useEffect(() => {
    if (authenticated && (organizationId || user?.id)) {
      const idToPoll = organizationId || user.id;
      const interval = window.setInterval(async () => {
        const s = await fetchKycStatus(idToPoll);
        if (s && s !== "pending") {
          window.clearInterval(interval);
        }
      }, 10000);
      return () => window.clearInterval(interval);
    }
  }, [authenticated, organizationId, user?.id]);

  const ensureScript = async (src: string) => {
    const existing = Array.from(document.getElementsByTagName("script")).find(
      (s) => s.src === src,
    );
    if (existing) return;
    await new Promise<void>((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(el);
    });
  };

  const openVeriffOverlay = async (url: string) => {
    let root = document.getElementById("veriff-root");
    if (!root) {
      const overlay = document.createElement("div");
      overlay.id = "veriff-overlay";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.6)";
      overlay.style.zIndex = "10000";
      document.body.appendChild(overlay);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeVeriffOverlay();
      });
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerText = "Close";
      closeBtn.style.position = "absolute";
      closeBtn.style.top = "16px";
      closeBtn.style.right = "16px";
      closeBtn.style.background = "#111827";
      closeBtn.style.color = "#fff";
      closeBtn.style.fontWeight = "700";
      closeBtn.style.border = "none";
      closeBtn.style.borderRadius = "8px";
      closeBtn.style.padding = "8px 12px";
      closeBtn.style.cursor = "pointer";
      closeBtn.onclick = () => closeVeriffOverlay();
      overlay.appendChild(closeBtn);
      root = document.createElement("div");
      root.id = "veriff-root";
      root.style.position = "absolute";
      root.style.top = "50%";
      root.style.left = "50%";
      root.style.transform = "translate(-50%, -50%)";
      root.style.width = "95%";
      root.style.maxWidth = "480px";
      root.style.height = "85%";
      root.style.maxHeight = "800px";
      root.style.background = "#fff";
      root.style.borderRadius = "12px";
      root.style.overflow = "hidden";
      overlay.appendChild(root);
    }

    await ensureScript("https://cdn.veriff.me/sdk/js/1.5/veriff.min.js");
    await ensureScript("https://cdn.veriff.me/incontext/js/v1/veriff.js");

    const anyWin = window as any;
    if (anyWin?.veriffSDK?.createVeriffFrame) {
      anyWin.veriffSDK.createVeriffFrame({ url });
    } else {
      throw new Error("Veriff SDK unavailable");
    }

    if (!veriffMsgHandlerRef.current) {
      veriffMsgHandlerRef.current = (e: MessageEvent) => {
        const origin = e.origin || "";
        const data = e.data as any;
        const fromVeriffOrigin =
          origin.includes("veriff.me") ||
          origin.includes("veriff.com") ||
          origin.includes("stationapi.veriff.com");
        const looksLikeVeriffMsg =
          (data && (data.veriff || data.source === "veriffWebSDK" || data.type === "veriff-event")) ||
          (typeof data === "string" && data.toLowerCase().includes("veriff"));
        if (fromVeriffOrigin || looksLikeVeriffMsg) {
          closeVeriffOverlay();
        }
      };
      window.addEventListener("message", veriffMsgHandlerRef.current);
    }

    if (!keydownHandlerRef.current) {
      keydownHandlerRef.current = (e: KeyboardEvent) => {
        if (e.key === "Escape") closeVeriffOverlay();
      };
      window.addEventListener("keydown", keydownHandlerRef.current);
    }
  };

  const closeVeriffOverlay = () => {
    const overlay = document.getElementById("veriff-overlay");
    if (overlay) overlay.remove();
    if (kycPollRef.current) window.clearInterval(kycPollRef.current);
    if (veriffMsgHandlerRef.current) {
      window.removeEventListener("message", veriffMsgHandlerRef.current);
      veriffMsgHandlerRef.current = undefined;
    }
    if (keydownHandlerRef.current) {
      window.removeEventListener("keydown", keydownHandlerRef.current);
      keydownHandlerRef.current = undefined;
    }
    if (authenticated && user?.id) fetchKycStatus(user.id);
  };

  const handleKYC = async () => {
    if (!authenticated || !user?.id) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to start verification.",
        duration: 3000,
      });
      return;
    }

    try {
      setKycLoading(true);
      toast({
        title: "Verification Initiated",
        description: "Starting Veriff identity verification process...",
        duration: 3000,
      });

      const res = await fetch(api(`/api/kyc/organization/session`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organizationId || user.id }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      if (data.session_url) {
        setKycStatus("pending");
        await openVeriffOverlay(data.session_url);
        if (kycPollRef.current) window.clearInterval(kycPollRef.current);
        kycPollRef.current = window.setInterval(async () => {
          try {
            const status = await fetchKycStatus(organizationId || user.id);
            if (status && status !== "pending") {
              if (kycPollRef.current) window.clearInterval(kycPollRef.current);
              closeVeriffOverlay();
              toast({
                title: "Verification Completed",
                description:
                  status === "approved"
                    ? "Your agency verification was approved."
                    : "Verification finished. Please review the result.",
              });
            }
          } catch { }
        }, 5000);
      } else {
        throw new Error("No session URL returned");
      }
    } catch (e: any) {
      console.error("KYC Error:", e);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: `Failed to start verification: ${e?.message || "Unknown error"}`,
        duration: 3000,
      });
    } finally {
      setKycLoading(false);
    }
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Sidebar Items
  interface SidebarItem {
    id: string;
    label: string;
    icon: React.ElementType;
    subItems?: string[];
    badges?: Record<string, string | number>;
  }

  const sidebarItems: SidebarItem[] =
    agencyMode === "AI"
      ? [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        {
          id: "roster",
          label: "Roster",
          icon: Users,
          subItems: ["All Talent", "Performance Tiers"],
        },
        {
          id: "licensing",
          label: "Licensing",
          icon: FileText,
          subItems: [
            "Licensing Requests",
            "Active Licenses",
            "License Templates",
          ],
        },
        {
          id: "protection",
          label: "Protection & Usage",
          icon: Shield,
          subItems: ["Protect & Usage", "Compliance Hub"],
          badges: { "Compliance Hub": "NEW" },
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: BarChart2,
          subItems: ["Analytics Dashboard", "Royalties & Payouts"],
        },
        {
          id: "settings",
          label: "Settings",
          icon: Settings,
          subItems: ["General Settings", "File Storage"],
        },
      ]
      : [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        {
          id: "roster",
          label: "Roster",
          icon: Users,
          subItems: ["All Talent", "Performance Tiers"],
        },
        { id: "scouting", label: "Scouting", icon: Target },
        { id: "client-crm", label: "Client CRM", icon: Building2 },
        {
          id: "bookings",
          label: "Bookings",
          icon: Calendar,
          subItems: [
            "Calendar and schedule",
            "Booking request",
            "Client Database",
            "Talent availability",
            "Notifications",
            "Management and Analytics",
          ],
        },
        {
          id: "accounting",
          label: "Accounting & Invoicing",
          icon: CreditCard,
          subItems: [
            "Invoice Generation",
            "Invoice Management",
            "Payment Tracking",
            "Talent Statements",
            "Financial Reports",
            "Expense Tracking",
          ],
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: BarChart2,
          subItems: ["Analytics Dashboard", "Royalties & Payouts"],
        },
        {
          id: "settings",
          label: "Settings",
          icon: Settings,
          subItems: ["General Settings", "File Storage"],
        },
      ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-800">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-white border-r border-gray-200 flex flex-col fixed top-16 left-0 h-[calc(100vh-4rem)] z-40 transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-2 border-gray-200 p-1 shadow-sm overflow-hidden">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/a37a561a8_Screenshot2025-10-29at70538PM.png"
                alt="Agency"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="font-bold text-gray-900 text-base leading-tight">
              CM Models
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              admin@cmmodels.com
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1 py-4">
          {sidebarItems.map((item) => (
            <div key={item.id} className="mb-2">
              <button
                onClick={() => {
                  if (item.subItems) {
                    toggleExpanded(item.id);
                    if (item.id === "settings") {
                      setActiveTab("settings");
                      setActiveSubTab("General Settings");
                    }
                  } else {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id && !item.subItems
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                <item.icon
                  className={`w-5 h-5 ${activeTab === item.id ? "text-indigo-700" : "text-gray-500"
                    }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.subItems && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedItems.includes(item.id) ? "text-gray-600 rotate-180" : "text-gray-400"}`}
                  />
                )}
              </button>

              {/* Sub-items */}
              {item.subItems && expandedItems.includes(item.id) && (
                <div className="mt-1 ml-9 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem}
                      onClick={() => {
                        setActiveTab(item.id);
                        setActiveSubTab(subItem);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between text-left px-3 py-2 text-sm rounded-md transition-colors ${activeTab === item.id && activeSubTab === subItem
                        ? "text-indigo-700 bg-indigo-50 font-bold"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-medium"
                        }`}
                    >
                      <span className="truncate">{subItem}</span>
                      {item.badges && item.badges[subItem] && (
                        <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                          {item.badges[subItem]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors w-full px-3 py-2 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-0 md:ml-64 overflow-hidden transition-all duration-300">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-500 hover:text-gray-900"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-4 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAgencyMode(agencyMode === "AI" ? "IRL" : "AI")}
              className="font-bold border-2 border-gray-200 hover:bg-gray-50 transition-all"
            >
              {agencyMode === "AI" ? "AI Mode" : "IRL Mode"}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-900"
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-900 relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </Button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Notifications</h3>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                    <div className="p-4 bg-blue-50/30 hover:bg-blue-50/50 transition-colors cursor-pointer">
                      <p className="text-sm font-medium text-gray-900">
                        Julia's license expires in 15 days
                      </p>
                      <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                    </div>
                    <div className="p-4 bg-blue-50/30 hover:bg-blue-50/50 transition-colors cursor-pointer">
                      <p className="text-sm font-medium text-gray-900">
                        New licensing request from Byredo
                      </p>
                      <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
                    </div>
                    <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      <p className="text-sm font-medium text-gray-900">
                        Payment received: $5,200 from & Other Stories
                      </p>
                      <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                    </div>
                    <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      <p className="text-sm font-medium text-gray-900">
                        Aaron added to roster (pending verification)
                      </p>
                      <p className="text-xs text-gray-500 mt-1">2 days ago</p>
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 text-center">
                    <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-900"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>

            {/* Profile Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-900"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <User className="w-5 h-5" />
              </Button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center p-1">
                        <img
                          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/a37a561a8_Screenshot2025-10-29at70538PM.png"
                          alt="Agency"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">CM Models</h3>
                        <p className="text-xs text-gray-500">Agency Account</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0.5 text-xs font-bold gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </Badge>
                  </div>

                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-left group">
                      <Building2 className="w-4 h-4 text-gray-500 group-hover:text-gray-900" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                          Organization Settings
                        </p>
                        <p className="text-xs text-gray-500">
                          Manage company profile
                        </p>
                      </div>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-left group">
                      <Users className="w-4 h-4 text-gray-500 group-hover:text-gray-900" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                          Team & Permissions
                        </p>
                        <p className="text-xs text-gray-500">10 active users</p>
                      </div>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-left group">
                      <CreditCard className="w-4 h-4 text-gray-500 group-hover:text-gray-900" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                          Billing & Subscription
                        </p>
                        <p className="text-xs text-gray-500">Agency Pro Plan</p>
                      </div>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-left group">
                      <FileText className="w-4 h-4 text-gray-500 group-hover:text-gray-900" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                          Legal & Compliance
                        </p>
                        <p className="text-xs text-gray-500">
                          Contracts, terms, privacy
                        </p>
                      </div>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-left group">
                      <Link className="w-4 h-4 text-gray-500 group-hover:text-gray-900" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                          Integrations
                        </p>
                        <p className="text-xs text-gray-500">
                          Stripe, ElevenLabs connected
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="p-2 border-t border-gray-100">
                    <button
                      onClick={() => logout()}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-lg transition-colors text-left text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-bold">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Dashboard Content */}
        <main className="flex-1 overflow-auto px-12 py-8 bg-gray-50">
          {activeTab === "dashboard" && (
            <DashboardView
              agencyId={organizationId}
              onKYC={handleKYC}
              kycStatus={kycStatus}
            />
          )}
          {activeTab === "roster" && activeSubTab === "All Talent" && (
            <RosterView
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              consentFilter={consentFilter}
              setConsentFilter={setConsentFilter}
              sortConfig={sortConfig}
              setSortConfig={setSortConfig}
            />
          )}
          {activeTab === "roster" && activeSubTab === "Performance Tiers" && (
            <PerformanceTiersView
              onBack={() => setActiveSubTab("All Talent")}
            />
          )}
          {activeTab === "licensing" &&
            activeSubTab === "Licensing Requests" && <LicensingRequestsView />}
          {activeTab === "licensing" && activeSubTab === "Active Licenses" && (
            <ActiveLicensesView />
          )}
          {activeTab === "licensing" &&
            activeSubTab === "License Templates" && <LicenseTemplatesView />}
          {activeTab === "protection" && activeSubTab === "Protect & Usage" && (
            <ProtectionUsageView />
          )}
          {activeTab === "protection" && activeSubTab === "Compliance Hub" && (
            <ComplianceHubView />
          )}
          {activeTab === "analytics" &&
            activeSubTab === "Analytics Dashboard" && (
              <AnalyticsDashboardView />
            )}
          {activeTab === "analytics" &&
            activeSubTab === "Royalties & Payouts" && <RoyaltiesPayoutsView />}
          {activeTab === "settings" && activeSubTab === "General Settings" && (
            <GeneralSettingsView />
          )}
          {activeTab === "settings" && activeSubTab === "File Storage" && (
            <FileStorageView />
          )}
          {activeTab === "scouting" && (
            <ScoutingHubView
              activeTab={activeScoutingTab}
              setActiveTab={setActiveScoutingTab}
            />
          )}
          {activeTab === "client-crm" && <ClientCRMView />}
          {activeTab === "file-storage" && <FileStorageView />}
          {activeTab === "bookings" && (
            <BookingsView
              activeSubTab={activeSubTab}
              bookings={bookings}
              onAddBooking={onAddBooking}
              onUpdateBooking={onUpdateBooking}
              onCancelBooking={onCancelBooking}
              bookOuts={bookOuts}
              onAddBookOut={onAddBookOut}
              onRemoveBookOut={onRemoveBookOut}
            />
          )}
          {activeTab === "accounting" && (
            <div>
              {activeSubTab === "Invoice Generation" && <GenerateInvoiceView />}
              {activeSubTab === "Invoice Management" && (
                <InvoiceManagementView setActiveSubTab={setActiveSubTab} />
              )}
              {activeSubTab === "Payment Tracking" && <PaymentTrackingView />}
              {activeSubTab === "Talent Statements" && <TalentStatementsView />}
              {activeSubTab === "Financial Reports" && <FinancialReportsView />}
              {activeSubTab === "Expense Tracking" && <ExpenseTrackingView />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
