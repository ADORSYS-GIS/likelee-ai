import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  Calendar,
  Copy,
  Download,
  Eye,
  Mail,
  Plus,
  Printer,
  Save,
  Upload,
  X,
} from "lucide-react";
import likeleeLogoUrl from "../../../media/logo.png";

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
  getInvoice,
  getAgencyProfile,
  getAgencyClients,
  getAgencyTalents,
  listBookings,
  markInvoicePaid,
  markInvoiceSent,
  updateInvoice,
  voidInvoice,
} from "@/api/functions";
import { base44 } from "@/api/base44Client";

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

type AttachmentState = {
  id: string;
  file: File;
};

export const GenerateInvoiceViewApi = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const invoiceIdFromQuery = searchParams.get("invoiceId") || undefined;

  const [createFrom, setCreateFrom] = useState<"booking" | "manual">("booking");
  const [selectedBookingId, setSelectedBookingId] = useState<
    string | undefined
  >();
  const [selectedClientId, setSelectedClientId] = useState<
    string | undefined
  >();

  const [agencyName, setAgencyName] = useState<string>("Your agency");

  const [invoiceId, setInvoiceId] = useState<string | undefined>();
  const [invoiceStatus, setInvoiceStatus] = useState<string>("draft");

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

  const [logoDataUrl, setLogoDataUrl] = useState<string>("");

  const [attachments, setAttachments] = useState<AttachmentState[]>([]);

  const parseBpsToPctString = (bps: any) => {
    const n = Number(bps);
    if (!Number.isFinite(n)) return "0";
    return String(n / 100);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch(likeleeLogoUrl);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Failed to read logo"));
          reader.readAsDataURL(blob);
        });
        if (mounted) setLogoDataUrl(dataUrl);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onDuplicate = () => {
    setInvoiceId(undefined);
    setInvoiceStatus("draft");
    setInvoiceNumber("");
    toast({
      title: "Duplicated draft",
      description: "This is now a new unsaved invoice draft.",
    });
  };

  const validateBeforeSave = () => {
    if (!selectedClientId) {
      toast({
        title: "Select a client",
        description: "Bill To (Client) is required.",
        variant: "destructive" as any,
      });
      return false;
    }
    if (!items.some((x) => x.description.trim().length > 0)) {
      toast({
        title: "Add at least one line item",
        description: "Invoice Items is required.",
        variant: "destructive" as any,
      });
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    if (!validateBeforeSave()) return undefined;

    const created = invoiceId
      ? await updateInvoice(invoiceId, payloadForCreate)
      : await createInvoice(payloadForCreate);

    const nextInvoiceId =
      String(created?.id || created?.invoice?.id || invoiceId || "") ||
      undefined;
    const nextInvoiceNumber = String(
      created?.invoice_number || created?.invoice?.invoice_number || "",
    );
    const nextInvoiceStatus = String(
      created?.status || created?.invoice?.status || invoiceStatus,
    );

    if (nextInvoiceId) setInvoiceId(nextInvoiceId);
    if (nextInvoiceNumber) setInvoiceNumber(nextInvoiceNumber);
    if (nextInvoiceStatus) setInvoiceStatus(nextInvoiceStatus);

    return {
      id: nextInvoiceId,
      invoice_number: nextInvoiceNumber,
      status: nextInvoiceStatus,
    };
  };

  const onEmailToClient = async () => {
    const selectedClient = clients.find((c) => c?.id === selectedClientId);
    const email = selectedClient?.email;
    if (!email) {
      toast({
        title: "Client email missing",
        description: "Select a client with an email address before sending.",
        variant: "destructive" as any,
      });
      return;
    }

    setSaving(true);
    try {
      const saved = await saveDraft();
      if (!saved?.id) {
        return;
      }

      const invNo = saved.invoice_number || invoiceNumber || "";
      const subject = (
        `Invoice from ${agencyName} (sent via Likelee)`.trim() || "Invoice"
      ).trim();

      const lines = [
        `Hello,`,
        ``,
        `You have received an invoice from ${agencyName}.`,
        ``,
        `Likelee is sending this invoice on behalf of ${agencyName}.`,
        ``,
        `Please see the attached invoice.`,
        ``,
        `Regards,`,
        `Likelee`,
      ].filter((x) => x !== "");

      const filenameBase = (invNo || "invoice").replaceAll(
        /[^a-zA-Z0-9_-]+/g,
        "-",
      );
      const invoiceAttachmentHtml = invoiceHtml;
      const attachments = [
        {
          filename: `${filenameBase}.html`,
          content_type: "text/html; charset=utf-8",
          content_base64: toBase64Utf8(invoiceAttachmentHtml),
        },
      ];

      try {
        await base44.post("/integrations/core/send-email", {
          to: email,
          subject,
          body: lines.join("\n"),
          attachments,
        });
        toast({
          title: "Email queued",
          description: `Sent to ${email}.`,
        });
      } catch {
        const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
        window.location.href = mailto;
        toast({
          title: "Opened email client",
          description:
            "Could not send automatically; opened your email app instead.",
        });
      }
    } catch (e: any) {
      toast({
        title: "Failed to send email",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setSaving(false);
    }
  };

  const onDownloadPdf = () => {
    const filenameBase = (invoiceNumber || "invoice").replaceAll(
      /[^a-zA-Z0-9_-]+/g,
      "-",
    );
    const blob = new Blob([invoiceHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast({
      title: "Invoice downloaded",
      description: "Open the downloaded HTML and use Print → Save as PDF.",
    });
  };

  const onPrint = () => {
    const w = window.open("", "_blank");
    if (!w) {
      toast({
        title: "Popup blocked",
        description: "Allow popups to print the invoice.",
        variant: "destructive" as any,
      });
      return;
    }
    w.document.open();
    w.document.write(invoiceHtml);
    w.document.close();
    w.focus();
    w.onload = () => {
      w.print();
    };
  };

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

        try {
          const ap: any = await getAgencyProfile();
          const row = (ap as any) || {};
          const name = String(row?.agency_name || row?.agencyName || "").trim();
          if (name) setAgencyName(name);
        } catch {
          // ignore
        }
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

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!invoiceIdFromQuery) return;
      setLoadingData(true);
      try {
        const detail = await getInvoice(invoiceIdFromQuery);
        if (!mounted) return;

        const inv = (detail as any)?.invoice || {};
        const invItems = Array.isArray((detail as any)?.items)
          ? (detail as any).items
          : [];
        const invExpenses = Array.isArray((detail as any)?.expenses)
          ? (detail as any).expenses
          : [];

        setInvoiceId(String(inv.id || invoiceIdFromQuery));
        setInvoiceStatus(String(inv.status || "draft"));
        setSelectedClientId(inv.client_id ? String(inv.client_id) : undefined);
        setSelectedBookingId(
          inv.booking_id ? String(inv.booking_id) : undefined,
        );
        setCreateFrom(inv.booking_id ? "booking" : "manual");

        setInvoiceNumber(String(inv.invoice_number || ""));
        if (inv.invoice_date) setInvoiceDate(String(inv.invoice_date));
        if (inv.due_date) setDueDate(String(inv.due_date));
        if (inv.payment_terms) setPaymentTerms(String(inv.payment_terms));
        if (inv.po_number) setPoNumber(String(inv.po_number));
        if (inv.project_reference)
          setProjectReference(String(inv.project_reference));
        if (inv.currency) setCurrency(String(inv.currency).toUpperCase());

        setCommissionPct(parseBpsToPctString(inv.agency_commission_bps));
        setTaxExempt(Boolean(inv.tax_exempt));
        setTaxRatePct(parseBpsToPctString(inv.tax_rate_bps));
        setDiscountCents(String(inv.discount_cents ?? 0));

        if (inv.notes_internal) setNotesInternal(String(inv.notes_internal));
        if (inv.payment_instructions)
          setPaymentInstructions(String(inv.payment_instructions));
        if (inv.footer_text) setFooterText(String(inv.footer_text));

        setItems(
          invItems.length
            ? invItems.map((x: any) => ({
                id: String(x.id || Math.random().toString(36).slice(2)),
                description: String(x.description || ""),
                talent_id: x.talent_id ? String(x.talent_id) : undefined,
                date_of_service: x.date_of_service
                  ? String(x.date_of_service)
                  : undefined,
                rate_type: x.rate_type ? String(x.rate_type) : undefined,
                quantity: String(x.quantity ?? "1"),
                unit_price_cents: String(x.unit_price_cents ?? 0),
              }))
            : [
                {
                  id: Math.random().toString(36).slice(2),
                  description: "",
                  quantity: "1",
                  unit_price_cents: "0",
                },
              ],
        );

        setExpenses(
          invExpenses.map((x: any) => ({
            id: String(x.id || Math.random().toString(36).slice(2)),
            description: String(x.description || ""),
            amount_cents: String(x.amount_cents ?? 0),
            taxable: Boolean(x.taxable),
          })),
        );
      } catch (e: any) {
        toast({
          title: "Failed to load invoice",
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
  }, [invoiceIdFromQuery, toast]);

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

  const taxableExpensesCents = expenses.reduce((sum, ex) => {
    if (!ex.taxable) return sum;
    const amt = Number(ex.amount_cents || "0") || 0;
    return sum + amt;
  }, 0);

  const agencyFeeCents = Math.round((subtotalCents * commissionBps) / 10_000);
  const talentNetCents = subtotalCents - agencyFeeCents;

  const taxRateBps = Math.round((Number(taxRatePct || "0") || 0) * 100);
  const discountCentsNum = Number(discountCents || "0") || 0;
  const taxBaseCents = Math.max(
    0,
    subtotalCents + taxableExpensesCents - discountCentsNum,
  );
  const taxCents = taxExempt
    ? 0
    : Math.round((taxBaseCents * taxRateBps) / 10_000);
  const totalCents = Math.max(
    0,
    subtotalCents + expensesCents - discountCentsNum + taxCents,
  );

  const money = (cents: number) => {
    const n = Math.round(Number(cents || 0)) / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
      }).format(n);
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  };

  const toBase64Utf8 = (s: string) => {
    try {
      return btoa(unescape(encodeURIComponent(s)));
    } catch {
      return btoa(s);
    }
  };

  const invoiceHtml = useMemo(() => {
    const h = (v: any) =>
      String(v ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const selectedClient = clients.find((c) => c?.id === selectedClientId);
    const clientCompany = selectedClient?.company || "";
    const clientContact = selectedClient?.contact_name || "";
    const clientEmail = selectedClient?.email || "";

    const itemRows = items
      .filter((x) => x.description.trim().length > 0)
      .map((it) => {
        const qty = Number(it.quantity || "0") || 0;
        const unit = Number(it.unit_price_cents || "0") || 0;
        const lineTotal = Math.round(qty * unit);
        const talentName = it.talent_id
          ? talents.find((t) => t?.id === it.talent_id)?.full_name ||
            talents.find((t) => t?.id === it.talent_id)?.name ||
            ""
          : "";
        const meta = [talentName, it.date_of_service || "", it.rate_type || ""]
          .filter(Boolean)
          .join(" • ");
        return `
          <tr>
            <td>
              <div class="desc">${h(it.description)}</div>
              ${meta ? `<div class="meta">${h(meta)}</div>` : ""}
            </td>
            <td class="num">${h(qty)}</td>
            <td class="num">${h(money(unit))}</td>
            <td class="num total">${h(money(lineTotal))}</td>
          </tr>
        `;
      })
      .join("\n");

    const expenseRows = expenses
      .filter((x) => x.description.trim().length > 0)
      .map((ex) => {
        const amt = Number(ex.amount_cents || "0") || 0;
        return `
          <tr>
            <td>${h(ex.description)}</td>
            <td class="num">${ex.taxable ? "Yes" : "No"}</td>
            <td class="num total">${h(money(amt))}</td>
          </tr>
        `;
      })
      .join("\n");

    const taxLabel = taxExempt
      ? "Tax (exempt)"
      : `Tax${taxRatePct ? ` (${h(taxRatePct)}%)` : ""}`;

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${h(invoiceNumber || "Invoice")}</title>
    <style>
      :root { --fg:#111827; --muted:#6b7280; --border:#e5e7eb; --bg:#ffffff; }
      body { margin: 0; padding: 24px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: var(--fg); background: var(--bg); }
      .wrap { max-width: 900px; margin: 0 auto; }
      .top { display:flex; justify-content:space-between; gap: 24px; align-items:flex-start; }
      .brand { display:flex; align-items:center; gap: 10px; }
      .logo { width: 28px; height: 28px; border-radius: 8px; overflow: hidden; display:flex; align-items:center; justify-content:center; }
      .logo img { width: 28px; height: 28px; object-fit: contain; display:block; }
      .brand-name { font-weight: 800; letter-spacing: .02em; }
      h1 { margin: 0; font-size: 22px; }
      .sub { color: var(--muted); font-size: 13px; margin-top: 4px; overflow-wrap: anywhere; word-break: break-word; }
      .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; }
      .label { font-size: 11px; letter-spacing: .04em; color: var(--muted); font-weight: 700; text-transform: uppercase; }
      .value { margin-top: 6px; font-size: 14px; }
      .card { border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border-top: 1px solid var(--border); padding: 10px 8px; vertical-align: top; font-size: 13px; }
      th { background: #f9fafb; text-align: left; border-top: none; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
      .num { text-align: right; white-space: nowrap; }
      .total { font-weight: 700; }
      .desc { font-weight: 600; }
      .meta { color: var(--muted); font-size: 12px; margin-top: 2px; }
      .section { margin-top: 18px; }
      .totals { margin-top: 14px; border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
      .row { display:flex; justify-content:space-between; gap: 16px; padding: 6px 0; font-size: 13px; }
      .row strong { font-size: 14px; }
      .hr { border-top: 1px solid var(--border); margin: 10px 0; }
      .note { white-space: pre-wrap; font-size: 13px; color: var(--fg); }
      @media print { body { padding: 0; } .wrap { max-width: none; margin: 0; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="top">
        <div>
          <div class="brand">
            <div class="logo">
              <img src="${h(logoDataUrl || "")}" alt="Likelee" />
            </div>
            <div class="brand-name">Likelee</div>
          </div>
          <h1>Invoice</h1>
          <div class="sub">${h(invoiceNumber || "(not assigned yet)")}</div>
        </div>
        <div class="card">
          <div class="row"><span class="label">Invoice date</span><span class="value">${h(invoiceDate)}</span></div>
          <div class="row"><span class="label">Due date</span><span class="value">${h(dueDate)}</span></div>
          <div class="row"><span class="label">Status</span><span class="value">${h(invoiceStatus)}</span></div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="label">Bill To</div>
          <div class="value"><strong>${h(clientCompany || "(no client selected)")}</strong></div>
          ${clientContact ? `<div class="value">${h(clientContact)}</div>` : ""}
          ${clientEmail ? `<div class="value">${h(clientEmail)}</div>` : ""}
        </div>
        <div class="card">
          <div class="label">Reference</div>
          <div class="value">${h(poNumber ? `PO: ${poNumber}` : "")}${poNumber && projectReference ? " • " : ""}${h(projectReference ? `Project: ${projectReference}` : "")}</div>
        </div>
      </div>

      <div class="section">
        <div class="label">Line Items</div>
        <table>
          <thead>
            <tr>
              <th style="width: 58%">Description</th>
              <th class="num" style="width: 12%">Qty</th>
              <th class="num" style="width: 15%">Unit</th>
              <th class="num" style="width: 15%">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || `<tr><td colspan="4" class="meta">No line items</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="label">Expenses</div>
        <table>
          <thead>
            <tr>
              <th style="width: 70%">Description</th>
              <th class="num" style="width: 15%">Taxable</th>
              <th class="num" style="width: 15%">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRows || `<tr><td colspan="3" class="meta">No expenses</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="grid">
        <div class="card">
          <div class="label">Payment Instructions</div>
          <div class="value note">${h(paymentInstructions || "(none provided)")}</div>
          ${footerText ? `<div class="hr"></div><div class="label">Footer</div><div class="value">${h(footerText)}</div>` : ""}
        </div>
        <div class="totals">
          <div class="row"><span>Subtotal</span><span class="total">${h(money(subtotalCents))}</span></div>
          <div class="row"><span>Expenses</span><span class="total">${h(money(expensesCents))}</span></div>
          <div class="row"><span>Discount</span><span class="total">-${h(money(discountCentsNum))}</span></div>
          <div class="row"><span>${h(taxLabel)}</span><span class="total">${h(money(taxCents))}</span></div>
          <div class="hr"></div>
          <div class="row"><strong>Total</strong><strong>${h(money(totalCents))}</strong></div>
          <div class="sub">Agency fee (${h(commissionPct)}%): ${h(money(agencyFeeCents))}<br/>Talent net: ${h(money(talentNetCents))}</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
  }, [
    agencyFeeCents,
    clients,
    commissionPct,
    currency,
    discountCentsNum,
    dueDate,
    expenses,
    expensesCents,
    invoiceDate,
    invoiceNumber,
    invoiceStatus,
    items,
    paymentInstructions,
    poNumber,
    projectReference,
    selectedClientId,
    subtotalCents,
    talentNetCents,
    talents,
    taxCents,
    taxExempt,
    taxRatePct,
    taxableExpensesCents,
    totalCents,
    footerText,
    logoDataUrl,
  ]);

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

  const onAddAttachments = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: AttachmentState[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
    }));
    setAttachments((prev) => [...prev, ...next]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
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
      source_booking_id:
        createFrom === "booking" ? selectedBookingId : undefined,

      invoice_date: invoiceDate || undefined,
      due_date: dueDate || undefined,
      payment_terms: paymentTerms || undefined,
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
    footerText,
  ]);

  const onSaveDraft = async () => {
    setSaving(true);
    try {
      const saved = await saveDraft();
      if (!saved?.id) return;
      toast({
        title: invoiceId ? "Invoice draft updated" : "Invoice draft created",
        description: `Invoice ${saved.invoice_number || ""} saved.`,
      });
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

  const onMarkSent = async () => {
    if (invoiceStatus !== "draft") {
      toast({
        title: "Invalid status",
        description: "Only draft invoices can be marked as sent.",
        variant: "destructive" as any,
      });
      return;
    }
    if (!invoiceId) {
      toast({
        title: "Save the invoice first",
        description: "Create a draft before marking it as sent.",
        variant: "destructive" as any,
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await markInvoiceSent(invoiceId);
      setInvoiceStatus(String(updated?.status || "sent"));
      toast({
        title: "Invoice marked as sent",
        description: `Invoice ${invoiceNumber || ""} updated.`,
      });
    } catch (e: any) {
      toast({
        title: "Failed to mark sent",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setSaving(false);
    }
  };

  const onMarkPaid = async () => {
    if (invoiceStatus !== "sent") {
      toast({
        title: "Invalid status",
        description: "Only sent invoices can be marked as paid.",
        variant: "destructive" as any,
      });
      return;
    }
    if (!invoiceId) {
      toast({
        title: "Save the invoice first",
        description: "Create a draft before marking it as paid.",
        variant: "destructive" as any,
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await markInvoicePaid(invoiceId);
      setInvoiceStatus(String(updated?.status || "paid"));
      toast({
        title: "Invoice marked as paid",
        description: `Invoice ${invoiceNumber || ""} updated.`,
      });
    } catch (e: any) {
      toast({
        title: "Failed to mark paid",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setSaving(false);
    }
  };

  const onVoid = async () => {
    if (invoiceStatus !== "draft" && invoiceStatus !== "sent") {
      toast({
        title: "Invalid status",
        description: "Only draft or sent invoices can be voided.",
        variant: "destructive" as any,
      });
      return;
    }
    if (!invoiceId) {
      toast({
        title: "Save the invoice first",
        description: "Create a draft before voiding it.",
        variant: "destructive" as any,
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await voidInvoice(invoiceId);
      setInvoiceStatus(String(updated?.status || "void"));
      toast({
        title: "Invoice voided",
        description: `Invoice ${invoiceNumber || ""} updated.`,
      });
    } catch (e: any) {
      toast({
        title: "Failed to void invoice",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Invoice Generation
          </h2>
          <p className="text-gray-600 font-medium">
            Create and manage client invoices
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Eye className="w-5 h-5" />
            Preview
          </Button>
        </div>
      </div>

      <Card className="p-4 sm:p-6 bg-white border border-gray-100 rounded-2xl">
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-3 block">
              Create Invoice From
            </Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant={createFrom === "booking" ? "default" : "outline"}
                className={`h-11 px-6 rounded-xl font-bold flex items-center justify-center gap-2 w-full sm:w-auto ${
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
                className={`h-11 px-6 rounded-xl font-bold flex items-center justify-center gap-2 w-full sm:w-auto ${
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
              <Select
                value={selectedBookingId}
                onValueChange={setSelectedBookingId}
              >
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
                      {b.client_name || "Client"} • {b.talent_name || "Talent"}{" "}
                      • {b.date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Invoice Number
              </Label>
              <Input
                value={invoiceNumber}
                disabled
                placeholder="Assigned automatically on save"
                className="h-12 rounded-xl border-gray-200 font-mono"
              />
            </div>
            <div className="md:col-span-1">
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Invoice Date
              </Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-12 rounded-xl border-gray-200"
              />
            </div>
            <div className="md:col-span-1">
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Due Date
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 flex-1"
                />
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-200 w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                    <SelectItem value="due_on_receipt">
                      Due on Receipt
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-bold text-gray-700 mb-2 block">
              Bill To (Client)
            </Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
            >
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                PO Number
              </Label>
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
              <Label className="text-sm font-bold text-gray-700">
                Invoice Items
              </Label>
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
                  <Card
                    key={it.id}
                    className="p-5 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <p className="text-sm font-bold text-gray-900">
                        Item #{idx + 1}
                      </p>
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
                            onValueChange={(v) =>
                              updateLineItem(it.id, "talent_id", v)
                            }
                          >
                            <SelectTrigger className="h-11 rounded-xl border-gray-200">
                              <SelectValue placeholder="Select talent" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {talents.length === 0 && (
                                <SelectItem value="_none" disabled>
                                  {loadingData
                                    ? "Loading..."
                                    : "No talents found"}
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
                              updateLineItem(
                                it.id,
                                "date_of_service",
                                e.target.value,
                              )
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
                            onChange={(e) =>
                              updateLineItem(it.id, "rate_type", e.target.value)
                            }
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
                            onChange={(e) =>
                              updateLineItem(it.id, "quantity", e.target.value)
                            }
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
                              updateLineItem(
                                it.id,
                                "unit_price_cents",
                                e.target.value,
                              )
                            }
                            className="h-11 rounded-xl border-gray-200"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                        <span className="text-sm font-bold text-gray-700">
                          Line Total:
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          {money(lineTotal)}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="p-5 bg-white border border-gray-100 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
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
                  <div
                    key={expense.id}
                    className="flex flex-col sm:flex-row gap-3 sm:items-center"
                  >
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
                        updateExpense(
                          expense.id,
                          "amount_cents",
                          e.target.value,
                        )
                      }
                      className="h-10 rounded-xl border-gray-200 w-full sm:w-28 text-sm"
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(e.target.value)}
                    className="h-11 rounded-xl border-gray-200 flex-1"
                  />
                  <span className="text-sm font-bold text-gray-600">%</span>
                </div>
                <p className="text-[10px] text-gray-500 font-medium mt-1">
                  Agency fee: {money(agencyFeeCents)} | Talent net:{" "}
                  {money(talentNetCents)}
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700 mb-2 block">
                  Currency
                </Label>
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
                <Label className="text-xs font-bold text-gray-700 mb-2 block">
                  Discount
                </Label>
                <Input
                  type="number"
                  value={discountCents}
                  onChange={(e) => setDiscountCents(e.target.value)}
                  className="h-11 rounded-xl border-gray-200"
                />
              </div>
            </div>

            <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl">
              <h4 className="text-sm font-bold text-gray-900 mb-4">
                Invoice Summary
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">
                    Subtotal ({items.length} items)
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {money(subtotalCents)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">
                    Agency Commission ({commissionPct}%)
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    -{money(agencyFeeCents)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-indigo-200">
                  <span className="text-sm text-gray-700 font-medium">
                    Talent Net Amount
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    {money(talentNetCents)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-gray-900">
                    Grand Total
                  </span>
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
            <Label className="text-xs font-bold text-gray-700 mb-2 block">
              Invoice Footer Text
            </Label>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="h-11 rounded-xl border-gray-200"
            />
          </div>

          <Card className="p-5 bg-white border border-gray-100 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
              <div>
                <Label className="text-sm font-bold text-gray-900">
                  Attached Files (Optional)
                </Label>
                <p className="text-xs text-gray-500 font-medium">
                  Attach contracts, usage agreements, or supporting documents.
                </p>
              </div>
              <label>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onAddAttachments(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4 rounded-lg border-gray-200 font-bold flex items-center gap-2 text-sm"
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4" />
                    Upload File
                  </span>
                </Button>
              </label>
            </div>

            {attachments.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                <Upload className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-gray-500 font-bold">No files attached</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {a.file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round((a.file.size / 1024 / 1024) * 10) / 10} MB
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttachment(a.id)}
                      className="h-9 w-9 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
            {(() => {
              const canMarkSent =
                Boolean(invoiceId) && invoiceStatus === "draft";
              const canMarkPaid =
                Boolean(invoiceId) && invoiceStatus === "sent";
              const canVoid =
                Boolean(invoiceId) &&
                (invoiceStatus === "draft" || invoiceStatus === "sent");
              const canDownload = Boolean(invoiceId);
              return (
                <>
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={onSaveDraft}
                    className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save as Draft
                  </Button>

                  <Button
                    variant="outline"
                    disabled={saving || !canMarkSent}
                    onClick={onMarkSent}
                    className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                  >
                    Mark as Sent
                  </Button>

                  <Button
                    disabled={saving || invoiceStatus === "void"}
                    onClick={onEmailToClient}
                    className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Email to Client
                  </Button>

                  <Button
                    variant="outline"
                    disabled={saving || !canDownload}
                    onClick={onDownloadPdf}
                    className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>

                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={onPrint}
                    className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>

                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={onDuplicate}
                    className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </Button>

                  <Button
                    variant="outline"
                    disabled={saving || !canMarkPaid}
                    onClick={onMarkPaid}
                    className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                  >
                    Mark as Paid
                  </Button>

                  <Button
                    variant="outline"
                    disabled={saving || !canVoid}
                    onClick={onVoid}
                    className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                  >
                    Void
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Invoice Preview
            </DialogTitle>
          </DialogHeader>
          <div className="bg-white border border-gray-200 rounded-xl p-5 overflow-auto max-h-[60vh]">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-lg font-bold text-gray-900">Invoice</div>
                <div className="text-sm text-gray-600 break-words max-w-[22rem]">
                  {invoiceNumber || "(not assigned yet)"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Invoice date</div>
                <div className="text-sm font-bold text-gray-900">
                  {invoiceDate}
                </div>
                <div className="mt-2 text-sm text-gray-600">Due date</div>
                <div className="text-sm font-bold text-gray-900">{dueDate}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-bold text-gray-700">Bill To</div>
                <div className="mt-1 text-sm font-bold text-gray-900">
                  {clients.find((c) => c?.id === selectedClientId)?.company ||
                    "(no client selected)"}
                </div>
                {clients.find((c) => c?.id === selectedClientId)
                  ?.contact_name && (
                  <div className="text-sm text-gray-700">
                    {
                      clients.find((c) => c?.id === selectedClientId)
                        ?.contact_name
                    }
                  </div>
                )}
                {clients.find((c) => c?.id === selectedClientId)?.email && (
                  <div className="text-sm text-gray-700">
                    {clients.find((c) => c?.id === selectedClientId)?.email}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-gray-700">Status</div>
                <div className="mt-1 text-sm font-bold text-gray-900">
                  {invoiceStatus}
                </div>
                {(poNumber || projectReference) && (
                  <div className="mt-2 text-sm text-gray-700">
                    {poNumber ? `PO: ${poNumber}` : ""}
                    {poNumber && projectReference ? " • " : ""}
                    {projectReference ? `Project: ${projectReference}` : ""}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-bold text-gray-700 mb-2">
                Line Items
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 px-3 py-2 text-[11px] font-bold text-gray-700">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-2 text-right">Unit</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                {items
                  .filter((x) => x.description.trim().length > 0)
                  .map((it) => {
                    const qty = Number(it.quantity || "0") || 0;
                    const unit = Number(it.unit_price_cents || "0") || 0;
                    const lineTotal = Math.round(qty * unit);
                    return (
                      <div
                        key={it.id}
                        className="grid grid-cols-12 px-3 py-2 text-sm border-t border-gray-200"
                      >
                        <div className="col-span-6">
                          <div className="font-medium text-gray-900">
                            {it.description}
                          </div>
                          <div className="text-xs text-gray-600">
                            {it.talent_id
                              ? talents.find((t) => t?.id === it.talent_id)
                                  ?.full_name ||
                                talents.find((t) => t?.id === it.talent_id)
                                  ?.name ||
                                "Talent"
                              : ""}
                            {it.talent_id && it.date_of_service ? " • " : ""}
                            {it.date_of_service || ""}
                            {(it.talent_id || it.date_of_service) &&
                            it.rate_type
                              ? " • "
                              : ""}
                            {it.rate_type || ""}
                          </div>
                        </div>
                        <div className="col-span-2 text-right text-gray-900">
                          {qty}
                        </div>
                        <div className="col-span-2 text-right text-gray-900">
                          {money(unit)}
                        </div>
                        <div className="col-span-2 text-right font-bold text-gray-900">
                          {money(lineTotal)}
                        </div>
                      </div>
                    );
                  })}
                {items.filter((x) => x.description.trim().length > 0).length ===
                  0 && (
                  <div className="px-3 py-4 text-sm text-gray-600">
                    No line items
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-bold text-gray-700 mb-2">
                Expenses
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 px-3 py-2 text-[11px] font-bold text-gray-700">
                  <div className="col-span-8">Description</div>
                  <div className="col-span-2 text-right">Taxable</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                {expenses
                  .filter((x) => x.description.trim().length > 0)
                  .map((ex) => (
                    <div
                      key={ex.id}
                      className="grid grid-cols-12 px-3 py-2 text-sm border-t border-gray-200"
                    >
                      <div className="col-span-8 text-gray-900">
                        {ex.description}
                      </div>
                      <div className="col-span-2 text-right text-gray-700">
                        {ex.taxable ? "Yes" : "No"}
                      </div>
                      <div className="col-span-2 text-right font-bold text-gray-900">
                        {money(Number(ex.amount_cents || "0") || 0)}
                      </div>
                    </div>
                  ))}
                {expenses.filter((x) => x.description.trim().length > 0)
                  .length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-600">
                    No expenses
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <div className="text-sm text-gray-700">
                <div>
                  <div className="text-xs font-bold text-gray-700">
                    Payment Instructions
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">
                    {paymentInstructions || "(none provided)"}
                  </div>
                </div>
                {footerText && (
                  <div className="mt-4">
                    <div className="text-xs font-bold text-gray-700">
                      Footer
                    </div>
                    <div className="mt-1">{footerText}</div>
                  </div>
                )}
              </div>
              <div className="text-sm">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal</span>
                    <span className="font-bold text-gray-900">
                      {money(subtotalCents)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-700">Expenses</span>
                    <span className="font-bold text-gray-900">
                      {money(expensesCents)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-700">Discount</span>
                    <span className="font-bold text-gray-900">
                      -{money(discountCentsNum)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-700">
                      Tax{" "}
                      {taxExempt
                        ? "(exempt)"
                        : taxRatePct
                          ? `(${taxRatePct}%)`
                          : ""}
                    </span>
                    <span className="font-bold text-gray-900">
                      {money(taxCents)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
                    <span className="text-gray-900 font-bold">Total</span>
                    <span className="text-gray-900 font-bold">
                      {money(totalCents)}
                    </span>
                  </div>
                  <div className="mt-4 text-xs text-gray-600">
                    Agency fee ({commissionPct}%): {money(agencyFeeCents)}
                    <br />
                    Talent net: {money(talentNetCents)}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
