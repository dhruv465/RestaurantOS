// Small thermal-printer-width print layouts (80 mm paper). Everything from the order is escaped:
// names and notes are typed by people.
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (paise) => `₹${((paise || 0) / 100).toFixed(2)}`;
const row = (left, right, bold) => `<div class="row${bold ? " b" : ""}"><span>${left}</span><span>${right}</span></div>`;

const STYLE = `
  body { font-family: ui-monospace, Menlo, monospace; font-size: 12px; width: 72mm; margin: 4mm; color: #000; }
  h1 { font-size: 15px; margin: 0 0 2px; text-align: center; } .c { text-align: center; } .b { font-weight: bold; }
  .row { display: flex; justify-content: space-between; gap: 8px; } hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  .big { font-size: 18px; } .note { font-style: italic; padding-left: 12px; } .mods { padding-left: 12px; }`;

// Prints in a hidden iframe so no popup blocker gets in the way.
export const printHtml = (title, body) => {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLE}</style></head><body>${body}</body></html>`);
  doc.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 1000);
};

const lineItems = (items) =>
  items
    .map(
      (i) =>
        row(`${esc(i.quantity)} × ${esc(i.name)}`, money(i.unitPaise ? i.unitPaise * i.quantity : i.price * 100)) +
        ((i.modifiers || []).length ? `<div class="mods">${i.modifiers.map((m) => esc(m.name)).join(", ")}</div>` : "")
    )
    .join("");

// GST bill. Intra-state sale: the tax is shown as equal CGST and SGST halves.
export const receiptHtml = (order, settings = {}) => {
  const b = order.bills || {};
  const taxPaise = b.taxPaise ?? Math.round((b.tax || 0) * 100);
  const cgst = Math.floor(taxPaise / 2);
  const rate = b.taxRatePercent ?? settings.taxRatePercent ?? 0;
  const where = order.table?.tableNo ? `Table ${order.table.tableNo}` : order.type || "";
  return `
    <h1>${esc(settings.restaurantName || "Restaurant")}</h1>
    ${settings.address ? `<div class="c">${esc(settings.address)}</div>` : ""}
    ${settings.phone ? `<div class="c">Ph: ${esc(settings.phone)}</div>` : ""}
    ${settings.gstin ? `<div class="c">GSTIN: ${esc(settings.gstin)}</div>` : ""}
    <hr>
    ${row(`Bill #${esc(order.orderNo || "")}`, esc(new Date(order.createdAt || order.orderDate || Date.now()).toLocaleString("en-IN")))}
    ${row(esc(order.customerDetails?.name || ""), esc(where))}
    <hr>
    ${lineItems(order.items || [])}
    <hr>
    ${row("Subtotal", money(b.subtotalPaise ?? Math.round((b.total || 0) * 100)))}
    ${b.discountPaise ? row(`Discount${order.adjustments?.discountReason ? ` (${esc(order.adjustments.discountReason)})` : ""}`, `−${money(b.discountPaise)}`) : ""}
    ${row(`CGST ${rate / 2}%${b.taxInclusive ? " (incl.)" : ""}`, money(cgst))}
    ${row(`SGST ${rate / 2}%${b.taxInclusive ? " (incl.)" : ""}`, money(taxPaise - cgst))}
    ${b.tipPaise ? row("Tip", money(b.tipPaise)) : ""}
    ${row("TOTAL", money(b.totalPaise ?? Math.round((b.grandTotal || 0) * 100)), true)}
    <hr>
    ${(order.payments || []).map((p) => row(`Paid ${esc(p.method)}`, money(p.amountPaise)) + (p.changePaise ? row("  Change", money(p.changePaise)) : "")).join("")}
    ${(order.refunds || []).map((r) => row(`Refund ${esc(r.method)}`, `−${money(r.amountPaise)}`)).join("")}
    <div class="c" style="margin-top:8px">Thank you!</div>`;
};

// Kitchen ticket for one station.
export const kotHtml = (ticket) => `
  <div class="c big b">KOT #${esc(ticket.ticketNo)}</div>
  <div class="c">${esc(ticket.station)}</div>
  <hr>
  ${row(esc(ticket.orderType === "Dine-in" || !ticket.orderType ? `Table ${ticket.tableNo ?? "?"}` : ticket.orderType), `#${esc(ticket.orderNo || "")}`, true)}
  ${row("", esc(new Date(ticket.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })))}
  ${ticket.isPriority ? '<div class="c b">*** RUSH ***</div>' : ""}
  <hr>
  ${ticket.items
    .map(
      (i) =>
        `<div class="big b">${i.quantity < 0 ? `CANCEL ${esc(-i.quantity)}` : i.quantity === 0 ? "NOTE" : `${esc(i.quantity)} ×`} ${esc(i.name)}</div>` +
        ((i.modifiers || []).length ? `<div class="mods">${i.modifiers.map(esc).join(", ")}</div>` : "") +
        (i.instructions ? `<div class="note">» ${esc(i.instructions)}</div>` : "")
    )
    .join("")}`;
