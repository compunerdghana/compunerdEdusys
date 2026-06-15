"use client";
import { useEffect, useRef } from "react";
import { X, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  student: { name: string; admissionNumber: string; className: string };
  school: { name: string; address?: string; phone?: string; logo_url?: string; ges_code?: string };
  amount: number;
  method: string;
  invoiceNumber?: string;
  reference?: string;
  momoSenderName?: string;
  momoNumber?: string;
  notes?: string;
  recordedBy?: string;
}

interface Props {
  data: ReceiptData;
  templateId?: number; // 1–5
  onClose: () => void;
}

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash", momo: "Mobile Money (MoMo)", bank: "Bank Transfer", hubtel: "Hubtel",
};

export function PaymentReceiptModal({ data, templateId = 1, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=800,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt ${data.receiptNumber}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
        @media print { body { margin: 0; } }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-[14px] font-bold text-gray-900">Payment Receipt</p>
            <p className="text-[11px] text-gray-500">{data.receiptNumber} — ready to print</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors"
              style={{ background: "linear-gradient(135deg,#262262,#92278F)" }}>
              <Printer className="w-4 h-4" /> Print Receipt
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt preview */}
        <div className="overflow-y-auto flex-1 p-6 bg-gray-50">
          <div ref={printRef}>
            <ReceiptTemplate data={data} id={templateId} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dispatcher ──────────────────────────────────────────────────────────────
function ReceiptTemplate({ data, id }: { data: ReceiptData; id: number }) {
  switch (id) {
    case 2: return <Template2 data={data} />;
    case 3: return <Template3 data={data} />;
    case 4: return <Template4 data={data} />;
    case 5: return <Template5 data={data} />;
    default: return <Template1 data={data} />;
  }
}

// ── Shared components ────────────────────────────────────────────────────────
function MoMoRow({ data }: { data: ReceiptData }) {
  if (data.method !== "momo") return null;
  return (
    <>
      {data.reference && <Row label="MoMo Transaction ID" value={data.reference} />}
      {data.momoSenderName && <Row label="Sender Name" value={data.momoSenderName} />}
      {data.momoNumber && <Row label="Sender Number" value={data.momoNumber} />}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "5px 8px", color: "#555", fontWeight: 600, width: "45%", fontSize: 11 }}>{label}</td>
      <td style={{ padding: "5px 8px", color: "#111", fontSize: 11 }}>{value}</td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1 — Classic Ghana
// ─────────────────────────────────────────────────────────────────────────────
function Template1({ data }: { data: ReceiptData }) {
  return (
    <div style={{ width: "100%", maxWidth: 600, margin: "0 auto", border: "2px solid #111", fontFamily: "Arial, sans-serif", background: "#fff" }}>
      {/* Header */}
      <div style={{ borderBottom: "2px solid #111", padding: "16px 20px", textAlign: "center" }}>
        {data.school.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.school.logo_url} alt="Logo" style={{ width: 60, height: 60, objectFit: "contain", marginBottom: 8 }} />
        )}
        <div style={{ fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{data.school.name}</div>
        {data.school.address && <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>{data.school.address}</div>}
        {data.school.phone && <div style={{ fontSize: 11, color: "#555" }}>Tel: {data.school.phone}</div>}
        {data.school.ges_code && <div style={{ fontSize: 11, color: "#555" }}>GES Code: {data.school.ges_code}</div>}
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", padding: "10px 20px", borderBottom: "1px solid #ccc" }}>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", borderBottom: "2px solid #111", paddingBottom: 2 }}>
          Official Receipt
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "0 20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <tbody>
            <Row label="Receipt No." value={data.receiptNumber} />
            <Row label="Date" value={new Date(data.date).toLocaleDateString("en-GH", { day:"numeric", month:"long", year:"numeric" })} />
            <Row label="Student Name" value={data.student.name} />
            <Row label="Admission No." value={data.student.admissionNumber} />
            <Row label="Class" value={data.student.className} />
            {data.invoiceNumber && <Row label="Invoice No." value={data.invoiceNumber} />}
            <Row label="Payment Method" value={METHOD_LABEL[data.method] ?? data.method} />
            <MoMoRow data={data} />
            {data.notes && <Row label="Notes" value={data.notes} />}
          </tbody>
        </table>

        {/* Amount box */}
        <div style={{ margin: "14px 0", border: "2px solid #111", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Amount Paid</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#111" }}>{formatCurrency(data.amount)}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px dashed #999", padding: "12px 20px", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <div>
          <div style={{ borderTop: "1px solid #555", width: 140, marginTop: 32, paddingTop: 4, fontSize: 10, color: "#555" }}>Received By</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#888", marginTop: 36 }}>This is a computer-generated receipt.</div>
          <div style={{ fontSize: 9, color: "#888" }}>Keep this receipt for your records.</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2 — Modern / Blue Header
// ─────────────────────────────────────────────────────────────────────────────
function Template2({ data }: { data: ReceiptData }) {
  return (
    <div style={{ width: "100%", maxWidth: 600, margin: "0 auto", fontFamily: "Arial, sans-serif", background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
      {/* Gradient header */}
      <div style={{ background: "linear-gradient(135deg,#262262 0%,#92278F 100%)", padding: "24px 24px 20px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {data.school.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.school.logo_url} alt="Logo" style={{ width:52, height:52, objectFit:"contain", marginBottom:8, background:"rgba(255,255,255,0.15)", borderRadius:8, padding:4 }} />
            )}
            <div style={{ fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{data.school.name}</div>
            {data.school.address && <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{data.school.address}</div>}
            {data.school.phone && <div style={{ fontSize: 10, opacity: 0.8 }}>Tel: {data.school.phone}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>Official Receipt</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{data.receiptNumber}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
              {new Date(data.date).toLocaleDateString("en-GH", { day:"numeric", month:"long", year:"numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px" }}>
        {/* Student info */}
        <div style={{ background: "#f8f9ff", border: "1px solid #e0e0f0", borderRadius: 8, padding: "12px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#262262", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Student Details</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{data.student.name}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
            {data.student.admissionNumber} &nbsp;·&nbsp; {data.student.className}
          </div>
        </div>

        {/* Payment details */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {data.invoiceNumber && <Row label="Invoice No." value={data.invoiceNumber} />}
            <Row label="Payment Method" value={METHOD_LABEL[data.method] ?? data.method} />
            <MoMoRow data={data} />
            {data.notes && <Row label="Notes" value={data.notes} />}
          </tbody>
        </table>

        {/* Big amount */}
        <div style={{ background: "linear-gradient(135deg,#262262,#92278F)", borderRadius: 10, padding: "14px 20px", margin: "16px 0 12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Amount Paid</span>
          <span style={{ fontSize: 26, fontWeight: 900 }}>{formatCurrency(data.amount)}</span>
        </div>

        <div style={{ fontSize: 9, color: "#aaa", textAlign: "center", marginTop: 8 }}>
          Computer-generated receipt · Keep for your records
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3 — GES Official
// ─────────────────────────────────────────────────────────────────────────────
function Template3({ data }: { data: ReceiptData }) {
  return (
    <div style={{ width: "100%", maxWidth: 600, margin: "0 auto", fontFamily: "Arial, sans-serif", background: "#fff", border: "1px solid #ccc" }}>
      {/* Top bar */}
      <div style={{ background: "#006600", color: "#fff", textAlign: "center", padding: "6px 12px", fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>
        GHANA EDUCATION SERVICE
      </div>

      {/* School header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: "2px solid #006600" }}>
        {data.school.logo_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={data.school.logo_url} alt="" style={{ width:56, height:56, objectFit:"contain" }} />
          : <div style={{ width:56, height:56, background:"#e8f5e9", border:"1px solid #006600", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#006600", textAlign:"center" }}>SCHOOL SEAL</div>
        }
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase" }}>{data.school.name}</div>
          {data.school.address && <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{data.school.address}</div>}
          {data.school.phone && <div style={{ fontSize: 10, color: "#444" }}>Tel: {data.school.phone}</div>}
          {data.school.ges_code && <div style={{ fontSize: 10, color: "#006600", fontWeight: 700 }}>GES Code: {data.school.ges_code}</div>}
        </div>
      </div>

      {/* Title */}
      <div style={{ background: "#f0f7f0", border: "1px solid #006600", margin: "12px 20px", padding: "6px 12px", textAlign: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#006600", textTransform: "uppercase", letterSpacing: 2 }}>Official Fee Receipt</span>
      </div>

      {/* Ref + date row */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 20px 10px", fontSize: 11 }}>
        <div><strong>Receipt No.:</strong> {data.receiptNumber}</div>
        <div><strong>Date:</strong> {new Date(data.date).toLocaleDateString("en-GH", { day:"numeric", month:"long", year:"numeric" })}</div>
      </div>

      {/* Student + payment table */}
      <div style={{ padding: "0 20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #bbb" }}>
          <thead>
            <tr style={{ background: "#006600", color: "#fff" }}>
              <th style={{ padding: "6px 10px", textAlign: "left", fontSize: 10, fontWeight: 700 }} colSpan={2}>Payment Details</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Student Name", data.student.name],
              ["Admission No.", data.student.admissionNumber],
              ["Class / Form", data.student.className],
              ...(data.invoiceNumber ? [["Invoice No.", data.invoiceNumber]] : []),
              ["Payment Method", METHOD_LABEL[data.method] ?? data.method],
              ...(data.method === "momo" && data.reference ? [["MoMo Transaction ID", data.reference]] : []),
              ...(data.momoSenderName ? [["Sender Name", data.momoSenderName]] : []),
              ...(data.momoNumber ? [["Sender Number", data.momoNumber]] : []),
              ...(data.notes ? [["Notes", data.notes]] : []),
            ].map(([l, v], i) => (
              <tr key={l} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9f9", borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "6px 10px", fontSize: 11, color: "#444", fontWeight: 600, width: "42%" }}>{l}</td>
                <td style={{ padding: "6px 10px", fontSize: 11, color: "#111" }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Amount */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #006600", marginTop: 10 }}>
          <tbody>
            <tr style={{ background: "#006600" }}>
              <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>Total Amount Received (GH₵)</td>
              <td style={{ padding: "10px 12px", fontSize: 22, fontWeight: 900, color: "#fff", textAlign: "right" }}>{formatCurrency(data.amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px 20px 14px" }}>
        {[["Cashier / Accountant", ""], ["Head Teacher / Principal", ""]].map(([role]) => (
          <div key={role} style={{ textAlign: "center", width: "40%" }}>
            <div style={{ borderTop: "1px solid #555", paddingTop: 4, fontSize: 10, color: "#555" }}>{role}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", fontSize: 9, color: "#888", paddingBottom: 10 }}>
        This receipt is valid only when signed and stamped.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4 — Stripe / Corporate
// ─────────────────────────────────────────────────────────────────────────────
function Template4({ data }: { data: ReceiptData }) {
  return (
    <div style={{ width: "100%", maxWidth: 600, margin: "0 auto", fontFamily: "Arial, sans-serif", background: "#fff", display: "flex", border: "1px solid #e0e0e0" }}>
      {/* Left stripe */}
      <div style={{ width: 12, background: "linear-gradient(180deg,#262262,#92278F)", flexShrink: 0 }} />

      {/* Content */}
      <div style={{ flex: 1, padding: "20px 22px" }}>
        {/* School */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            {data.school.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.school.logo_url} alt="" style={{ width:48, height:48, objectFit:"contain", marginBottom:6 }} />
            )}
            <div style={{ fontSize: 15, fontWeight: 800, color: "#262262", textTransform: "uppercase" }}>{data.school.name}</div>
            {data.school.address && <div style={{ fontSize: 10, color: "#777", marginTop: 2 }}>{data.school.address}</div>}
            {data.school.phone && <div style={{ fontSize: 10, color: "#777" }}>Tel: {data.school.phone}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#92278F", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Receipt</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginTop: 2 }}>{data.receiptNumber}</div>
            <div style={{ fontSize: 10, color: "#777", marginTop: 2 }}>
              {new Date(data.date).toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" })}
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "linear-gradient(90deg,#262262,#92278F)", marginBottom: 14 }} />

        {/* Student */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#92278F", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Received From</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{data.student.name}</div>
          <div style={{ fontSize: 11, color: "#555" }}>Admission No.: {data.student.admissionNumber} &nbsp;·&nbsp; {data.student.className}</div>
        </div>

        {/* Details table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
          <tbody>
            {data.invoiceNumber && <Row label="Invoice No." value={data.invoiceNumber} />}
            <Row label="Payment Method" value={METHOD_LABEL[data.method] ?? data.method} />
            <MoMoRow data={data} />
            {data.notes && <Row label="Notes" value={data.notes} />}
          </tbody>
        </table>

        {/* Amount */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", padding: "10px 0", margin: "10px 0" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#262262", textTransform: "uppercase" }}>Amount Paid</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: "#262262" }}>{formatCurrency(data.amount)}</span>
        </div>

        <div style={{ fontSize: 9, color: "#bbb", textAlign: "right", marginTop: 8 }}>Computer-generated receipt · {data.receiptNumber}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 5 — Thermal / Minimal
// ─────────────────────────────────────────────────────────────────────────────
function Template5({ data }: { data: ReceiptData }) {
  const hr = <div style={{ borderTop: "1px dashed #bbb", margin: "8px 0" }} />;
  return (
    <div style={{ width: "100%", maxWidth: 360, margin: "0 auto", fontFamily: "Courier New, monospace", background: "#fff", padding: "20px 18px", border: "1px solid #ddd" }}>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{data.school.name}</div>
        {data.school.address && <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{data.school.address}</div>}
        {data.school.phone && <div style={{ fontSize: 10, color: "#555" }}>{data.school.phone}</div>}
      </div>

      {hr}
      <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>RECEIPT</div>
      {hr}

      {[
        ["No.", data.receiptNumber],
        ["Date", new Date(data.date).toLocaleDateString("en-GH")],
        ["Student", data.student.name],
        ["Adm. No.", data.student.admissionNumber],
        ["Class", data.student.className],
        ...(data.invoiceNumber ? [["Invoice", data.invoiceNumber]] : []),
        ["Method", METHOD_LABEL[data.method] ?? data.method],
        ...(data.method === "momo" && data.reference ? [["MoMo TxID", data.reference]] : []),
        ...(data.momoSenderName ? [["Sender", data.momoSenderName]] : []),
        ...(data.momoNumber ? [["MoMo No.", data.momoNumber]] : []),
        ...(data.notes ? [["Notes", data.notes]] : []),
      ].map(([l, v]) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}>
          <span style={{ color: "#555" }}>{l}</span>
          <span style={{ fontWeight: 700, maxWidth: "55%", textAlign: "right", wordBreak: "break-all" }}>{v}</span>
        </div>
      ))}

      {hr}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 900, padding: "4px 0" }}>
        <span>TOTAL</span>
        <span>{formatCurrency(data.amount)}</span>
      </div>
      {hr}

      <div style={{ textAlign: "center", fontSize: 9, color: "#aaa", marginTop: 10 }}>
        Thank you!<br />Keep this receipt for your records.
      </div>
    </div>
  );
}
