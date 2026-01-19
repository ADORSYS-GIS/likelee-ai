import React, { useState } from "react";
import {
    ShieldCheck,
    Download,
    RefreshCw,
    Eye,
    CheckCircle2,
    Clock,
    X,
    XCircle,
    AlertCircle,
    FileText,
    Shield,
    File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
    LICENSE_COMPLIANCE_DATA as IMPORTED_LICENSE_COMPLIANCE_DATA,
    DOCS_CHECKLIST,
    CONSENT_DATA,
    BRAND_USAGE,
} from "@/data/agencyMockData";

const OVERVIEW_CARDS_DATA = [
    {
        title: "License Compliance",
        icon: ShieldCheck,
        iconColor: "text-indigo-600",
        stats: [
            { label: "Active Licenses", value: "142", color: "text-gray-900" },
            { label: "Expiring (30d)", value: "8", color: "text-orange-600" },
            { label: "Expired", value: "3", color: "text-red-600" },
        ],
        footer: "View All Licenses",
    },
    {
        title: "Document Completion",
        icon: FileText,
        iconColor: "text-green-600",
        progress: 84,
        stats: [
            { label: "Onboarded Talent", value: "24", color: "text-gray-900" },
            { label: "Missing Docs", value: "5", color: "text-red-600" },
        ],
        footer: "View Missing Docs",
    },
    {
        title: "Brand Safety",
        icon: Shield,
        iconColor: "text-blue-600",
        date: "No Issues",
        status: "All Clear",
        bgBadge: "bg-blue-600",
        action: undefined,
    },
    {
        title: "Renewal Requests",
        icon: RefreshCw,
        iconColor: "text-orange-600",
        stats: [
            { label: "Pending Response", value: "12", color: "text-gray-900" },
            { label: "Auto-Renewed", value: "45", color: "text-green-600" },
        ],
        bgBadge: "bg-orange-600",
        action: "12 Pending",
    },
];

