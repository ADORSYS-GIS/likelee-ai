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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Download,
    Eye,
    Calendar,
    FileText,
    Plus,
    X,
    Upload,
    Save,
    CheckCircle2,
    Send,
    Printer,
    Files,
} from "lucide-react";

const GenerateInvoiceView = () => {
    const [createFrom, setCreateFrom] = useState("booking");
    const [invoiceNumber, setInvoiceNumber] = useState("INV-2026-6174");
    const [commission, setCommission] = useState("20");
    const [taxExempt, setTaxExempt] = useState(false);
    const [expenses, setExpenses] = useState<
        { id: string; description: string; amount: string }[]
    >([]);

    const addExpense = () => {
        setExpenses([
            ...expenses,
            {
                id: Math.random().toString(36).substr(2, 9),
                description: "",
                amount: "0",
            },
        ]);
    };

    const removeExpense = (id: string) => {
        setExpenses(expenses.filter((e) => e.id !== id));
    };

    const updateExpense = (
        id: string,
        field: "description" | "amount",
        value: string,
    ) => {
        setExpenses(
            expenses.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Invoice Generation
                    </h2>
                    <p className="text-gray-600 font-medium">
                        Create and manage client invoices
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        Load Template
                    </Button>
                    <Button
                        variant="outline"
                        className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                    >
                        <Eye className="w-5 h-5" />
                        Preview
                    </Button>
                </div>
            </div>

            <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
                <div className="space-y-6">
                    <div>
                        <Label className="text-sm font-bold text-gray-700 mb-3 block">
                            Create Invoice From
                        </Label>
                        <div className="flex gap-3">
                            <Button
                                variant={createFrom === "booking" ? "default" : "outline"}
                                className={`h-11 px-6 rounded-xl font-bold flex items-center gap-2 ${createFrom === "booking"
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                    : "border-gray-200 text-gray-700"
                                    }`}
                                onClick={() => setCreateFrom("booking")}
                            >
                                <Calendar className="w-5 h-5" />
                                Existing Booking
                            </Button>
                            <Button
                                variant={createFrom === "manual" ? "default" : "outline"}
                                className={`h-11 px-6 rounded-xl font-bold flex items-center gap-2 ${createFrom === "manual"
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                    : "border-gray-200 text-gray-700"
                                    }`}
                                onClick={() => setCreateFrom("manual")}
                            >
                                <FileText className="w-5 h-5" />
                                Manual Entry
                            </Button>
                        </div>
                    </div>

                    {createFrom === "booking" && (
                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">
                                Select Booking to Invoice
                            </Label>
                            <Select>
                                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                                    <SelectValue placeholder="Choose a completed or confirmed booking" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="booking1">
                                        Booking #2026-001 - Nike Campaign
                                    </SelectItem>
                                    <SelectItem value="booking2">
                                        Booking #2026-002 - Adidas Shoot
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">
                                Invoice Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className="h-12 rounded-xl border-gray-200"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">
                                Invoice Date <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="date"
                                defaultValue="2026-01-13"
                                className="h-12 rounded-xl border-gray-200"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">
                                Due Date <span className="text-red-500">*</span>
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    defaultValue="2026-02-13"
                                    className="h-12 rounded-xl border-gray-200 flex-1"
                                />
                                <Select defaultValue="net30">
                                    <SelectTrigger className="h-12 rounded-xl border-gray-200 w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="net15">Net 15</SelectItem>
                                        <SelectItem value="net30">Net 30</SelectItem>
                                        <SelectItem value="net60">Net 60</SelectItem>
                                        <SelectItem value="due-on-receipt">
                                            Due on Receipt
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-bold text-gray-700 mb-2 block">
                            Bill To (Client Information){" "}
                            <span className="text-red-500">*</span>
                        </Label>
                        <Select>
                            <SelectTrigger className="h-12 rounded-xl border-gray-200">
                                <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="nike">Nike Global</SelectItem>
                                <SelectItem value="adidas">Adidas</SelectItem>
                                <SelectItem value="apple">Apple Inc.</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">
                                PO Number (Optional)
                            </Label>
                            <Input
                                placeholder="Client purchase order number"
                                className="h-12 rounded-xl border-gray-200"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">
                                Job/Project Reference (Optional)
                            </Label>
                            <Input
                                placeholder="Project name or reference"
                                className="h-12 rounded-xl border-gray-200"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <Label className="text-sm font-bold text-gray-700">
                                Invoice Items <span className="text-red-500">*</span>
                            </Label>
                            <Button
                                variant="outline"
                                className="h-9 px-4 rounded-lg border-gray-200 font-bold flex items-center gap-2 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Line Item
                            </Button>
                        </div>
                        <Card className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
                            <p className="text-sm font-bold text-gray-900 mb-4">Item #1</p>
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs font-bold text-gray-700 mb-2 block">
                                        Description
                                    </Label>
                                    <Textarea
                                        placeholder="e.g., Model services for brand photoshoot"
                                        className="min-h-[80px] rounded-xl border-gray-200 resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                                            Talent
                                        </Label>
                                        <Select>
                                            <SelectTrigger className="h-11 rounded-xl border-gray-200">
                                                <SelectValue placeholder="Select talent" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="emma">Emma</SelectItem>
                                                <SelectItem value="milan">Milan</SelectItem>
                                                <SelectItem value="julia">Julia</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                                            Date of Service
                                        </Label>
                                        <Input
                                            type="date"
                                            className="h-11 rounded-xl border-gray-200"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                                            Rate Type
                                        </Label>
                                        <Select defaultValue="day">
                                            <SelectTrigger className="h-11 rounded-xl border-gray-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="day">Day Rate</SelectItem>
                                                <SelectItem value="hourly">Hourly Rate</SelectItem>
                                                <SelectItem value="project">Project Rate</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                                            Quantity/Hours
                                        </Label>
                                        <Input
                                            type="number"
                                            defaultValue="1"
                                            className="h-11 rounded-xl border-gray-200"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                                            Unit Price ($)
                                        </Label>
                                        <Input
                                            type="number"
                                            defaultValue="0"
                                            className="h-11 rounded-xl border-gray-200"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                    <span className="text-sm font-bold text-gray-700">
                                        Line Total:
                                    </span>
                                    <span className="text-lg font-bold text-gray-900">$0.00</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <Card className="p-5 bg-white border border-gray-100 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <Label className="text-sm font-bold text-gray-900">
                                Expenses (Optional)
                            </Label>
                            <Button
                                variant="outline"
                                onClick={addExpense}
                                className="h-9 px-4 rounded-lg border-gray-200 font-bold flex items-center gap-2 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Expense
                            </Button>
                        </div>

                        {expenses.length > 0 && (
                            <div className="space-y-3">
                                {expenses.map((expense) => (
                                    <div key={expense.id} className="flex gap-3 items-center">
                                        <Input
                                            placeholder="Expense description"
                                            value={expense.description}
                                            onChange={(e) =>
                                                updateExpense(expense.id, "description", e.target.value)
                                            }
                                            className="h-10 rounded-xl border-gray-200 flex-1 text-sm"
                                        />
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={expense.amount}
                                            onChange={(e) =>
                                                updateExpense(expense.id, "amount", e.target.value)
                                            }
                                            className="h-10 rounded-xl border-gray-200 w-24 text-sm"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeExpense(expense.id)}
                                            className="h-10 w-10 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-900">
                                Financial Settings
                            </h4>
                            <div>
                                <Label className="text-xs font-bold text-gray-700 mb-2 block">
                                    Agency Commission (%)
                                </Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="number"
                                        value={commission}
                                        onChange={(e) => setCommission(e.target.value)}
                                        className="h-11 rounded-xl border-gray-200 flex-1"
                                    />
                                    <span className="text-sm font-bold text-gray-600">%</span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-medium mt-1">
                                    Agency fee: $0.00 | Talent net: $0.00
                                </p>
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-gray-700 mb-2 block">
                                    Currency
                                </Label>
                                <Select defaultValue="usd">
                                    <SelectTrigger className="h-11 rounded-xl border-gray-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="usd">$ US Dollar (USD)</SelectItem>
                                        <SelectItem value="eur">€ Euro (EUR)</SelectItem>
                                        <SelectItem value="gbp">£ British Pound (GBP)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs font-bold text-gray-700">
                                        Tax Rate (%)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={taxExempt}
                                            onCheckedChange={(checked) =>
                                                setTaxExempt(checked as boolean)
                                            }
                                            className="rounded-md w-4 h-4 border-gray-300"
                                        />
                                        <span className="text-xs text-gray-600 font-medium">
                                            Tax Exempt
                                        </span>
                                    </div>
                                </div>
                                <Select defaultValue="0" disabled={taxExempt}>
                                    <SelectTrigger className="h-11 rounded-xl border-gray-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="0">0% - No Tax</SelectItem>
                                        <SelectItem value="5">5%</SelectItem>
                                        <SelectItem value="10">10%</SelectItem>
                                        <SelectItem value="15">15%</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-gray-700 mb-2 block">
                                    Discount
                                </Label>
                                <div className="flex gap-2">
                                    <Select defaultValue="dollar">
                                        <SelectTrigger className="h-11 rounded-xl border-gray-200 w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="dollar">$</SelectItem>
                                            <SelectItem value="percent">%</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        defaultValue="0"
                                        className="h-11 rounded-xl border-gray-200 flex-1"
                                    />
                                </div>
                            </div>
                        </div>

                        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl">
                            <h4 className="text-sm font-bold text-gray-900 mb-4">
                                Invoice Summary
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700 font-medium">
                                        Subtotal (1 items)
                                    </span>
                                    <span className="text-sm font-bold text-gray-900">$0.00</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700 font-medium">
                                        Agency Commission (20%)
                                    </span>
                                    <span className="text-sm font-bold text-red-600">-$0.00</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-indigo-200">
                                    <span className="text-sm text-gray-700 font-medium">
                                        Talent Net Amount
                                    </span>
                                    <span className="text-sm font-bold text-green-600">
                                        $0.00
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-lg font-bold text-gray-900">
                                        Grand Total
                                    </span>
                                    <span className="text-2xl font-bold text-indigo-600">
                                        $0.00
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <Label className="text-xs font-bold text-gray-700 mb-2 block">
                                Additional Notes (Optional)
                            </Label>
                            <Textarea
                                placeholder="Internal notes, special terms, or additional details..."
                                className="min-h-[100px] rounded-xl border-gray-200 resize-none"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-bold text-gray-700 mb-2 block">
                                Payment Instructions
                            </Label>
                            <Textarea
                                defaultValue="Payment due within 30 days. Please reference invoice number on payment."
                                className="min-h-[100px] rounded-xl border-gray-200 resize-none"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                            Invoice Footer Text
                        </Label>
                        <Input
                            defaultValue="Thank you for your business!"
                            className="h-11 rounded-xl border-gray-200"
                        />
                    </div>

                    <div>
                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                            Attached Files (Optional)
                        </Label>
                        <p className="text-xs text-gray-500 font-medium mb-3">
                            Attach contracts, usage agreements, or supporting documents
                        </p>
                        <Button
                            variant="outline"
                            className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Upload File
                        </Button>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-gray-200">
                        <Button
                            variant="outline"
                            className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save as Draft
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Mark as Sent
                        </Button>
                        <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2">
                            <Send className="w-4 h-4" />
                            Email to Client
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                        >
                            <Files className="w-4 h-4" />
                            Duplicate
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default GenerateInvoiceView;
