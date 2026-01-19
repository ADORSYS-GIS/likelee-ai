import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {
    DollarSign,
    Clock,
    TrendingDown,
    TrendingUp,
    FileDown,
    Download,
    Receipt,
    Building2,
    User,
    AlertCircle,
    Users,
    Percent,
    BarChart2,
    FileText,
    ChevronRight,
} from "lucide-react";

const FinancialReportsView = () => {
    const [reportPeriod, setReportPeriod] = useState("this-year");
    const [clientFilter, setClientFilter] = useState("all");
    const [talentFilter, setTalentFilter] = useState("all");
    const [activeReportTab, setActiveReportTab] = useState("revenue");

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Financial Reports</h2>
                <p className="text-gray-600 font-medium">
                    Comprehensive financial analytics and insights
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-bold text-gray-700">Total Revenue</p>
                    </div>
                    <p className="text-3xl font-bold text-green-600 mb-1">$3</p>
                    <p className="text-xs text-gray-600 font-medium">1 paid invoices</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <p className="text-sm font-bold text-gray-700">Pending</p>
                    </div>
                    <p className="text-3xl font-bold text-yellow-600 mb-1">$0</p>
                    <p className="text-xs text-gray-600 font-medium">0 invoices</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                        <p className="text-sm font-bold text-gray-700">Expenses</p>
                    </div>
                    <p className="text-3xl font-bold text-red-600 mb-1">$775</p>
                    <p className="text-xs text-gray-600 font-medium">4 expenses</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        <p className="text-sm font-bold text-gray-700">Net Income</p>
                    </div>
                    <p className="text-3xl font-bold text-indigo-600 mb-1">-$772</p>
                    <p className="text-xs text-gray-600 font-medium">past month</p>
                </Card>
            </div>

            <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">
                        Financial Reports
                    </h3>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <FileDown className="w-4 h-4" />
                            Export to PDF
                        </Button>
                        <Button
                            variant="outline"
                            className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export to Excel
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                        <Label className="text-sm font-bold text-gray-700 mb-2 block">
                            Report Period
                        </Label>
                        <Select value={reportPeriod} onValueChange={setReportPeriod}>
                            <SelectTrigger className="h-11 rounded-xl border-gray-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="this-year">This Year</SelectItem>
                                <SelectItem value="last-year">Last Year</SelectItem>
                                <SelectItem value="this-quarter">This Quarter</SelectItem>
                                <SelectItem value="last-quarter">Last Quarter</SelectItem>
                                <SelectItem value="this-month">This Month</SelectItem>
                                <SelectItem value="last-month">Last Month</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-sm font-bold text-gray-700 mb-2 block">
                            Filter by Client
                        </Label>
                        <Select value={clientFilter} onValueChange={setClientFilter}>
                            <SelectTrigger className="h-11 rounded-xl border-gray-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">All Clients</SelectItem>
                                <SelectItem value="nike">Nike Global</SelectItem>
                                <SelectItem value="adidas">Adidas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-sm font-bold text-gray-700 mb-2 block">
                            Filter by Talent
                        </Label>
                        <Select value={talentFilter} onValueChange={setTalentFilter}>
                            <SelectTrigger className="h-11 rounded-xl border-gray-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">All Talent</SelectItem>
                                <SelectItem value="emma">Emma</SelectItem>
                                <SelectItem value="milan">Milan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex gap-2 mb-6 border-b border-gray-100">
                    {[
                        { id: "revenue", label: "Revenue Report" },
                        { id: "receivables", label: "Outstanding Receivables" },
                        { id: "payables", label: "Talent Payables" },
                        { id: "commission", label: "Commission Report" },
                        { id: "profit", label: "Profit & Loss" },
                        { id: "tax", label: "Tax Reports" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveReportTab(tab.id)}
                            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeReportTab === tab.id
                                ? "text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeReportTab === "revenue" && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <Card className="p-5 bg-green-50 border border-green-100 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-green-600" />
                                    <p className="text-xs font-bold text-gray-700">
                                        Total Revenue
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-green-600 mb-1">$3</p>
                                <p className="text-[10px] text-gray-600 font-medium">
                                    1 paid invoices
                                </p>
                            </Card>
                            <Card className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-blue-600" />
                                    <p className="text-xs font-bold text-gray-700">
                                        Pending Revenue
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-blue-600 mb-1">$0</p>
                                <p className="text-[10px] text-gray-600 font-medium">
                                    0 outstanding invoices
                                </p>
                            </Card>
                            <Card className="p-5 bg-purple-50 border border-purple-100 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Receipt className="w-4 h-4 text-purple-600" />
                                    <p className="text-xs font-bold text-gray-700">Avg Invoice</p>
                                </div>
                                <p className="text-2xl font-bold text-purple-600 mb-1">$3</p>
                                <p className="text-[10px] text-gray-600 font-medium">
                                    per invoice
                                </p>
                            </Card>
                            <Card className="p-5 bg-orange-50 border border-orange-100 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-orange-600" />
                                    <p className="text-xs font-bold text-gray-700">Growth Rate</p>
                                </div>
                                <p className="text-2xl font-bold text-orange-600 mb-1">
                                    +15.3%
                                </p>
                                <p className="text-[10px] text-gray-600 font-medium">
                                    vs previous period
                                </p>
                            </Card>
                        </div>

                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-gray-900 mb-3">
                                Revenue by Month
                            </h4>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 w-1/12"></div>
                            </div>
                            <p className="text-xs text-gray-600 font-medium mt-2">
                                Jan 2026: $3
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <Card className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
                                <h4 className="text-sm font-bold text-gray-900 mb-4">
                                    Top Clients by Revenue
                                </h4>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <Building2 className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-900">
                                            Nike Global
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-green-600">$3</span>
                                </div>
                            </Card>
                            <Card className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
                                <h4 className="text-sm font-bold text-gray-900 mb-4">
                                    Top Talent by Revenue
                                </h4>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <User className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-900">Emma</p>
                                    </div>
                                    <span className="text-sm font-bold text-green-600">$3</span>
                                </div>
                            </Card>
                        </div>
                    </>
                )}

                {activeReportTab === "receivables" && (
                    <div className="space-y-6">
                        <Card className="p-8 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-700 mb-2">
                                    Total Outstanding Receivables
                                </p>
                                <p className="text-5xl font-bold text-red-600">$0</p>
                            </div>
                            <AlertCircle className="w-12 h-12 text-red-600" />
                        </Card>

                        <div className="grid grid-cols-5 gap-4">
                            {[
                                { label: "Current (Not Due)", color: "green" },
                                { label: "1-30 Days Overdue", color: "yellow" },
                                { label: "31-60 Days Overdue", color: "orange" },
                                { label: "61-90 Days Overdue", color: "red" },
                                { label: "90+ Days Overdue", color: "gray" },
                            ].map((aging) => (
                                <Card
                                    key={aging.label}
                                    className={`p-4 bg-${aging.color}-50 border border-${aging.color}-100 rounded-xl`}
                                >
                                    <p className="text-[10px] font-bold text-gray-700 mb-2">
                                        {aging.label}
                                    </p>
                                    <p className={`text-xl font-bold text-${aging.color}-600`}>
                                        $0
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-medium">
                                        0 invoices
                                    </p>
                                </Card>
                            ))}
                        </div>

                        <Card className="p-6 bg-gray-50 border border-gray-100 rounded-xl">
                            <h4 className="text-base font-bold text-gray-900 mb-4">
                                Largest Outstanding Clients
                            </h4>
                            <div className="text-center py-8 text-gray-400 font-medium">
                                No outstanding receivables
                            </div>
                        </Card>
                    </div>
                )}

                {activeReportTab === "payables" && (
                    <div className="space-y-6">
                        <Card className="p-8 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-700 mb-2">
                                    Total Owed to All Talent
                                </p>
                                <p className="text-5xl font-bold text-orange-600">$0</p>
                            </div>
                            <Users className="w-12 h-12 text-orange-600" />
                        </Card>

                        <Card className="p-6 bg-gray-50 border border-gray-100 rounded-xl">
                            <h4 className="text-base font-bold text-gray-900 mb-4">
                                Breakdown by Talent
                            </h4>
                            <div className="text-center py-8 text-gray-400 font-medium">
                                No pending talent payables
                            </div>
                        </Card>
                    </div>
                )}

                {activeReportTab === "commission" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-6">
                            <Card className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Percent className="w-4 h-4 text-indigo-600" />
                                    <p className="text-sm font-bold text-gray-700">
                                        Total Commission Earned
                                    </p>
                                </div>
                                <p className="text-3xl font-bold text-indigo-600 mb-1">$0</p>
                                <p className="text-xs text-gray-600 font-medium">
                                    20% of revenue
                                </p>
                            </Card>
                            <Card className="p-6 bg-purple-50 border border-purple-100 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-purple-600" />
                                    <p className="text-sm font-bold text-gray-700">
                                        Avg Commission per Deal
                                    </p>
                                </div>
                                <p className="text-3xl font-bold text-purple-600 mb-1">$0</p>
                                <p className="text-xs text-gray-600 font-medium">
                                    Average earned
                                </p>
                            </Card>
                            <Card className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart2 className="w-4 h-4 text-blue-600" />
                                    <p className="text-sm font-bold text-gray-700">
                                        Commission Rate
                                    </p>
                                </div>
                                <p className="text-3xl font-bold text-blue-600 mb-1">20%</p>
                                <p className="text-xs text-gray-600 font-medium">
                                    Consistent across all deals
                                </p>
                            </Card>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <Card className="p-6 bg-gray-50 border border-gray-100 rounded-xl">
                                <h4 className="text-base font-bold text-gray-900 mb-4">
                                    Commission by Client
                                </h4>
                                <div className="text-center py-8 text-gray-400 font-medium">
                                    No commission data available
                                </div>
                            </Card>
                            <Card className="p-6 bg-gray-50 border border-gray-100 rounded-xl">
                                <h4 className="text-base font-bold text-gray-900 mb-4">
                                    Commission by Talent
                                </h4>
                                <div className="text-center py-8 text-gray-400 font-medium">
                                    No commission data available
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeReportTab === "profit" && (
                    <div className="space-y-6">
                        <Card className="p-8 bg-white border border-gray-100 rounded-2xl">
                            <h4 className="text-xl font-bold text-gray-900 mb-8 text-center">
                                Profit & Loss Statement
                            </h4>
                            <div className="max-w-2xl mx-auto space-y-4">
                                <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-100">
                                    <span className="text-base font-bold text-gray-900">
                                        Revenue (Gross from Invoices)
                                    </span>
                                    <span className="text-xl font-bold text-green-600">$0</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                                    <span className="text-base font-bold text-gray-900">
                                        Less: Talent Payments (COGS)
                                    </span>
                                    <span className="text-xl font-bold text-red-600">-$0</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <span className="text-base font-bold text-gray-900">
                                        Gross Profit (Agency Commission)
                                    </span>
                                    <span className="text-xl font-bold text-blue-600">$0</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-orange-50 rounded-xl border border-orange-100">
                                    <span className="text-base font-bold text-gray-900">
                                        Less: Operating Expenses
                                    </span>
                                    <span className="text-xl font-bold text-orange-600">
                                        -$1,095
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-6 bg-green-50 rounded-2xl border-4 border-green-400 mt-6">
                                    <span className="text-2xl font-bold text-gray-900">
                                        Net Profit
                                    </span>
                                    <span className="text-4xl font-bold text-green-600">
                                        $-1,095
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mt-12 max-w-2xl mx-auto">
                                <Card className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center">
                                    <p className="text-xs font-bold text-gray-500 mb-1">
                                        Profit Margin
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">0%</p>
                                </Card>
                                <Card className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center">
                                    <p className="text-xs font-bold text-gray-500 mb-1">
                                        Expense Ratio
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">0%</p>
                                </Card>
                            </div>
                        </Card>
                    </div>
                )}

                {activeReportTab === "tax" && (
                    <div className="space-y-6">
                        <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
                            <h4 className="text-lg font-bold text-gray-900 mb-6">
                                Tax Summary
                            </h4>
                            <div className="grid grid-cols-3 gap-6 mb-8">
                                <Card className="p-6 bg-blue-50 border border-blue-100 rounded-xl">
                                    <p className="text-sm font-bold text-gray-700 mb-2">
                                        Sales Tax Collected
                                    </p>
                                    <p className="text-3xl font-bold text-blue-600 mb-1">$0.00</p>
                                    <p className="text-xs text-gray-500 font-medium">By state</p>
                                </Card>
                                <Card className="p-6 bg-purple-50 border border-purple-100 rounded-xl">
                                    <p className="text-sm font-bold text-gray-700 mb-2">
                                        VAT Collected
                                    </p>
                                    <p className="text-3xl font-bold text-purple-600 mb-1">
                                        $0.00
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium">
                                        By country
                                    </p>
                                </Card>
                                <Card className="p-6 bg-orange-50 border border-orange-100 rounded-xl">
                                    <p className="text-sm font-bold text-gray-700 mb-2">
                                        1099 Eligible Payments
                                    </p>
                                    <p className="text-3xl font-bold text-orange-600 mb-1">$0</p>
                                    <p className="text-xs text-gray-500 font-medium">
                                        US talent payments
                                    </p>
                                </Card>
                            </div>

                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full h-12 justify-between px-6 rounded-xl border-gray-200 hover:bg-gray-50 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-900">
                                                Export Sales Tax Report
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium">
                                                Breakdown by state/region
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full h-12 justify-between px-6 rounded-xl border-gray-200 hover:bg-gray-50 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                            <Receipt className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-900">
                                                Export VAT Report
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium">
                                                Breakdown by country
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full h-12 justify-between px-6 rounded-xl border-gray-200 hover:bg-gray-50 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                            <FileText className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-900">
                                                Prepare 1099 Forms
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium">
                                                US talent with payments &gt; $600
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default FinancialReportsView;