const ComplianceHubView = () => {
    const { toast } = useToast();
    const [currentPage, setCurrentPage] = useState(1);
    const [alertSettings, setAlertSettings] = useState({
        "30day": true,
        "60day": true,
        "90day": true,
    });

    const [selectedTalentIds, setSelectedTalentIds] = useState<number[]>([]);
    const [licenseComplianceData, setLicenseComplianceData] = useState(
        IMPORTED_LICENSE_COMPLIANCE_DATA,
    );

    const handleActionToast = (message: string) => {
        toast({
            title: "Action Required",
            description: message,
            action: (
                <ToastAction altText="Try again" onClick={() => { }}>
                    OK
                </ToastAction>
            ),
        });
    };

    const handleSelectAllExpiring = () => {
        const expiredOrExpiring = CONSENT_DATA.filter(
            (t) => t.status === "warning" || t.status === "error",
        ).map((t) => t.id);

        // If all are already selected, clear selection. Otherwise, select all.
        if (expiredOrExpiring.every((id) => selectedTalentIds.includes(id))) {
            setSelectedTalentIds([]);
        } else {
            setSelectedTalentIds(expiredOrExpiring);
        }
    };

    const handleSendRenewalRequests = () => {
        if (selectedTalentIds.length === 0) return;

        toast({
            title: "Send Renewal Requests?",
            description: `You are about to send renewal requests to ${selectedTalentIds.length} talent. Proceed?`,
            action: (
                <ToastAction
                    altText="OK"
                    onClick={() => {
                        toast({
                            title: "Requests Sent",
                            description: `Renewal requests have been sent to ${selectedTalentIds.length} selected talent.`,
                            action: <ToastAction altText="OK">OK</ToastAction>,
                        });
                        setSelectedTalentIds([]);
                    }}
                >
                    OK
                </ToastAction>
            ),
        });
    };

    const toggleAutoRenew = (talentName: string) => {
        setLicenseComplianceData((prev) =>
            prev.map((item) =>
                item.talent === talentName ? { ...item, auto: !item.auto } : item,
            ),
        );
    };

    return (
        <div className="space-y-6 pb-20 scroll-smooth">
            <div className="flex justify-between items-center py-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">Compliance Hub</h2>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="gap-2 border-gray-300 font-bold bg-white h-10"
                        onClick={() =>
                            handleActionToast(
                                "Downloading compliance certificate for agency records...",
                            )
                        }
                    >
                        <ShieldCheck className="w-4 h-4" /> Download Compliance Certificate
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2 border-gray-300 font-bold bg-white h-10"
                        onClick={() => handleActionToast("Exporting report as PDF...")}
                    >
                        <Download className="w-4 h-4" /> Export Report
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-4 gap-6">
                {OVERVIEW_CARDS_DATA.map((card, idx) => (
                    <Card
                        key={idx}
                        className={`p-6 bg-white border ${card.borderColor || "border-gray-200"} shadow-sm relative overflow-hidden`}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                            <h3 className="text-sm font-bold text-gray-700">{card.title}</h3>
                            {card.borderColor && (
                                <div className="absolute top-4 right-4 animate-pulse">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                </div>
                            )}
                        </div>

                        {card.stats ? (
                            <div className="space-y-2 mb-4">
                                {card.stats.map((stat, sIdx) => (
                                    <div
                                        key={sIdx}
                                        className="flex justify-between items-center text-xs"
                                    >
                                        <span className="text-gray-500 font-medium">
                                            {stat.label}
                                        </span>
                                        <span className={`font-bold ${stat.color}`}>
                                            {stat.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mb-4">
                                <p className="text-2xl font-bold text-gray-900">{card.date}</p>
                                <p className="text-xs font-bold text-green-500 flex items-center gap-1 mt-1">
                                    ✓ {card.status}
                                </p>
                            </div>
                        )}

                        {card.progress !== undefined && (
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${card.progress > 75 ? "bg-gray-900" : "bg-indigo-600"}`}
                                    style={{ width: `${card.progress}%` }}
                                ></div>
                            </div>
                        )}

                        {card.action && (
                            <div
                                className={`mt-2 ${card.bgBadge} text-white text-[10px] font-bold py-1.5 rounded text-center tracking-wider flex items-center justify-center gap-2`}
                            >
                                <AlertCircle className="w-3 h-3" /> {card.action}
                            </div>
                        )}

                        {card.footer && (
                            <p className="text-[10px] font-bold text-indigo-600 text-center mt-4 cursor-pointer hover:underline">
                                {card.footer}
                            </p>
                        )}
                    </Card>
                ))}
            </div>

            {/* Talent Consent Audit */}
            <Card className="p-0 border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">
                        Talent Consent Audit
                    </h3>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="text-xs font-bold border-gray-300 h-8"
                            onClick={handleSelectAllExpiring}
                        >
                            Select All Expiring
                        </Button>
                        <Button
                            disabled={selectedTalentIds.length === 0}
                            variant="outline"
                            className={`text-xs font-bold h-8 gap-2 ${selectedTalentIds.length === 0
                                ? "text-indigo-400 border-indigo-100 bg-indigo-50/30"
                                : "text-indigo-700 border-indigo-300 bg-indigo-50 hover:bg-indigo-100"
                                }`}
                            onClick={handleSendRenewalRequests}
                        >
                            <RefreshCw
                                className={`w-3 h-3 ${selectedTalentIds.length > 0 ? "animate-spin-slow" : ""}`}
                            />{" "}
                            Send Renewal Requests ({selectedTalentIds.length})
                        </Button>
                    </div>
                </div>
                <div className="divide-y divide-gray-100">
                    {CONSENT_DATA.map((talent) => (
                        <div
                            key={talent.id}
                            className={`p-4 flex items-center gap-6 ${talent.status === "warning" ? "bg-orange-50/30 border-y border-orange-200/50" : talent.status === "error" ? "bg-red-50/30 border-y border-red-200/50" : "hover:bg-gray-50/50"} transition-colors`}
                        >
                            <Checkbox
                                className="border-gray-300"
                                checked={selectedTalentIds.includes(talent.id)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedTalentIds((prev) => [...prev, talent.id]);
                                    } else {
                                        setSelectedTalentIds((prev) =>
                                            prev.filter((id) => id !== talent.id),
                                        );
                                    }
                                }}
                            />
                            <div className="flex items-center gap-3 min-w-[150px]">
                                <img
                                    src={talent.image}
                                    alt={talent.name}
                                    className="w-10 h-10 rounded-full object-cover border border-gray-100"
                                />
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-gray-900">{talent.name}</span>
                                    {talent.status === "compliant" && (
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    )}
                                    {talent.status === "warning" && (
                                        <Clock className="w-4 h-4 text-orange-500" />
                                    )}
                                    {talent.status === "error" && (
                                        <X className="w-4 h-4 text-red-500" />
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 flex gap-8 text-[11px] font-medium text-gray-500">
                                <div className="flex flex-col gap-1">
                                    <span className="text-gray-400 text-[10px] uppercase tracking-wider">
                                        Consent Date
                                    </span>
                                    <span className="text-gray-700 font-bold">
                                        {talent.consentDate}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-gray-400 text-[10px] uppercase tracking-wider">
                                        Expiry Date
                                    </span>
                                    <span
                                        className={`${talent.status === "warning" || talent.status === "error" ? "text-orange-600" : "text-gray-700"} font-bold`}
                                    >
                                        {talent.expiryDate}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-gray-400 text-[10px] uppercase tracking-wider">
                                        Consent Types
                                    </span>
                                    <div className="flex gap-2 mt-0.5">
                                        {talent.types.map((type, tIdx) => (
                                            <span
                                                key={tIdx}
                                                className={`px-2 py-0.5 rounded-sm font-bold text-[9px] ${type === "N/A" ? "bg-gray-100 text-gray-400" : "bg-gray-900 text-white uppercase"}`}
                                            >
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {(talent.status === "warning" || talent.status === "error") && (
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] h-8 px-4 font-bold rounded-md">
                                        Request Renewal
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* License Compliance */}
            <Card className="p-0 border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">
                        License Compliance
                    </h3>
                    <div className="flex gap-2">
                        {[
                            "30-day alerts: ON",
                            "60-day alerts: ON",
                            "90-day alerts: ON",
                        ].map((alert) => (
                            <span
                                key={alert}
                                className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100"
                            >
                                {alert}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                <th className="px-6 py-4">Talent</th>
                                <th className="px-4 py-4">Brand</th>
                                <th className="px-4 py-4">Usage Scope</th>
                                <th className="px-4 py-4">License Date</th>
                                <th className="px-4 py-4">Expiry Date</th>
                                <th className="px-4 py-4">Days Left</th>
                                <th className="px-4 py-4">Alert Level</th>
                                <th className="px-4 py-4">Auto-Renew</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                            {licenseComplianceData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={row.image}
                                                className="w-6 h-6 rounded-full object-cover"
                                            />
                                            <span className="font-bold">{row.talent}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">{row.brand}</td>
                                    <td className="px-4 py-4">{row.scope}</td>
                                    <td className="px-4 py-4">{row.date}</td>
                                    <td className="px-4 py-4">{row.expiry}</td>
                                    <td className="px-4 py-4 text-red-600 font-bold">
                                        {row.days}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="bg-red-50 text-red-600 text-[9px] px-2 py-1 rounded font-black tracking-tighter">
                                            {row.level}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div
                                            className={`w-8 h-4 rounded-full relative ${row.auto ? "bg-indigo-600" : "bg-gray-200"} transition-colors cursor-pointer`}
                                            onClick={() => toggleAutoRenew(row.talent)}
                                        >
                                            <div
                                                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${row.auto ? "left-[17px]" : "left-0.5"}`}
                                            ></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-blue-600">
                                        <button className="font-bold text-[10px] border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 text-gray-700">
                                            Renew
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-indigo-50/30 border-t border-indigo-100 text-[10px] text-gray-500 font-medium">
                    <p className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">Automated Alerts:</span>{" "}
                        Email notifications sent automatically at 90, 60, and 30 days before
                        license expiry.
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">Auto-Renew:</span> When
                        enabled, license renewal requests are automatically sent 30 days
                        before expiry.
                    </p>
                </div>
            </Card>

            {/* Talent Documentation Checklist */}
            <Card className="p-0 border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">
                        Talent Documentation Checklist
                    </h3>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="text-xs font-bold border-gray-300 h-8 gap-2"
                            onClick={() =>
                                handleActionToast("Exporting documentation checklist as CSV...")
                            }
                        >
                            <Download className="w-4 h-4" /> Export Checklist
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8 gap-2"
                            onClick={() =>
                                handleActionToast(
                                    "Bulk upload for all - File picker would open here",
                                )
                            }
                        >
                            <RefreshCw className="w-4 h-4" /> Bulk Upload Docs
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-5 divide-x divide-gray-100 border-b border-gray-100">
                    {[
                        "ID Verification",
                        "Tax Docs",
                        "Consent Forms",
                        "Contracts",
                        "Bank Info",
                    ].map((tab) => (
                        <div
                            key={tab}
                            className="p-4 flex flex-col items-center gap-2 group cursor-pointer hover:bg-gray-50/50 transition-all"
                            onClick={() =>
                                handleActionToast(
                                    `Bulk upload for ${tab.replace("Info", "Info")} - File picker would open here`,
                                )
                            }
                        >
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors">
                                <FileText className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                    Upload
                                </p>
                                <p className="text-[11px] font-bold text-gray-800">{tab}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-100/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                <th className="px-6 py-4">Talent</th>
                                <th className="px-4 py-4 text-center">ID Verification</th>
                                <th className="px-4 py-4 text-center">Tax Docs</th>
                                <th className="px-4 py-4 text-center">Consent Forms</th>
                                <th className="px-4 py-4 text-center">Contract</th>
                                <th className="px-4 py-4 text-center">Bank Info</th>
                                <th className="px-4 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium font-sans">
                            {DOCS_CHECKLIST.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/30">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={row.image}
                                                className="w-6 h-6 rounded-full object-cover"
                                            />
                                            <span className="font-bold">{row.talent}</span>
                                        </div>
                                    </td>
                                    {[row.id, row.tax, row.consent, row.contract, row.bank].map(
                                        (check, cIdx) => (
                                            <td key={cIdx} className="px-4 py-4 text-center">
                                                {check ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                                                )}
                                            </td>
                                        ),
                                    )}
                                    <td className="px-4 py-4">
                                        <div
                                            className={`mx-auto w-max px-3 py-1 rounded-full text-[10px] font-bold ${row.status === "Complete" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}
                                        >
                                            {row.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Download className="w-4 h-4 text-indigo-400 mx-auto cursor-pointer hover:text-indigo-600" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Brand Usage Monitoring */}
            <Card className="p-0 border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">
                        Brand Usage Monitoring
                    </h3>
                </div>
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-3 gap-6">
                        <div className="p-4 bg-green-50 border border-green-100 rounded-xl relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <span className="text-xs font-bold text-green-700">
                                    Authorized Usages
                                </span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">73</p>
                            <p className="text-[10px] text-green-600 font-bold mt-1">
                                Last 30 days
                            </p>
                        </div>
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <span className="text-xs font-bold text-red-700">
                                    Flagged Usage
                                </span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">0</p>
                            <p className="text-[10px] text-red-600 font-bold mt-1">
                                Requires attention
                            </p>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Eye className="w-5 h-5 text-blue-600" />
                                <span className="text-xs font-bold text-blue-700">
                                    Under Review
                                </span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">2</p>
                            <p className="text-[10px] text-blue-600 font-bold mt-1">
                                Pending approval
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 px-1">
                            Usage by Brand
                        </h4>
                        <div className="space-y-2">
                            {BRAND_USAGE.map((brand, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 bg-gray-50/50 border border-gray-100 rounded-lg flex justify-between items-center group hover:bg-white hover:shadow-sm transition-all"
                                >
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {brand.brand}
                                        </p>
                                        <p className="text-[11px] text-gray-500 font-medium">
                                            {brand.count}
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full group-hover:bg-green-100 transition-colors">
                                        {brand.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Shield className="w-10 h-10 text-gray-200" />
                        </div>
                        <p className="text-sm font-bold text-gray-900 mb-1">
                            No flagged usage detected
                        </p>
                        <p className="text-xs text-gray-400 font-medium">
                            All brand usages are authorized and compliant
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ComplianceHubView;
