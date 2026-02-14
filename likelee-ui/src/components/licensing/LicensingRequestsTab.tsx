import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Filter,
    DollarSign,
    Eye,
    RefreshCw,
    FileText,
    Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
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
import {
    getAgencyLicensingRequests,
    updateAgencyLicensingRequestsStatus,
    getAgencyLicensingRequestsPaySplit,
    setAgencyLicensingRequestsPaySplit,
} from "@/api/functions";

export const LicensingRequestsTab = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ["agency", "licensing-requests"],
        queryFn: async () => {
            const resp = await getAgencyLicensingRequests();
            return resp as any[];
        },
    });

    const [payModalOpen, setPayModalOpen] = useState(false);
    const [payModalLoading, setPayModalLoading] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
    const [totalPaymentAmount, setTotalPaymentAmount] = useState<string>("");
    const [agencyPercent, setAgencyPercent] = useState<string>("");

    const [counterOfferModalOpen, setCounterOfferModalOpen] = useState(false);
    const [counterOfferMessage, setCounterOfferMessage] = useState("");
    const [groupToCounter, setGroupToCounter] = useState<any>(null);
    const [activeRequestTab, setActiveRequestTab] = useState<
        "Active" | "Archive"
    >("Active");

    const talentCount = (selectedGroup?.talents || []).length || 0;
    const totalNum = Number(totalPaymentAmount);
    const agencyPercentNum = Number(agencyPercent);
    const agencyTotal =
        Number.isFinite(totalNum) && Number.isFinite(agencyPercentNum)
            ? (totalNum * agencyPercentNum) / 100
            : 0;
    const talentTotal =
        Number.isFinite(totalNum) && Number.isFinite(agencyTotal)
            ? totalNum - agencyTotal
            : 0;
    const perTalentTalent =
        talentCount > 0 && Number.isFinite(talentTotal)
            ? talentTotal / talentCount
            : 0;
    const hasMissingTalentNames = (selectedGroup?.talents || []).some(
        (t: any) => !(t?.talent_name || "").trim(),
    );
    const formatMoney = (n: number) =>
        Number.isFinite(n)
            ? n.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
            : "--";

    const statusStyle = (status: string) => {
        if (status === "approved") return "bg-green-100 text-green-700";
        if (status === "rejected") return "bg-red-100 text-red-700";
        return "bg-gray-100 text-gray-700";
    };

    const formatBudget = (min?: number | null, max?: number | null) => {
        const minOk = typeof min === "number" && Number.isFinite(min);
        const maxOk = typeof max === "number" && Number.isFinite(max);
        const fmt = (n: number) =>
            n.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            });

        if (minOk && maxOk) return `${fmt(min!)} - ${fmt(max!)}`;
        if (minOk) return fmt(min!);
        if (maxOk) return fmt(max!);
        return "—";
    };

    const openPayModal = async (group: any) => {
        setSelectedGroup(group);
        setPayModalOpen(true);
        if (!group?.pay_set) {
            setTotalPaymentAmount("");
            setAgencyPercent("");
            setPayModalLoading(false);
            return;
        }

        setPayModalLoading(true);
        try {
            const ids = (group?.talents || [])
                .map((t: any) => t.licensing_request_id)
                .filter(Boolean)
                .join(",");
            const resp = await getAgencyLicensingRequestsPaySplit(ids);
            const total = (resp as any)?.total_payment_amount;
            const ap = (resp as any)?.agency_percent;
            setTotalPaymentAmount(
                typeof total === "number" && Number.isFinite(total)
                    ? String(total)
                    : "",
            );
            setAgencyPercent(
                typeof ap === "number" && Number.isFinite(ap) ? String(ap) : "",
            );
        } catch {
            setTotalPaymentAmount("");
            setAgencyPercent("");
        } finally {
            setPayModalLoading(false);
        }
    };

    const updateGroupStatus = async (
        group: any,
        status: "pending" | "approved" | "rejected" | "negotiating" | "archived",
        notes?: string,
    ) => {
        const ids = (group?.talents || [])
            .map((t: any) => t.licensing_request_id)
            .filter(Boolean);
        if (!ids.length) return;

        try {
            await updateAgencyLicensingRequestsStatus({
                licensing_request_ids: ids,
                status,
                notes,
            });
            await queryClient.invalidateQueries({
                queryKey: ["agency", "licensing-requests"],
            });
            if (status === "negotiating") {
                setCounterOfferModalOpen(false);
                setCounterOfferMessage("");
                setGroupToCounter(null);
                toast({
                    title: "Counter offer sent",
                    description: "The client has been notified.",
                });
            }
        } catch (e: any) {
            toast({
                title: "Update failed",
                description: e?.message || "Could not update licensing request",
                variant: "destructive" as any,
            });
        }
    };

    const filteredData = (data || []).filter((group: any) => {
        const isArchived = ["rejected", "declined", "archived"].includes(
            group.status,
        );
        return activeRequestTab === "Active" ? !isArchived : isArchived;
    });

    const savePaySplit = async () => {
        if (!selectedGroup) return;
        const ids = (selectedGroup?.talents || [])
            .map((t: any) => t.licensing_request_id)
            .filter(Boolean);
        if (!ids.length) return;

        const total = Number(totalPaymentAmount);
        const ap = Number(agencyPercent);
        if (!Number.isFinite(total) || total < 0) {
            toast({ title: "Invalid total amount", variant: "destructive" as any });
            return;
        }
        if (!agencyPercent.trim()) {
            toast({
                title: "Agency percent is required",
                variant: "destructive" as any,
            });
            return;
        }
        if (!Number.isFinite(ap) || ap < 0 || ap > 100) {
            toast({ title: "Invalid agency percent", variant: "destructive" as any });
            return;
        }

        setPayModalLoading(true);
        try {
            await setAgencyLicensingRequestsPaySplit({
                licensing_request_ids: ids,
                total_payment_amount: total,
                agency_percent: ap,
            });
            toast({ title: "Pay updated" });
            setPayModalOpen(false);
            setSelectedGroup(null);
            await queryClient.invalidateQueries({
                queryKey: ["agency", "licensing-requests"],
            });
        } catch (e: any) {
            toast({
                title: "Save failed",
                description: e?.message || "Could not save pay split",
                variant: "destructive" as any,
            });
        } finally {
            setPayModalLoading(false);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Licensing Requests
                        </h2>
                        <div className="flex bg-gray-100 p-1 rounded-lg w-fit mt-2">
                            {["Active", "Archive"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveRequestTab(tab as any)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeRequestTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 border-gray-300 font-bold text-gray-700 bg-white"
                    >
                        <Filter className="w-4 h-4" /> Filter
                    </Button>
                </div>

                <div className="space-y-6">
                    {isLoading && (
                        <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
                            <div className="text-gray-500 font-medium">Loading...</div>
                        </Card>
                    )}

                    {!isLoading && error && (
                        <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
                            <div className="text-red-600 font-medium">
                                Failed to load licensing requests
                            </div>
                        </Card>
                    )}

                    {!isLoading && !error && filteredData.length === 0 && (
                        <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
                            <div className="text-gray-500 font-medium">
                                {activeRequestTab === "Active"
                                    ? "No active licensing requests"
                                    : "No archived licensing requests"}
                            </div>
                        </Card>
                    )}

                    {filteredData.map((group: any) => (
                        <Card
                            key={group.group_key}
                            className="p-8 bg-white border-2 border-gray-900 rounded-none overflow-hidden relative"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                                        {group.brand_name || "Unknown brand"}
                                    </h3>
                                    <p className="text-gray-500 font-medium">
                                        {(group.campaign_title || "").trim() || "—"}
                                    </p>
                                </div>
                                <span
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusStyle(group.status)}`}
                                >
                                    {group.status}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {(group.talents || []).map((t: any) => {
                                    const names = (t.talent_name || "")
                                        .split(",")
                                        .map((s: string) => s.trim())
                                        .filter(Boolean);
                                    return names.map((name: string, i: number) => (
                                        <span
                                            key={`${t.licensing_request_id}-${i}`}
                                            className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase"
                                        >
                                            {name || "Talent"}
                                        </span>
                                    ));
                                })}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 mb-8">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                            Budget Range
                                        </p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {formatBudget(group.budget_min, group.budget_max)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                            Regions
                                        </p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {group.regions || "—"}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                            Usage Scope
                                        </p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {(group.usage_scope || "").trim() || "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                            {group.license_start_date ? "Duration" : "Deadline"}
                                        </p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {group.license_start_date && group.license_end_date
                                                ? `${new Date(group.license_start_date).toLocaleDateString()} - ${new Date(group.license_end_date).toLocaleDateString()}`
                                                : group.license_start_date
                                                    ? `From ${new Date(group.license_start_date).toLocaleDateString()}`
                                                    : group.deadline
                                                        ? new Date(group.deadline).toLocaleDateString()
                                                        : "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {group.status === "approved" ? (
                                <div>
                                    <Button
                                        onClick={() => openPayModal(group)}
                                        className={`w-full font-bold h-10 rounded-md flex items-center justify-center gap-2 ${group.pay_set ? "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 animate-pulse"}`}
                                    >
                                        {group.pay_set ? (
                                            <>
                                                <Eye className="w-4 h-4" /> View Pay
                                            </>
                                        ) : (
                                            <>
                                                <DollarSign className="w-4 h-4" /> Set Pay
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : activeRequestTab === "Archive" ? (
                                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => updateGroupStatus(group, "pending")}
                                        className="border-gray-300 text-gray-700 font-bold h-10 rounded-md flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Recover to Active
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Button
                                        onClick={() => updateGroupStatus(group, "approved")}
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold h-10 rounded-md flex items-center justify-center gap-2"
                                    >
                                        <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                                            <span className="text-[10px]">✓</span>
                                        </div>
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setGroupToCounter(group);
                                            setCounterOfferModalOpen(true);
                                        }}
                                        className="border-gray-300 text-gray-700 font-bold h-10 rounded-md"
                                    >
                                        Counter Offer
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => updateGroupStatus(group, "rejected")}
                                        className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-10 rounded-md flex items-center justify-center gap-2"
                                    >
                                        <div className="w-4 h-4 rounded-full border-2 border-red-200 flex items-center justify-center">
                                            <span className="text-[10px]">✕</span>
                                        </div>
                                        Decline
                                    </Button>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Pay split</DialogTitle>
                            <DialogDescription>
                                Set total campaign pay and agency percent. The system will split
                                total evenly across talents.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Total payment amount</Label>
                                <Input
                                    value={totalPaymentAmount}
                                    onChange={(e) => setTotalPaymentAmount(e.target.value)}
                                    placeholder="e.g. 10000"
                                    inputMode="decimal"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Agency percent</Label>
                                <Input
                                    value={agencyPercent}
                                    onChange={(e) => setAgencyPercent(e.target.value)}
                                    placeholder="e.g. 20"
                                    inputMode="decimal"
                                />
                            </div>

                            <Card className="p-4 bg-gray-50 border border-gray-200">
                                <div className="grid grid-cols-1 gap-2 text-sm font-medium text-gray-700">
                                    <div className="flex justify-between">
                                        <span>Agency total</span>
                                        <span>${formatMoney(agencyTotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Talent total</span>
                                        <span>${formatMoney(talentTotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Per talent</span>
                                        <span>${formatMoney(perTalentTalent)}</span>
                                    </div>
                                    {hasMissingTalentNames && (
                                        <div className="text-xs text-amber-700 font-bold">
                                            Some talents are missing names in this request.
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        <DialogFooter className="pt-6 border-t">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setPayModalOpen(false);
                                    setSelectedGroup(null);
                                }}
                                disabled={payModalLoading}
                            >
                                Cancel
                            </Button>
                            <Button onClick={savePaySplit} disabled={payModalLoading}>
                                {payModalLoading ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={counterOfferModalOpen}
                    onOpenChange={setCounterOfferModalOpen}
                >
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Send Counter Offer</DialogTitle>
                            <DialogDescription>
                                Explain your proposed terms to the client. They will be notified
                                by email.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Message to Client</Label>
                                <Textarea
                                    value={counterOfferMessage}
                                    onChange={(e) => setCounterOfferMessage(e.target.value)}
                                    placeholder="Describe your counter offer terms..."
                                    rows={5}
                                    className="resize-none"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setCounterOfferModalOpen(false)}
                                className="font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() =>
                                    updateGroupStatus(
                                        groupToCounter,
                                        "negotiating",
                                        counterOfferMessage,
                                    )
                                }
                                disabled={!counterOfferMessage.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                            >
                                Send Counter Offer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
};
