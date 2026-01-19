import React, { useState } from "react";
import { MOCK_TALENT_EARNINGS } from "../../../data/agencyMockData";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    TrendingUp,
    Calendar,
    DollarSign,
    FileText,
    ArrowLeft,
    Mail,
    Download,
    Printer,
    Search,
} from "lucide-react";

const TalentStatementsView = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("amount-high");
    const [hasUnpaidEarnings, setHasUnpaidEarnings] = useState(false);
    const [selectedTalent, setSelectedTalent] = useState<any>(null);

    if (selectedTalent) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={() => setSelectedTalent(null)}
                            className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to All Talent
                        </Button>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Talent Statement - {selectedTalent.name}
                        </h2>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <Mail className="w-4 h-4" />
                            Email Statement
                        </Button>
                        <Button
                            variant="outline"
                            className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </Button>
                        <Button
                            variant="outline"
                            className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </Button>
                    </div>
                </div>

                <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
                    <div className="flex items-center gap-6">
                        <img
                            src={selectedTalent.photo}
                            alt={selectedTalent.name}
                            className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md"
                        />
                        <div className="space-y-3">
                            <h3 className="text-3xl font-bold text-gray-900">
                                {selectedTalent.name}
                            </h3>
                            <Select defaultValue="all-time">
                                <SelectTrigger className="w-48 h-10 rounded-xl border-gray-200 font-bold text-gray-700">
                                    <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all-time">All Time</SelectItem>
                                    <SelectItem value="this-month">This Month</SelectItem>
                                    <SelectItem value="last-month">Last Month</SelectItem>
                                    <SelectItem value="this-quarter">This Quarter</SelectItem>
                                    <SelectItem value="this-year">This Year</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-4 gap-6">
                    <Card className="p-6 bg-orange-50 border border-orange-100 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-orange-600" />
                            <p className="text-sm font-bold text-gray-700">Total Owed</p>
                        </div>
                        <p className="text-3xl font-bold text-orange-600 mb-1">
                            {selectedTalent.totalOwed}
                        </p>
                        <p className="text-xs text-gray-600 font-medium">0 unpaid jobs</p>
                    </Card>
                    <Card className="p-6 bg-green-50 border border-green-100 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <p className="text-sm font-bold text-gray-700">
                                Total Paid (YTD)
                            </p>
                        </div>
                        <p className="text-3xl font-bold text-green-600 mb-1">
                            {selectedTalent.totalPaidYTD}
                        </p>
                        <p className="text-xs text-gray-600 font-medium">1 paid jobs</p>
                    </Card>
                    <Card className="p-6 bg-purple-50 border border-purple-100 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-purple-600" />
                            <p className="text-sm font-bold text-gray-700">
                                Lifetime Earnings
                            </p>
                        </div>
                        <p className="text-3xl font-bold text-purple-600 mb-1">$2.4</p>
                        <p className="text-xs text-gray-600 font-medium">Avg: $0/mo</p>
                    </Card>
                    <Card className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-bold text-gray-700">Last Payment</p>
                        </div>
                        <p className="text-lg font-bold text-blue-600 mb-1">
                            {selectedTalent.lastPayment}
                        </p>
                    </Card>
                </div>

                <Card className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h4 className="text-lg font-bold text-gray-900">Earnings Detail</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left w-12"></th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        Job Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        Client
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        Gross
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        Commission
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        Net
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        Invoice
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr className="bg-green-50/30">
                                    <td className="px-6 py-4">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                        Jan 12, 2026
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-700">
                                        Emma
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                        Booking for
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                        $3
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-red-600">
                                        -$0.6
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-green-600">
                                        $2.4
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge className="bg-green-100 text-green-700 border-green-200 font-bold">
                                            Paid
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">
                                        2026-1000
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
                        <div className="flex justify-between items-center max-w-md ml-auto">
                            <span className="text-sm text-gray-600 font-bold">
                                Total Gross Amount
                            </span>
                            <span className="text-sm font-bold text-gray-900">$3</span>
                        </div>
                        <div className="flex justify-between items-center max-w-md ml-auto">
                            <span className="text-sm text-gray-600 font-bold">
                                Total Agency Commission (20%)
                            </span>
                            <span className="text-sm font-bold text-red-600">-$0.6</span>
                        </div>
                        <div className="flex justify-between items-center max-w-md ml-auto pt-3 border-t border-gray-200">
                            <span className="text-lg font-bold text-gray-900">
                                Total Talent Net
                            </span>
                            <span className="text-lg font-bold text-green-600">$2.4</span>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Talent Earnings Statements
                    </h2>
                    <p className="text-gray-600 font-medium">
                        View and manage talent payment statements
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                >
                    <Download className="w-5 h-5" />
                    Export All
                </Button>
            </div>

            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search by talent name..."
                        className="pl-10 h-10 bg-white border-gray-200 rounded-xl text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-56 h-10 bg-white border-gray-200 rounded-xl font-bold text-gray-700 text-sm">
                        <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="amount-high">
                            Amount Owed (High to Low)
                        </SelectItem>
                        <SelectItem value="amount-low">
                            Amount Owed (Low to High)
                        </SelectItem>
                        <SelectItem value="total-paid">Total Paid (High to Low)</SelectItem>
                        <SelectItem value="name-az">Name (A-Z)</SelectItem>
                        <SelectItem value="name-za">Name (Z-A)</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2 px-3 h-10 bg-white border border-gray-200 rounded-xl">
                    <Checkbox
                        id="unpaid-earnings"
                        checked={hasUnpaidEarnings}
                        onCheckedChange={(checked) =>
                            setHasUnpaidEarnings(checked as boolean)
                        }
                        className="rounded-md w-4 h-4 border-gray-300"
                    />
                    <Label
                        htmlFor="unpaid-earnings"
                        className="text-sm font-bold text-gray-700 cursor-pointer"
                    >
                        Has Unpaid Earnings
                    </Label>
                </div>
            </div>

            <div className="space-y-3">
                {MOCK_TALENT_EARNINGS.map((talent) => (
                    <Card
                        key={talent.id}
                        className="p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <Checkbox className="rounded-md w-4 h-4 border-gray-300" />
                                <img
                                    src={talent.photo}
                                    alt={talent.name}
                                    className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                                />
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-gray-900">
                                        {talent.name}
                                    </h4>
                                    <p className="text-xs text-gray-600 font-bold">
                                        {talent.totalJobs} total jobs
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 font-bold mb-0.5 uppercase tracking-wider">
                                        Total Owed
                                    </p>
                                    <p className="text-base font-bold text-orange-600">
                                        {talent.totalOwed}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        0 unpaid jobs
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 font-bold mb-0.5 uppercase tracking-wider">
                                        Total Paid (YTD)
                                    </p>
                                    <p className="text-base font-bold text-green-600">
                                        {talent.totalPaidYTD}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        1 paid jobs
                                    </p>
                                </div>
                                <div className="text-right min-w-[100px]">
                                    <p className="text-[10px] text-gray-500 font-bold mb-0.5 uppercase tracking-wider">
                                        Last Payment
                                    </p>
                                    <p className="text-xs text-gray-600 font-medium">
                                        {talent.lastPayment}
                                    </p>
                                </div>
                                <Button
                                    onClick={() => setSelectedTalent(talent)}
                                    className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4" />
                                    View Statement
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default TalentStatementsView;
