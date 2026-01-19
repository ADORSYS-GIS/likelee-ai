import React, { useState } from "react";
import { MOCK_PAYMENTS } from "../../../data/agencyMockData";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";

const PaymentTrackingView = () => {
    const [reminder3Days, setReminder3Days] = useState(true);
    const [reminderDueDate, setReminderDueDate] = useState(true);
    const [reminder7Days, setReminder7Days] = useState(true);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Payment Tracking</h2>
                <p className="text-gray-600 font-medium">
                    Monitor payments and manage reminders
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl">
                    <p className="text-sm font-bold text-gray-700 mb-2">
                        Paid This Month
                    </p>
                    <p className="text-3xl font-bold text-green-600 mb-1">$3</p>
                    <p className="text-xs text-gray-600 font-medium">1 invoices</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 rounded-2xl">
                    <p className="text-sm font-bold text-gray-700 mb-2">
                        Pending Payment
                    </p>
                    <p className="text-3xl font-bold text-yellow-600 mb-1">$0</p>
                    <p className="text-xs text-gray-600 font-medium">0 invoices</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
                    <p className="text-sm font-bold text-gray-700 mb-2">
                        Partial Payments
                    </p>
                    <p className="text-3xl font-bold text-blue-600 mb-1">$0</p>
                    <p className="text-xs text-gray-600 font-medium">0 invoices</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-2xl">
                    <p className="text-sm font-bold text-gray-700 mb-2">Overdue</p>
                    <p className="text-3xl font-bold text-red-600 mb-1">$0</p>
                    <p className="text-xs text-gray-600 font-medium">0 invoices</p>
                </Card>
            </div>

            <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Recent Payments
                </h3>
                <div className="space-y-3">
                    {MOCK_PAYMENTS.map((payment) => (
                        <div
                            key={payment.id}
                            className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-xl"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        Invoice {payment.invoiceNumber} • {payment.client}
                                    </p>
                                    <p className="text-xs text-gray-600 font-medium">
                                        {payment.date}
                                    </p>
                                </div>
                            </div>
                            <span className="text-lg font-bold text-green-600">
                                {payment.amount}
                            </span>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Payment Reminder Settings
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <div>
                            <p className="text-sm font-bold text-gray-900">
                                Auto-send reminder 3 days before due date
                            </p>
                            <p className="text-xs text-gray-600 font-medium">
                                Polite reminder template
                            </p>
                        </div>
                        <Checkbox
                            checked={reminder3Days}
                            onCheckedChange={(checked) =>
                                setReminder3Days(checked as boolean)
                            }
                            className="rounded-md w-6 h-6 border-gray-300"
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <div>
                            <p className="text-sm font-bold text-gray-900">
                                Auto-send reminder on due date
                            </p>
                            <p className="text-xs text-gray-600 font-medium">
                                Payment due today template
                            </p>
                        </div>
                        <Checkbox
                            checked={reminderDueDate}
                            onCheckedChange={(checked) =>
                                setReminderDueDate(checked as boolean)
                            }
                            className="rounded-md w-6 h-6 border-gray-300"
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                        <div>
                            <p className="text-sm font-bold text-gray-900">
                                Auto-send reminder 7 days after due date
                            </p>
                            <p className="text-xs text-gray-600 font-medium">
                                Firm reminder template
                            </p>
                        </div>
                        <Checkbox
                            checked={reminder7Days}
                            onCheckedChange={(checked) =>
                                setReminder7Days(checked as boolean)
                            }
                            className="rounded-md w-6 h-6 border-gray-300"
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default PaymentTrackingView;
