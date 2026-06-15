"use client";

import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SchoolInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  headmaster_signature_url: string | null;
  motto: string | null;
}

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

function toWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function below1000(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? " "+ones[num%10] : "");
    return ones[Math.floor(num/100)] + " Hundred" + (num%100 ? " "+below1000(num%100) : "");
  }
  const intPart = Math.floor(n);
  const cents = Math.round((n - intPart) * 100);
  let result = "";
  if (intPart >= 1000000) { result += below1000(Math.floor(intPart/1000000)) + " Million "; }
  if (intPart >= 1000) { result += below1000(Math.floor((intPart%1000000)/1000)) + " Thousand "; }
  if (intPart % 1000) { result += below1000(intPart%1000); }
  result = result.trim();
  if (cents) result += ` and ${cents}/100`;
  return result + " Ghana Cedis Only";
}

export function ReceiptPrintButton({ receipt, school }: { receipt: ReceiptRow; school?: SchoolInfo | null }) {
  function handlePrint() {
    const r = receipt;
    const studentName = r.students ? `${r.students.first_name ?? ""} ${r.students.last_name ?? ""}`.trim() : "—";
    const className   = r.students?.classrooms?.name ?? "—";
    const admNo       = r.students?.admission_number ?? "—";
    const date        = new Date(r.payment_date ?? r.created_at).toLocaleDateString("en-GH", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    const schoolName  = school?.name ?? "School Name";
    const schoolAddr  = school?.address ?? "";
    const schoolPhone = school?.phone ?? "";
    const logoUrl     = school?.logo_url ?? "";
    const sigUrl      = school?.headmaster_signature_url ?? "";
    const amountWords = toWords(r.amount);
    const counterNo   = r.reference ? r.reference.slice(0, 12) : r.receipt_number;

    // Dummy fee items — in future pass from invoice items
    const items = [
      { sl: 1, desc: "School Fees", due: r.amount, con: 0, paid: r.amount },
    ];

    const html = `<!DOCTYPE html>
<html>
<head>
<title>Fee Receipt ${r.receipt_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
  .page { width: 740px; margin: 0 auto; padding: 20px 28px 20px; }

  /* HEADER */
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 6px; }
  .logo-wrap { width: 70px; height: 70px; flex-shrink: 0; }
  .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
  .logo-placeholder { width: 70px; height: 70px; background: #f3f4f6; border-radius: 8px; }
  .school-info { flex: 1; text-align: center; }
  .school-name { font-size: 22px; font-weight: 900; color: #1a237e; letter-spacing: 0.01em; }
  .school-addr { font-size: 11px; color: #333; margin-top: 2px; }
  .right-space { width: 70px; }

  /* RECEIPT TITLE */
  .receipt-title { text-align: center; margin: 8px 0; }
  .receipt-title-box { display: inline-block; border: 2px solid #222; padding: 3px 40px; font-size: 14px; font-weight: 700; letter-spacing: 0.1em; }

  /* META TABLE */
  .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #999; }
  .meta-table td { padding: 4px 8px; border: 1px solid #bbb; font-size: 11px; }
  .meta-table td.label { color: #555; width: 90px; }
  .meta-table td.value { font-weight: 600; }

  /* FEE TABLE */
  .fee-table { width: 100%; border-collapse: collapse; border: 1px solid #999; margin-bottom: 10px; }
  .fee-table th { background: #e8e8e8; border: 1px solid #999; padding: 5px 8px; font-size: 11px; text-align: center; font-weight: 700; }
  .fee-table td { border: 1px solid #bbb; padding: 5px 8px; font-size: 11px; }
  .fee-table td.center { text-align: center; }
  .fee-table td.right { text-align: right; font-family: monospace; }
  .fee-table tr.total-row td { font-weight: 700; background: #f5f5f5; border-top: 2px solid #999; }

  /* PAY MODE */
  .section-title { font-size: 12px; font-weight: 700; text-align: center; background: #e8e8e8; border: 1px solid #999; border-bottom: none; padding: 4px; letter-spacing: 0.08em; }
  .pay-table { width: 100%; border-collapse: collapse; border: 1px solid #999; margin-bottom: 10px; }
  .pay-table td { border: 1px solid #bbb; padding: 4px 8px; font-size: 11px; }
  .pay-table td.label { color: #555; width: 80px; }
  .pay-table td.value { font-weight: 600; }

  /* TOTAL WORDS */
  .total-box { border: 1px solid #999; padding: 6px 10px; margin-bottom: 10px; }
  .total-box .total-line { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
  .total-box .total-label { font-size: 13px; font-weight: 700; }
  .total-box .total-amount { font-size: 16px; font-weight: 900; font-family: monospace; }
  .total-box .words { font-size: 11px; color: #333; }

  /* QR + NOTE */
  .qr-note { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
  .qr-placeholder { width: 60px; height: 60px; background: #f3f4f6; border: 1px solid #ccc; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #aaa; text-align: center; }
  .note-text { font-size: 10px; color: #555; line-height: 1.5; flex: 1; }
  .note-text strong { font-weight: 700; color: #111; }
  .computer-note { text-align: center; font-size: 10px; color: #555; margin-bottom: 12px; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 4px 0; }

  /* SIGNATURES */
  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
  .sig-block { text-align: center; flex: 1; }
  .sig-img { height: 45px; max-width: 130px; object-fit: contain; margin: 0 auto 4px; display: block; }
  .sig-line { border-top: 1px solid #333; width: 160px; margin: 0 auto 3px; }
  .sig-name { font-size: 11px; font-weight: 700; }
  .sig-title { font-size: 10px; color: #555; }

  /* FOOTER */
  .footer { text-align: center; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; border-top: 2px solid #222; padding-top: 6px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 10px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    ${logoUrl ? `<div class="logo-wrap"><img src="${logoUrl}" alt="logo"/></div>` : `<div class="logo-placeholder"></div>`}
    <div class="school-info">
      <div class="school-name">${schoolName}</div>
      ${schoolAddr ? `<div class="school-addr">${schoolAddr}${schoolPhone ? " · " + schoolPhone : ""}</div>` : ""}
    </div>
    <div class="right-space"></div>
  </div>

  <!-- RECEIPT TITLE -->
  <div class="receipt-title">
    <div class="receipt-title-box">FEE RECEIPT</div>
  </div>

  <!-- META TABLE (2×3 grid) -->
  <table class="meta-table">
    <tr>
      <td class="label">Receipt No</td>
      <td class="value">: ${r.receipt_number}</td>
      <td class="label">Date</td>
      <td class="value">: ${date}</td>
    </tr>
    <tr>
      <td class="label">Adm No</td>
      <td class="value">: ${admNo}</td>
      <td class="label">Session</td>
      <td class="value">: ${new Date().getFullYear()}–${new Date().getFullYear()+1}</td>
    </tr>
    <tr>
      <td class="label">Name</td>
      <td class="value">: ${studentName}</td>
      <td class="label">Class</td>
      <td class="value">: ${className}</td>
    </tr>
    <tr>
      <td class="label">Installment</td>
      <td class="value">: —</td>
      <td class="label">CounterNo</td>
      <td class="value">: ${counterNo}</td>
    </tr>
  </table>

  <!-- FEE TABLE -->
  <table class="fee-table">
    <thead>
      <tr>
        <th style="width:40px">Sl.No</th>
        <th style="text-align:left">Description</th>
        <th style="width:100px">Due</th>
        <th style="width:80px">Con</th>
        <th style="width:100px">Paid</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((it, i) => `
      <tr>
        <td class="center">${i+1}</td>
        <td>${it.desc}</td>
        <td class="right">${it.due.toFixed(2)}</td>
        <td class="right">${it.con.toFixed(2)}</td>
        <td class="right">${it.paid.toFixed(2)}</td>
      </tr>`).join("")}
      ${Array(Math.max(0, 5 - items.length)).fill(0).map(() => `
      <tr>
        <td class="center">&nbsp;</td><td>&nbsp;</td><td></td><td></td><td></td>
      </tr>`).join("")}
    </tbody>
  </table>

  <!-- PAY MODE INFORMATION -->
  <div class="section-title">PAY MODE INFORMATION</div>
  <table class="pay-table">
    <tr>
      <td class="label">Pay Mode</td>
      <td class="value">${r.payment_method}</td>
      <td class="label">Date</td>
      <td class="value">${date}</td>
    </tr>
    <tr>
      <td class="label">Bank</td>
      <td class="value">${r.notes ?? "—"}</td>
      <td class="label">Number</td>
      <td class="value">${r.reference ?? "—"}</td>
    </tr>
    <tr>
      <td class="label">Total</td>
      <td class="value" colspan="3">${r.amount.toFixed(2)}</td>
    </tr>
  </table>

  <!-- TOTAL BOX -->
  <div class="total-box">
    <div class="total-line">
      <span class="total-label">Total :</span>
      <span class="total-amount">${r.amount.toFixed(2)}</span>
    </div>
    <div class="words">Total in Words: ${amountWords}</div>
  </div>

  <!-- QR + NOTE -->
  <div class="qr-note">
    <div class="qr-placeholder">QR<br/>Code</div>
    <div class="note-text">
      <strong>Note:</strong> ${r.reference ? r.reference : r.receipt_number}
    </div>
  </div>

  <!-- COMPUTER NOTE -->
  <div class="computer-note">This is a computer generated Receipt. Does not require signature.</div>

  <!-- SIGNATURES -->
  <div class="sig-row">
    <div class="sig-block">
      ${sigUrl ? `<img class="sig-img" src="${sigUrl}" alt="signature"/>` : `<div style="height:45px"></div>`}
      <div class="sig-line"></div>
      <div class="sig-name">Head Teacher / Principal</div>
      <div class="sig-title">${schoolName}</div>
    </div>
    <div class="sig-block">
      <div style="height:45px"></div>
      <div class="sig-line"></div>
      <div class="sig-name">Finance Officer</div>
      <div class="sig-title">${schoolName}</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">PARENT COPY</div>

</div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
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
