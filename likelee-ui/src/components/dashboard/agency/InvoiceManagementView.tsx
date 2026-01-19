import React, { useState } from "react";
import { MOCK_INVOICES } from "../../../data/agencyMockData";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    FileText,
    Plus,
    DollarSign,
    Receipt,
    BarChart2,
    CreditCard,
    Filter,
    ChevronDown,
    Search,
    Eye,
    Edit,
    Download,
    MoreVertical,
    History,
    Printer,
    CheckCircle2,
    Trash2,
    X,
} from "lucide-react";

const InvoiceManagementView = ({
    setActiveSubTab,
}: {
    setActiveSubTab: (tab: string) => void;
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [showFilters, setShowFilters] = useState(false);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // Filter states
    const [issueDateFrom, setIssueDateFrom] = useState("");
    const [issueDateTo, setIssueDateTo] = useState("");
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("10000");
    const [showOverdueOnly, setShowOverdueOnly] = useState(false);
    const [currencyFilter, setCurrencyFilter] = useState("all");

    const clearAllFilters = () => {
        setIssueDateFrom("");
        setIssueDateTo("");
        setMinAmount("");
        setMaxAmount("10000");
        setShowOverdueOnly(false);
        setCurrencyFilter("all");
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "draft":
                return "bg-blue-50 text-blue-700 border-blue-200";
            case "sent":
                return "bg-yellow-50 text-yellow-700 border-yellow-200";
            case "paid":
                return "bg-green-50 text-green-700 border-green-200";
            case "overdue":
                return "bg-red-50 text-red-700 border-red-200";
            case "partial":
                return "bg-purple-50 text-purple-700 border-purple-200";
            case "cancelled":
                return "bg-gray-50 text-gray-700 border-gray-200";
            default:
                return "bg-gray-50 text-gray-700 border-gray-200";
        }
    };

    const accountingTabs = [
        { id: "Invoice Management", label: "Invoice Management", icon: FileText },
        { id: "Invoice Generation", label: "Generate Invoice", icon: Plus },
        { id: "Payment Tracking", label: "Payment Tracking", icon: DollarSign },
        { id: "Talent Statements", label: "Talent Statements", icon: Receipt },
        { id: "Financial Reports", label: "Financial Reports", icon: BarChart2 },
        { id: "Expense Tracking", label: "Expense Tracking", icon: CreditCard },
    ];

    return (
        <div className="space-y-6">
            {/* Horizontal Tab Navigation */}
            <Card className="p-2 bg-white border border-gray-100 rounded-2xl">
                <div className="flex items-center gap-2">
                    {accountingTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = tab.id === "Invoice Management";
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${isActive
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </Card>

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Invoice Management
                    </h2>
                    <p className="text-gray-600 font-medium">
                        View and manage all client invoices
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        <ChevronDown
                            className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
                        />
                    </Button>
                </div>
            </div>

            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search by invoice #, client, or talent name..."
                        className="pl-10 h-10 bg-white border-gray-200 rounded-xl text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 h-10 bg-white border-gray-200 rounded-xl font-bold text-gray-700 text-sm">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="font-bold text-gray-700">
                            All Status
                        </SelectItem>
                        <SelectItem value="draft" className="font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                                <span className="text-gray-900">Draft</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="sent" className="font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                                <span className="text-gray-900">Sent</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="paid" className="font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                                <span className="text-gray-900">Paid</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="overdue" className="font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                                <span className="text-gray-900">Overdue</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="partial" className="font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                                <span className="text-gray-900">Partial</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="cancelled" className="font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
                                <span className="text-gray-900">Cancelled</span>
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40 h-10 bg-white border-gray-200 rounded-xl font-bold text-gray-700 text-sm">
                        <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="newest" className="font-bold text-gray-700">
                            Newest First
                        </SelectItem>
                        <SelectItem value="oldest" className="font-bold text-gray-700">
                            Oldest First
                        </SelectItem>
                        <SelectItem value="due-soonest" className="font-bold text-gray-700">
                            Due Date (Soonest)
                        </SelectItem>
                        <SelectItem value="due-latest" className="font-bold text-gray-700">
                            Due Date (Latest)
                        </SelectItem>
                        <SelectItem value="amount-high" className="font-bold text-gray-700">
                            Amount (High to Low)
                        </SelectItem>
                        <SelectItem value="amount-low" className="font-bold text-gray-700">
                            Amount (Low to High)
                        </SelectItem>
                        <SelectItem value="client-az" className="font-bold text-gray-700">
                            Client (A-Z)
                        </SelectItem>
                        <SelectItem value="client-za" className="font-bold text-gray-700">
                            Client (Z-A)
                        </SelectItem>
                        <SelectItem value="invoice-asc" className="font-bold text-gray-700">
                            Invoice # (Asc)
                        </SelectItem>
                        <SelectItem
                            value="invoice-desc"
                            className="font-bold text-gray-700"
                        >
                            Invoice # (Desc)
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <Card className="p-5 bg-white border border-gray-200 rounded-2xl">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">
                                Issue Date From
                            </Label>
                            <Input
                                type="date"
                                value={issueDateFrom}
                                onChange={(e) => setIssueDateFrom(e.target.value)}
                                className="h-10 rounded-xl border-gray-200 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">
                                Issue Date To
                            </Label>
                            <Input
                                type="date"
                                value={issueDateTo}
                                onChange={(e) => setIssueDateTo(e.target.value)}
                                className="h-10 rounded-xl border-gray-200 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">
                                Min Amount
                            </Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={minAmount}
                                onChange={(e) => setMinAmount(e.target.value)}
                                className="h-10 rounded-xl border-gray-200 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">
                                Max Amount
                            </Label>
                            <Input
                                type="number"
                                placeholder="10000"
                                value={maxAmount}
                                onChange={(e) => setMaxAmount(e.target.value)}
                                className="h-10 rounded-xl border-gray-200 text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={showOverdueOnly}
                                    onCheckedChange={(checked) =>
                                        setShowOverdueOnly(checked as boolean)
                                    }
                                    className="rounded-md w-4 h-4 border-gray-300"
                                />
                                <Label className="text-sm font-bold text-gray-700">
                                    Show Overdue Only
                                </Label>
                            </div>
                            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                                <SelectTrigger className="w-48 h-10 rounded-xl border-gray-200 text-sm">
                                    <SelectValue placeholder="All Currencies" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all">All Currencies</SelectItem>
                                    <SelectItem value="usd">USD</SelectItem>
                                    <SelectItem value="eur">EUR</SelectItem>
                                    <SelectItem value="gbp">GBP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={clearAllFilters}
                            className="h-10 px-4 rounded-xl font-bold text-gray-700 flex items-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            Clear All Filters
                        </Button>
                    </div>
                </Card>
            )}

            <div className="text-sm text-gray-700 font-bold">
                Showing <span className="font-bold text-gray-900">1 of 1</span> invoices
            </div>

            <Card className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <Checkbox className="rounded-md w-4 h-4 border-gray-300" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Invoice #
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Client Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Issue Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Due Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {MOCK_INVOICES.map((invoice) => (
                                <tr
                                    key={invoice.id}
                                    className="hover:bg-gray-50 transition-colors"
                                >
                                    <td className="px-6 py-3">
                                        <Checkbox className="rounded-md w-4 h-4 border-gray-300" />
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-sm font-bold text-gray-900">
                                            {invoice.invoiceNumber}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-sm font-bold text-indigo-600">
                                            {invoice.clientName}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-sm text-gray-700 font-bold">
                                            {invoice.issueDate}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-sm text-gray-700 font-bold">
                                            {invoice.dueDate}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-sm font-bold text-gray-900">
                                            {invoice.amount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <Badge
                                            variant="outline"
                                            className={`text-xs font-bold px-3 py-1 rounded-lg capitalize ${getStatusColor(invoice.status)}`}
                                        >
                                            {invoice.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="w-8 h-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                title="View Invoice"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
                                                title="Edit Invoice"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
                                                title="Download PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedInvoice(invoice);
                                                            setShowPaymentHistory(true);
                                                        }}
                                                        className="font-bold text-gray-700 cursor-pointer"
                                                    >
                                                        <History className="w-4 h-4 mr-2" />
                                                        Payment History
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer">
                                                        <Printer className="w-4 h-4 mr-2" />
                                                        Print
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Payment History Modal */}
            <Dialog open={showPaymentHistory} onOpenChange={setShowPaymentHistory}>
                <DialogContent className="max-w-2xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-gray-900">
                            Payment History
                        </DialogTitle>
                        <p className="text-sm text-gray-600 font-medium">
                            Invoice #{selectedInvoice?.invoiceNumber}
                        </p>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <p className="text-xs font-bold text-gray-700 mb-1">
                                    Invoice Total
                                </p>
                                <p className="text-2xl font-bold text-blue-600">$3</p>
                            </Card>
                            <Card className="p-4 bg-green-50 border border-green-100 rounded-xl">
                                <p className="text-xs font-bold text-gray-700 mb-1">
                                    Total Paid
                                </p>
                                <p className="text-2xl font-bold text-green-600">$3</p>
                            </Card>
                            <Card className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                                <p className="text-xs font-bold text-gray-700 mb-1">
                                    Remaining Balance
                                </p>
                                <p className="text-2xl font-bold text-orange-600">$0</p>
                            </Card>
                        </div>

                        {/* Payment Transactions */}
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-3">
                                Payment Transactions
                            </h4>
                            <Card className="p-4 bg-green-50 border border-green-100 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">
                                                    Payment #1
                                                </p>
                                                <p className="text-xs text-gray-600 font-medium">
                                                    January 27, 2026 • Wire
                                                </p>
                                            </div>
                                            <span className="text-lg font-bold text-green-600">$3</span>
                                        </div>
                                        <p className="text-xs text-gray-600 font-medium">
                                            Full payment received
                                        </p>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export History
                        </Button>
                        <Button
                            onClick={() => setShowPaymentHistory(false)}
                            className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default InvoiceManagementView;
