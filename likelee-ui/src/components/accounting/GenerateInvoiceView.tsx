import React, { useEffect, useMemo, useState } from "react";

import { Calendar, Eye, Plus, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

import {
  createInvoice,
  getAgencyClients,
  getAgencyTalents,
  listBookings,
} from "@/api/functions";

type LineItemState = {
  id: string;
  description: string;
  talent_id?: string;
  date_of_service?: string;
  rate_type?: string;
  quantity: string;
  unit_price_cents: string;
};

type ExpenseState = {
  id: string;
  description: string;
  amount_cents: string;
  taxable: boolean;
};

export const GenerateInvoiceViewApi = () => {
  const { toast } = useToast();

  const [createFrom, setCreateFrom] = useState<"booking" | "manual">("booking");
  const [selectedBookingId, setSelectedBookingId] = useState<string | undefined>();
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [paymentTerms, setPaymentTerms] = useState("net_30");

  const [poNumber, setPoNumber] = useState("");
  const [projectReference, setProjectReference] = useState("");

  const [currency, setCurrency] = useState("USD");
  const [commissionPct, setCommissionPct] = useState("20");

  const [taxExempt, setTaxExempt] = useState(false);
  const [taxRatePct, setTaxRatePct] = useState("0");
  const [discountCents, setDiscountCents] = useState("0");

  const [notesInternal, setNotesInternal] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState(
    "Payment due within 30 days. Please reference invoice number on payment.",
  );
  const [footerText, setFooterText] = useState("Thank you for your business!");

  const [bookings, setBookings] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [talents, setTalents] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [items, setItems] = useState<LineItemState[]>([
    {
      id: Math.random().toString(36).slice(2),
      description: "",
      quantity: "1",
      unit_price_cents: "0",
    },
  ]);
  const [expenses, setExpenses] = useState<ExpenseState[]>([]);

  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingData(true);
      try {
        const [b, c, t] = await Promise.all([
          listBookings({}),
          getAgencyClients(),
          getAgencyTalents({}),
        ]);
        if (!mounted) return;

        const bookingRows = Array.isArray(b) ? b : [];
        setBookings(
          bookingRows.filter(
            (x) => x?.status === "confirmed" || x?.status === "completed",
          ),
        );
        setClients(Array.isArray(c) ? c : []);
        setTalents(Array.isArray(t) ? t : []);
      } catch (e: any) {
        toast({
          title: "Failed to load invoicing data",
          description: String(e?.message || e),
          variant: "destructive" as any,
        });
      } finally {
        if (mounted) setLoadingData(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [toast]);

  const selectedBooking = useMemo(
    () => bookings.find((b) => b?.id === selectedBookingId),
    [bookings, selectedBookingId],
  );

  useEffect(() => {
    if (createFrom !== "booking") return;
    if (!selectedBooking) return;

    if (selectedBooking?.client_id) {
      setSelectedClientId(selectedBooking.client_id);
    }
    if (selectedBooking?.currency) {
      setCurrency(String(selectedBooking.currency).toUpperCase());
    }

    setItems((prev) => {
      const first = prev[0];
      const next: LineItemState = {
        ...(first || {
          id: Math.random().toString(36).slice(2),
          description: "",
          quantity: "1",
          unit_price_cents: "0",
        }),
        description: first?.description || "Booking services",
        talent_id: selectedBooking?.talent_id || first?.talent_id,
        date_of_service: selectedBooking?.date || first?.date_of_service,
        rate_type: selectedBooking?.rate_type || first?.rate_type,
        unit_price_cents: String(selectedBooking?.rate_cents ?? 0),
      };
      return [next, ...prev.slice(1)];
    });
  }, [createFrom, selectedBooking]);

  const commissionBps = Math.round((Number(commissionPct || "0") || 0) * 100);

  const subtotalCents = items.reduce((sum, it) => {
    const qty = Number(it.quantity || "0") || 0;
    const unit = Number(it.unit_price_cents || "0") || 0;
    return sum + Math.round(qty * unit);
  }, 0);

  const expensesCents = expenses.reduce((sum, ex) => {
    const amt = Number(ex.amount_cents || "0") || 0;
    return sum + amt;
  }, 0);

  const agencyFeeCents = Math.round((subtotalCents * commissionBps) / 10_000);
  const talentNetCents = subtotalCents - agencyFeeCents;

  const money = (cents: number) => {
    const v = (cents || 0) / 100;
    return v.toLocaleString(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    });
  };

  const addLineItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).slice(2),
        description: "",
        quantity: "1",
        unit_price_cents: "0",
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    const next = items.filter((x) => x.id !== id);
    setItems(next.length ? next : items);
  };

  const updateLineItem = (
    id: string,
    field: keyof Omit<LineItemState, "id">,
    value: string,
  ) => {
    setItems(items.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  const addExpense = () => {
    setExpenses([
      ...expenses,
      {
        id: Math.random().toString(36).slice(2),
        description: "",
        amount_cents: "0",
        taxable: false,
      },
    ]);
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const updateExpense = (
    id: string,
    field: keyof Omit<ExpenseState, "id">,
    value: string | boolean,
  ) => {
    setExpenses(
      expenses.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  const payloadForCreate = useMemo(() => {
    return {
      client_id: selectedClientId,
      source_booking_id: createFrom === "booking" ? selectedBookingId : undefined,
      invoice_number: invoiceNumber || undefined,
      invoice_date: invoiceDate,
      due_date: dueDate,
      payment_terms: paymentTerms,
      po_number: poNumber || undefined,
      project_reference: projectReference || undefined,
      currency,
      agency_commission_bps: commissionBps,
      tax_exempt: taxExempt,
      tax_rate_bps: Math.round((Number(taxRatePct || "0") || 0) * 100),
      discount_cents: Number(discountCents || "0") || 0,
      notes_internal: notesInternal || undefined,
      payment_instructions: paymentInstructions || undefined,
      footer_text: footerText || undefined,
      items: items
        .filter((x) => x.description.trim().length > 0)
        .map((x) => ({
          description: x.description,
          talent_id: x.talent_id || undefined,
          date_of_service: x.date_of_service || undefined,
          rate_type: x.rate_type || undefined,
          quantity: Number(x.quantity || "1") || 1,
          unit_price_cents: Number(x.unit_price_cents || "0") || 0,
        })),
      expenses: expenses
        .filter((x) => x.description.trim().length > 0)
        .map((x) => ({
          description: x.description,
          amount_cents: Number(x.amount_cents || "0") || 0,
          taxable: x.taxable,
        })),
    };
  }, [
    commissionBps,
    createFrom,
    currency,
    discountCents,
    dueDate,
    expenses,
    invoiceDate,
    invoiceNumber,
    items,
    notesInternal,
    paymentInstructions,
    paymentTerms,
    poNumber,
    projectReference,
    selectedBookingId,
    selectedClientId,
    taxExempt,
    taxRatePct,
    footerText,
  ]);

  const onSaveDraft = async () => {
    if (!selectedClientId) {
      toast({
        title: "Select a client",
        description: "Bill To (Client Information) is required.",
        variant: "destructive" as any,
      });
      return;
    }

    if (!payloadForCreate.items || payloadForCreate.items.length === 0) {
      toast({
        title: "Add at least one line item",
        description: "Invoice Items is required.",
        variant: "destructive" as any,
      });
      return;
    }

    setSaving(true);
    try {
      const created = await createInvoice(payloadForCreate);
      toast({
        title: "Invoice draft created",
        description: `Invoice ${created?.invoice_number || ""} saved.`,
      });
      setInvoiceNumber(created?.invoice_number || "");
    } catch (e: any) {
      toast({
        title: "Failed to create invoice",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice Generation</h2>
          <p className="text-gray-600 font-medium">Create and manage client invoices</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
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
                className={`h-11 px-6 rounded-xl font-bold flex items-center gap-2 ${
                  createFrom === "booking"
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
                className={`h-11 px-6 rounded-xl font-bold flex items-center gap-2 ${
                  createFrom === "manual"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-gray-200 text-gray-700"
                }`}
                onClick={() => setCreateFrom("manual")}
              >
                Manual Entry
              </Button>
            </div>
          </div>

          {createFrom === "booking" && (
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Select Booking to Invoice
              </Label>
              <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                  <SelectValue placeholder="Choose a completed or confirmed booking" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {bookings.length === 0 && (
                    <SelectItem value="_none" disabled>
                      {loadingData ? "Loading..." : "No bookings found"}
                    </SelectItem>
                  )}
                  {bookings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.client_name || "Client"} • {b.talent_name || "Talent"} • {b.date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Invoice Number
              </Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="h-12 rounded-xl border-gray-200"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-12 rounded-xl border-gray-200"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">Due Date</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 flex-1"
                />
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-200 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                    <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-bold text-gray-700 mb-2 block">Bill To (Client)</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="h-12 rounded-xl border-gray-200">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {clients.length === 0 && (
                  <SelectItem value="_none" disabled>
                    {loadingData ? "Loading..." : "No clients found"}
                  </SelectItem>
                )}
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">PO Number</Label>
              <Input
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="h-12 rounded-xl border-gray-200"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Job/Project Reference
              </Label>
              <Input
                value={projectReference}
                onChange={(e) => setProjectReference(e.target.value)}
                className="h-12 rounded-xl border-gray-200"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-sm font-bold text-gray-700">Invoice Items</Label>
              <Button
                variant="outline"
                onClick={addLineItem}
                className="h-9 px-4 rounded-lg border-gray-200 font-bold flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Line Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((it, idx) => {
                const qty = Number(it.quantity || "0") || 0;
                const unit = Number(it.unit_price_cents || "0") || 0;
                const lineTotal = Math.round(qty * unit);

                return (
                  <Card key={it.id} className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-gray-900">Item #{idx + 1}</p>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(it.id)}
                          className="h-9 w-9 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                          Description
                        </Label>
                        <Textarea
                          value={it.description}
                          onChange={(e) =>
                            updateLineItem(it.id, "description", e.target.value)
                          }
                          className="min-h-[80px] rounded-xl border-gray-200 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-bold text-gray-700 mb-2 block">
                            Talent
                          </Label>
                          <Select
                            value={it.talent_id}
                            onValueChange={(v) => updateLineItem(it.id, "talent_id", v)}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-gray-200">
                              <SelectValue placeholder="Select talent" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {talents.length === 0 && (
                                <SelectItem value="_none" disabled>
                                  {loadingData ? "Loading..." : "No talents found"}
                                </SelectItem>
                              )}
                              {talents.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.full_name || t.name || "Talent"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-gray-700 mb-2 block">
                            Date of Service
                          </Label>
                          <Input
                            type="date"
                            value={it.date_of_service || ""}
                            onChange={(e) =>
                              updateLineItem(it.id, "date_of_service", e.target.value)
                            }
                            className="h-11 rounded-xl border-gray-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs font-bold text-gray-700 mb-2 block">
                            Rate Type
                          </Label>
                          <Input
                            value={it.rate_type || ""}
                            onChange={(e) => updateLineItem(it.id, "rate_type", e.target.value)}
                            className="h-11 rounded-xl border-gray-200"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-gray-700 mb-2 block">
                            Quantity/Hours
                          </Label>
                          <Input
                            type="number"
                            value={it.quantity}
                            onChange={(e) => updateLineItem(it.id, "quantity", e.target.value)}
                            className="h-11 rounded-xl border-gray-200"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-gray-700 mb-2 block">
                            Unit Price (cents)
                          </Label>
                          <Input
                            type="number"
                            value={it.unit_price_cents}
                            onChange={(e) =>
                              updateLineItem(it.id, "unit_price_cents", e.target.value)
                            }
                            className="h-11 rounded-xl border-gray-200"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                        <span className="text-sm font-bold text-gray-700">Line Total:</span>
                        <span className="text-lg font-bold text-gray-900">{money(lineTotal)}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="p-5 bg-white border border-gray-100 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-sm font-bold text-gray-900">Expenses (Optional)</Label>
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
                      value={expense.amount_cents}
                      onChange={(e) =>
                        updateExpense(expense.id, "amount_cents", e.target.value)
                      }
                      className="h-10 rounded-xl border-gray-200 w-28 text-sm"
                    />
                    <Checkbox
                      checked={expense.taxable}
                      onCheckedChange={(checked) =>
                        updateExpense(expense.id, "taxable", checked as boolean)
                      }
                      className="rounded-md w-4 h-4 border-gray-300"
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
              <h4 className="text-sm font-bold text-gray-900">Financial Settings</h4>
              <div>
                <Label className="text-xs font-bold text-gray-700 mb-2 block">
                  Agency Commission (%)
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(e.target.value)}
                    className="h-11 rounded-xl border-gray-200 flex-1"
                  />
                  <span className="text-sm font-bold text-gray-600">%</span>
                </div>
                <p className="text-[10px] text-gray-500 font-medium mt-1">
                  Agency fee: {money(agencyFeeCents)} | Talent net: {money(talentNetCents)}
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700 mb-2 block">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-11 rounded-xl border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                    <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                    <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold text-gray-700">Tax Rate (%)</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={taxExempt}
                      onCheckedChange={(checked) => setTaxExempt(checked as boolean)}
                      className="rounded-md w-4 h-4 border-gray-300"
                    />
                    <span className="text-xs text-gray-600 font-medium">Tax Exempt</span>
                  </div>
                </div>
                <Select
                  value={taxRatePct}
                  onValueChange={setTaxRatePct}
                  disabled={taxExempt}
                >
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
                <Label className="text-xs font-bold text-gray-700 mb-2 block">Discount</Label>
                <Input
                  type="number"
                  value={discountCents}
                  onChange={(e) => setDiscountCents(e.target.value)}
                  className="h-11 rounded-xl border-gray-200"
                />
              </div>
            </div>

            <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl">
              <h4 className="text-sm font-bold text-gray-900 mb-4">Invoice Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">
                    Subtotal ({items.length} items)
                  </span>
                  <span className="text-sm font-bold text-gray-900">{money(subtotalCents)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">
                    Agency Commission ({commissionPct}%)
                  </span>
                  <span className="text-sm font-bold text-red-600">-{money(agencyFeeCents)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-indigo-200">
                  <span className="text-sm text-gray-700 font-medium">Talent Net Amount</span>
                  <span className="text-sm font-bold text-green-600">{money(talentNetCents)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-gray-900">Grand Total</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {money(subtotalCents + expensesCents)}
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
                value={notesInternal}
                onChange={(e) => setNotesInternal(e.target.value)}
                className="min-h-[100px] rounded-xl border-gray-200 resize-none"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-700 mb-2 block">
                Payment Instructions
              </Label>
              <Textarea
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="min-h-[100px] rounded-xl border-gray-200 resize-none"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-700 mb-2 block">Invoice Footer Text</Label>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="h-11 rounded-xl border-gray-200"
            />
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              disabled={saving}
              onClick={onSaveDraft}
              className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Invoice Preview</DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-auto max-h-[60vh]">
            {JSON.stringify(payloadForCreate, null, 2)}
          </pre>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              className="h-10 px-5 rounded-xl border-gray-200 font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
