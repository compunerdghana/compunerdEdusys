"use client";

import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReceiptRow {
  id: string;
  receipt_number: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  created_at: string;
  student_id?: string | null;
  reference?: string | null;
  notes?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  students: Record<string, any> | null;
}

export function ReceiptPrintButton({ receipt }: { receipt: ReceiptRow }) {
  function handlePrint() {
    const r = receipt;
    const studentName = r.students ? `${r.students.first_name} ${r.students.last_name}` : "—";
    const className   = r.students?.classrooms?.name ?? "";
    const admNo       = r.students?.admission_number ?? "";
    const date        = new Date(r.payment_date ?? r.created_at).toLocaleDateString("en-GH", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const html = `<!DOCTYPE html><html><head><title>Receipt ${r.receipt_number}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#111;padding:24px;max-width:420px;margin:auto}
  .header{text-align:center;border-bottom:2px solid #262262;padding-bottom:12px;margin-bottom:14px}
  .logo-box{width:48px;height:48px;background:linear-gradient(135deg,#262262,#92278F);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:900;margin-bottom:6px}
  h1{font-size:15px;font-weight:900;color:#262262;letter-spacing:.02em}
  .badge{display:inline-block;background:#262262;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;margin-top:4px;letter-spacing:.05em}
  .amount-box{background:linear-gradient(135deg,#262262,#92278F);color:#fff;border-radius:12px;padding:14px 18px;text-align:center;margin:14px 0}
  .amount-box p{font-size:10px;opacity:.7;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px}
  .amount-box span{font-size:28px;font-weight:900;letter-spacing:-.02em}
  .row{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:12px}
  .row span:first-child{color:#888;font-weight:500}
  .row span:last-child{font-weight:700;text-align:right;max-width:60%}
  .footer{margin-top:16px;text-align:center;font-size:10px;color:#aaa}
  @media print{body{padding:0}}
</style></head><body>
<div class="header">
  <div class="logo-box">✓</div>
  <h1>PAYMENT RECEIPT</h1>
  <div class="badge">${r.receipt_number}</div>
</div>
<div class="amount-box">
  <p>Amount Paid</p>
  <span>${formatCurrency(r.amount)}</span>
</div>
<div class="row"><span>Student</span><span>${studentName}</span></div>
${admNo ? `<div class="row"><span>Admission No.</span><span>${admNo}</span></div>` : ""}
${className ? `<div class="row"><span>Class</span><span>${className}</span></div>` : ""}
<div class="row"><span>Payment Method</span><span>${r.payment_method}</span></div>
<div class="row"><span>Date</span><span>${date}</span></div>
${r.reference ? `<div class="row"><span>Reference / TxID</span><span>${r.reference}</span></div>` : ""}
${r.notes ? `<div class="row"><span>Notes</span><span>${r.notes}</span></div>` : ""}
<div class="footer">Thank you · Keep this receipt for your records</div>
</body></html>`;

    const win = window.open("", "_blank", "width=480,height=680");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }

  return (
    <button
      onClick={handlePrint}
      title="Print receipt"
      className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--neutral-100)] hover:text-[#262262] transition-colors opacity-0 group-hover:opacity-100 shrink-0"
    >
      <Printer size={14} />
    </button>
  );
}
