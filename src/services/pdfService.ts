// Client-Side Invoice PDF Generator Engine
// Uses jsPDF for 100% in-browser generation with zero cloud/server roundtrips.

import { jsPDF } from 'jspdf';
import { Sale } from './deviceStorage';

export interface InvoicePdfOptions {
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  customerKhataBalance?: number;
  cashierName?: string;
}

/**
 * Generates an enterprise-grade A4 / thermal styled PDF document for an invoice
 */
export function generateInvoicePdf(sale: Sale, options: InvoicePdfOptions = {}): jsPDF {
  const storeName = options.storeName || "Al-Madina Medicos & Mart";
  const storePhone = options.storePhone || "0300-8889900";
  const storeAddress = options.storeAddress || "Shop #12, Commercial Market, Main Road";
  const cashierName = options.cashierName || "Manager";

  // Standard A4 dimensions in mm: 210 x 297
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // --- BRAND HEADER BLOCK ---
  // Top Banner
  doc.setFillColor(15, 23, 42); // #0f172a Deep Slate Navy
  doc.rect(margin, 12, contentWidth, 26, 'F');

  // Store Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(storeName.toUpperCase(), margin + 6, 22);

  // Store Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`${storeAddress}  |  Helpline: ${storePhone}`, margin + 6, 29);
  doc.text("Automated Retail Point-of-Sale • In-Device Storage Engine", margin + 6, 34);

  // Invoice Pill on right of banner
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.roundedRect(pageWidth - margin - 46, 17, 40, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("INVOICE NUMBER", pageWidth - margin - 26, 22, { align: 'center' });
  doc.setFontSize(11);
  doc.text(sale.invoice_number, pageWidth - margin - 26, 29, { align: 'center' });

  // --- INVOICE & CUSTOMER METADATA BOX ---
  let currentY = 44;
  doc.setFillColor(248, 250, 252); // #f8fafc slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

  // Column 1: Invoice Details
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFontSize(8);
  doc.text("DATE & TIME", margin + 5, currentY + 6);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const formattedDate = new Date(sale.sale_date).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(formattedDate, margin + 5, currentY + 11);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text("CASHIER / OPERATOR", margin + 5, currentY + 17);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(cashierName, margin + 5, currentY + 21);

  // Column 2: Customer Details
  const col2X = margin + 70;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text("BILLED CUSTOMER", col2X, currentY + 6);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(sale.customer_name || "Walk-in Retail Customer", col2X, currentY + 11);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text("PHONE NUMBER", col2X, currentY + 17);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.phone_number || "Not provided", col2X, currentY + 21);

  // Column 3: Payment Status Tag
  const col3X = pageWidth - margin - 50;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text("PAYMENT STATUS", col3X, currentY + 6);

  if (sale.due_amount > 0) {
    doc.setFillColor(254, 242, 242); // rose-50
    doc.setDrawColor(254, 205, 211); // rose-200
    doc.roundedRect(col3X, currentY + 9, 44, 11, 1.5, 1.5, 'FD');
    doc.setTextColor(190, 18, 60); // rose-700
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("CREDIT / KHATA DUE", col3X + 22, currentY + 16, { align: 'center' });
  } else {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(col3X, currentY + 9, 44, 11, 1.5, 1.5, 'FD');
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("PAID IN FULL", col3X + 22, currentY + 16, { align: 'center' });
  }

  // --- ITEMIZED PARTICULARS TABLE ---
  currentY = 74;

  // Table Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  doc.text("#", margin + 4, currentY + 5.5);
  doc.text("ITEM & SPECIFICATION", margin + 14, currentY + 5.5);
  doc.text("QTY", margin + 105, currentY + 5.5, { align: 'center' });
  doc.text("UNIT PRICE (PKR)", margin + 140, currentY + 5.5, { align: 'right' });
  doc.text("LINE TOTAL (PKR)", pageWidth - margin - 5, currentY + 5.5, { align: 'right' });

  currentY += 8;

  // Table Body Rows
  const items = (sale.items && sale.items.length > 0) ? sale.items : [{
    product_id: sale.product_id || 'prod',
    product_name: sale.product_name,
    company: sale.company,
    quantity: sale.quantity,
    price: sale.price,
    total: sale.total
  }];

  items.forEach((item, index) => {
    // Alternating row background
    if (index % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margin, currentY, contentWidth, 8, 'F');

    // Row divider
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, currentY + 8, pageWidth - margin, currentY + 8);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    doc.text(String(index + 1), margin + 4, currentY + 5.5);
    doc.text(item.product_name, margin + 14, currentY + 5.5);
    doc.text(String(item.quantity), margin + 105, currentY + 5.5, { align: 'center' });
    doc.text(item.price.toFixed(2), margin + 140, currentY + 5.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(item.total.toFixed(2), pageWidth - margin - 5, currentY + 5.5, { align: 'right' });

    currentY += 8;
  });

  // Table Bottom Line
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // --- FINANCIAL SUMMARY BLOCK ---
  currentY += 6;
  const summaryX = pageWidth - margin - 75;

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');

  doc.text("Subtotal:", summaryX, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`PKR ${sale.total.toFixed(2)}`, pageWidth - margin - 5, currentY, { align: 'right' });

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text("Discount / Tax:", summaryX, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text("PKR 0.00", pageWidth - margin - 5, currentY, { align: 'right' });

  // Grand Total Banner
  currentY += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(summaryX - 4, currentY, 79, 9, 1.5, 1.5, 'F');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text("GRAND TOTAL:", summaryX, currentY + 6);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.setFontSize(11);
  doc.text(`PKR ${sale.total.toFixed(2)}`, pageWidth - margin - 5, currentY + 6, { align: 'right' });

  // Amount Paid & Payment Mode
  currentY += 13;
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87); // Emerald-700
  doc.setFont('helvetica', 'bold');
  doc.text(`Amount Paid (${sale.payment_method.toUpperCase()}):`, summaryX, currentY);
  doc.text(`PKR ${sale.amount_paid.toFixed(2)}`, pageWidth - margin - 5, currentY, { align: 'right' });

  // Remaining Khata Credit Due
  if (sale.due_amount > 0) {
    currentY += 6;
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(summaryX - 4, currentY - 4, 79, 8, 1, 1, 'F');
    doc.setTextColor(225, 29, 72); // Rose-600
    doc.setFont('helvetica', 'bold');
    doc.text("Balance Due (Khata):", summaryX, currentY + 1.5);
    doc.text(`PKR ${sale.due_amount.toFixed(2)}`, pageWidth - margin - 5, currentY + 1.5, { align: 'right' });
  }

  // --- FOOTER & AUDIT PROOF ---
  const footerY = 270;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("THANK YOU FOR YOUR PATRONAGE!", pageWidth / 2, footerY + 5, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Medicines/Goods once sold will only be exchanged within 3 days with this computer-generated memo.", pageWidth / 2, footerY + 9, { align: 'center' });
  doc.text("Generated by Inventory Blue Flow • 100% In-Device Storage Architecture", pageWidth / 2, footerY + 13, { align: 'center' });

  return doc;
}

/**
 * Generates and triggers instant browser download of the invoice PDF
 */
export function downloadInvoicePdf(sale: Sale, options: InvoicePdfOptions = {}): void {
  const doc = generateInvoicePdf(sale, options);
  doc.save(`${sale.invoice_number}.pdf`);
}

/**
 * Returns the PDF document as a binary Blob suitable for API dispatch or local sharing
 */
export function getInvoicePdfBlob(sale: Sale, options: InvoicePdfOptions = {}): Blob {
  const doc = generateInvoicePdf(sale, options);
  return doc.output('blob');
}
