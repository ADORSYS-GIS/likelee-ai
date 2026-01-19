import React, { useState } from "react";
import { MOCK_EXPENSES } from "../../../data/agencyMockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Calendar,
    Package,
    Megaphone,
    Receipt,
    Plus,
    Search,
} from "lucide-react";

const ExpenseTrackingView = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved":
                return "bg-green-50 text-green-700 border-green-200";
            case "pending":
                return "bg-yellow-50 text-yellow-700 border-yellow-200";
            case "rejected":
                return "bg-red-50 text-red-700 border-red-200";
            default:
                return "bg-gray-50 text-gray-700 border-gray-200";
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "Travel":
                return <Calendar className="w-5 h-5 text-orange-600" />;
            case "Equipment":
                return <Package className="w-5 h-5 text-blue-600" />;
            case "Marketing":
                return <Megaphone className="w-5 h-5 text-purple-600" />;
            default:
                return <Receipt className="w-5 h-5 text-gray-600" />;
        }
    };

    const totalExpenses = MOCK_EXPENSES.reduce((sum, expense) => {
        const amount = parseFloat(expense.amount.replace("$", ""));
        return sum + amount;
    }, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Expense Tracking</h2>
                    <p className="text-gray-600 font-medium">
                        Track and manage agency expenses
                    </p>
                </div>
                <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Expense
                </Button>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="Search expenses..."
                        className="pl-12 h-12 bg-white border-gray-100 rounded-xl text-base"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-64 h-12 bg-white border-gray-100 rounded-xl">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-3">
                {MOCK_EXPENSES.map((expense) => (
                    <Card
                        key={expense.id}
                        className="p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                                    {getCategoryIcon(expense.category)}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-base font-bold text-gray-900">
                                        {expense.name}
                                    </h4>
                                    <p className="text-sm text-gray-600 font-bold">
                                        {expense.category} • {expense.date}
                                        {expense.submitter && ` • ${expense.submitter}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge
                                    variant="outline"
                                    className={`text-xs font-bold px-3 py-1 rounded-lg capitalize ${getStatusColor(expense.status)}`}
                                >
                                    {expense.status}
                                </Badge>
                                <span className="text-lg font-bold text-gray-900">
                                    {expense.amount}
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 rounded-2xl">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm font-bold text-gray-700 mb-1">
                            Total Expenses
                        </p>
                        <p className="text-3xl font-bold text-orange-600">
                            ${totalExpenses.toFixed(2)}
                        </p>
                    </div>
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                        <Receipt className="w-8 h-8 text-orange-600" />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ExpenseTrackingView;
