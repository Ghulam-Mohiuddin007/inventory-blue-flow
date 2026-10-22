// WhatsApp Integration Service
// Handles E.164 phone sanitization, direct wa.me deep linking without contact saving,
// Web Share API native file attachment, and automated Baileys / WhatsApp Cloud API PDF dispatch.

import { Sale } from './deviceStorage';
import { downloadInvoicePdf, getInvoicePdfBase64, getInvoicePdfFile } from './pdfService';

export type WhatsAppProvider = 'web_share' | 'custom_gateway' | 'cloud_api' | 'deeplink_only';

export interface WhatsAppCloudConfig {
  enabled: boolean;
  provider: WhatsAppProvider;
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  metaBusinessAccountId?: string;
  customGatewayUrl?: string;
  customGatewayApiKey?: string;
  defaultCountryCode: string; // e.g. '92'
}

const SETTINGS_KEY = 'inventory_whatsapp_config';

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppCloudConfig = {
  enabled: false,
  provider: 'web_share',
  defaultCountryCode: '92',
};

/**
 * Loads WhatsApp configuration from local device memory
 */
export function getWhatsAppConfig(): WhatsAppCloudConfig {
  if (typeof localStorage === 'undefined') return DEFAULT_WHATSAPP_CONFIG;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_WHATSAPP_CONFIG, ...JSON.parse(raw) } : DEFAULT_WHATSAPP_CONFIG;
  } catch {
    return DEFAULT_WHATSAPP_CONFIG;
  }
}

/**
 * Saves WhatsApp configuration to local device memory
 */
export function saveWhatsAppConfig(config: WhatsAppCloudConfig): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(config));
}

/**
 * Sanitizes any input phone number into pure E.164 digits without '+' or spaces.
 * Automatically normalizes local Pakistani prefixes (e.g. 03001234567 -> 923001234567).
 */
export function sanitizeWhatsAppNumber(phone: string, defaultCountryCode = '92'): string {
  if (!phone) return '';

  // Remove all non-numeric characters except leading '+'
  let cleaned = phone.trim().replace(/[^0-9+]/g, '');

  // Strip leading '+'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // If local Pakistani number starting with 03 (11 digits: 03001234567)
  if (cleaned.startsWith('03') && cleaned.length === 11) {
    cleaned = defaultCountryCode + cleaned.substring(1);
  } 
  // If 10 digits starting with 3 (e.g. 3001234567)
  else if (cleaned.startsWith('3') && cleaned.length === 10) {
    cleaned = defaultCountryCode + cleaned;
  }
  // If starts with 00, replace with nothing
  else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  return cleaned;
}

/**
 * Checks if the browser supports the Web Share API
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Checks if the browser supports sharing PDF document files via the Web Share API (Level 2)
 */
export function isWebShareFilesSupported(): boolean {
  if (!isWebShareSupported() || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    const dummyFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [dummyFile] });
  } catch {
    return false;
  }
}

/**
 * Generates formatted WhatsApp text summary of the invoice
 */
export function formatInvoiceWhatsAppText(sale: Sale, storeName: string, storePhone = "0300-8889900"): string {
  const saleDateFormatted = new Date(sale.sale_date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    `*${storeName.toUpperCase()}*\n` +
    `*TAX INVOICE & CASH MEMO*\n` +
    `--------------------------------\n` +
    `*Invoice #:* ${sale.invoice_number}\n` +
    `*Date:* ${saleDateFormatted}\n` +
    `*Customer:* ${sale.customer_name || 'Valued Customer'}\n` +
    (sale.phone_number ? `*Phone:* ${sale.phone_number}\n` : '') +
    `--------------------------------\n` +
    `*ITEMIZED PARTICULARS:*\n` +
    (sale.items && sale.items.length > 0 
      ? sale.items.map(i => `• ${i.product_name}\n   ${i.quantity} x PKR ${i.price.toFixed(2)} = *PKR ${i.total.toFixed(2)}*`).join('\n')
      : `• ${sale.product_name}\n   ${sale.quantity} x PKR ${sale.price.toFixed(2)} = *PKR ${sale.total.toFixed(2)}*`
    ) +
    `\n--------------------------------\n` +
    `*GRAND TOTAL:* PKR ${sale.total.toFixed(2)}\n` +
    `*AMOUNT PAID:* PKR ${sale.amount_paid.toFixed(2)} (${sale.payment_method.toUpperCase()})\n` +
    (sale.due_amount > 0 
      ? `*KHATA BALANCE DUE:* PKR ${sale.due_amount.toFixed(2)}\n` 
      : `*PAYMENT STATUS:* PAID IN FULL\n`
    ) +
    `--------------------------------\n` +
    `Thank you for your visit!\n` +
    `Helpline / Store: ${storePhone}`
  );
}

/**
 * Creates direct wa.me deep-link URL without requiring manual contact saving
 */
export function buildWhatsAppDeepLink(phone: string, text: string, defaultCountryCode = '92'): string {
  const sanitized = sanitizeWhatsAppNumber(phone, defaultCountryCode);
  const encodedText = encodeURIComponent(text);

  if (sanitized) {
    return `https://wa.me/${sanitized}?text=${encodedText}`;
  }
  // Fallback to general WhatsApp share if phone is empty
  return `https://wa.me/?text=${encodedText}`;
}

export interface DispatchResult {
  success: boolean;
  method: 'web_share' | 'custom_gateway' | 'cloud_api' | 'deeplink';
  message: string;
  deepLinkUrl?: string;
  aborted?: boolean;
}

export interface DispatchInvoiceOptions {
  pdfFile?: File;
  pdfBlob?: Blob;
  pdfBase64?: string;
  forceStrategy?: WhatsAppProvider;
}

/**
 * Strategy A: Delivers the PDF invoice directly via the native Web Share API
 * On mobile/tablet, this opens WhatsApp's contact picker and attaches the actual PDF file.
 */
export async function shareInvoicePdfViaWebShare(
  sale: Sale,
  pdfFile: File,
  storeName: string
): Promise<DispatchResult> {
  if (!isWebShareSupported()) {
    throw new Error("Web Share API is not supported on this browser.");
  }

  if (navigator.canShare && !navigator.canShare({ files: [pdfFile] })) {
    throw new Error("This browser does not support sharing PDF document files directly.");
  }

  const shareText = `Thank you for your purchase from ${storeName}!\nInvoice #${sale.invoice_number}\nTotal: PKR ${sale.total.toFixed(2)}`;

  try {
    await navigator.share({
      files: [pdfFile],
      title: `Invoice ${sale.invoice_number} - ${storeName}`,
      text: shareText
    });

    return {
      success: true,
      method: 'web_share',
      message: `Attached ${pdfFile.name} to WhatsApp / system share dialog.`
    };
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'AbortError') {
      return {
        success: false,
        method: 'web_share',
        aborted: true,
        message: 'Share dialog dismissed by user.'
      };
    }
    throw error;
  }
}

/**
 * Strategy B: Local Gateway Dispatch (e.g. Baileys / WhatsApp Web JS local gateway microservice)
 * Pushes the base64-encoded PDF document directly to the customer's phone number without user intervention.
 */
export async function pushPdfInvoiceToGateway(options: {
  gatewayUrl: string;
  apiKey?: string;
  phone: string;
  pdfBase64: string;
  filename: string;
  caption: string;
  sale: Sale;
}): Promise<{ success: boolean; message: string; response?: unknown }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.apiKey) {
    headers['Authorization'] = `Bearer ${options.apiKey}`;
    headers['x-api-key'] = options.apiKey;
  }

  // Standard document payload compatible with Baileys / whatsapp-web.js REST bridges
  const payload = {
    phone: options.phone,
    number: options.phone,
    to: options.phone,
    caption: options.caption,
    fileName: options.filename,
    filename: options.filename,
    base64: options.pdfBase64,
    data: `data:application/pdf;base64,${options.pdfBase64}`,
    mimetype: 'application/pdf',
    mimeType: 'application/pdf',
    type: 'document',
    invoiceNumber: options.sale.invoice_number,
    total: options.sale.total,
    amountPaid: options.sale.amount_paid,
    dueAmount: options.sale.due_amount
  };

  const res = await fetch(options.gatewayUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Gateway returned HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json().catch(() => ({}));
  return {
    success: true,
    message: `Successfully pushed base64 PDF document to WhatsApp gateway for +${options.phone}.`,
    response: data
  };
}

/**
 * Unified WhatsApp PDF Dispatch Orchestrator:
 * 1. Checks if explicit local gateway or cloud API is enabled and configured -> pushes directly.
 * 2. Checks if native Web Share API file sharing is supported/requested -> launches native WhatsApp picker with attached PDF.
 * 3. Graceful desktop fallback: auto-downloads PDF and opens direct wa.me chat link with prefilled text.
 */
export async function dispatchInvoiceToWhatsApp(
  sale: Sale,
  storeName: string,
  optionsOrBlob?: Blob | DispatchInvoiceOptions
): Promise<DispatchResult> {
  const config = getWhatsAppConfig();
  const summaryText = formatInvoiceWhatsAppText(sale, storeName);
  const sanitizedPhone = sanitizeWhatsAppNumber(sale.phone_number || '', config.defaultCountryCode);

  // Normalize options
  const options: DispatchInvoiceOptions = 
    optionsOrBlob instanceof Blob 
      ? { pdfBlob: optionsOrBlob } 
      : (optionsOrBlob || {});

  const effectiveProvider = options.forceStrategy || config.provider;

  // Ensure we have File and Base64 representations ready
  const pdfFile = options.pdfFile || getInvoicePdfFile(sale, { storeName });
  const pdfBlob = options.pdfBlob || pdfFile;
  const pdfBase64 = options.pdfBase64 || getInvoicePdfBase64(sale, { storeName });

  // -------------------------------------------------------------------------
  // 1. Strategy B (API Automation Bridge): Custom Local Gateway (Baileys / Node.js)
  // -------------------------------------------------------------------------
  if (
    (effectiveProvider === 'custom_gateway' || (config.enabled && config.provider === 'custom_gateway')) && 
    config.customGatewayUrl && 
    sanitizedPhone
  ) {
    try {
      const gatewayRes = await pushPdfInvoiceToGateway({
        gatewayUrl: config.customGatewayUrl,
        apiKey: config.customGatewayApiKey,
        phone: sanitizedPhone,
        pdfBase64,
        filename: `${sale.invoice_number}.pdf`,
        caption: `Tax Invoice ${sale.invoice_number} from ${storeName}`,
        sale
      });

      return {
        success: true,
        method: 'custom_gateway',
        message: gatewayRes.message
      };
    } catch (err) {
      console.warn('Local WhatsApp Gateway dispatch failed:', err);
      // Fall through to next available strategy if gateway fails
    }
  }

  // -------------------------------------------------------------------------
  // 2. Strategy B (Cloud API): Meta WhatsApp Business Cloud API
  // -------------------------------------------------------------------------
  if (
    (effectiveProvider === 'cloud_api' || (config.enabled && config.provider === 'cloud_api')) && 
    config.metaPhoneNumberId && 
    config.metaAccessToken && 
    sanitizedPhone
  ) {
    try {
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', pdfBlob, `${sale.invoice_number}.pdf`);
      formData.append('type', 'application/pdf');

      const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${config.metaPhoneNumberId}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.metaAccessToken}`
        },
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (uploadData.id) {
        const sendRes = await fetch(`https://graph.facebook.com/v20.0/${config.metaPhoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.metaAccessToken}`
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: sanitizedPhone,
            type: 'document',
            document: {
              id: uploadData.id,
              caption: `Tax Invoice ${sale.invoice_number} from ${storeName}`,
              filename: `${sale.invoice_number}.pdf`
            }
          })
        });

        const sendData = await sendRes.json();
        if (sendData.messages && sendData.messages.length > 0) {
          return {
            success: true,
            method: 'cloud_api',
            message: `Invoice PDF sent directly to +${sanitizedPhone} via WhatsApp Cloud API.`
          };
        }
      }
    } catch (err) {
      console.warn('WhatsApp Cloud API dispatch failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Strategy A (Native Mobile Intent): Web Share API with Attached PDF Document
  // -------------------------------------------------------------------------
  const canWebShareFile = isWebShareFilesSupported();
  if (
    (effectiveProvider === 'web_share' || effectiveProvider === 'deeplink_only') && 
    canWebShareFile
  ) {
    try {
      const shareResult = await shareInvoicePdfViaWebShare(sale, pdfFile, storeName);
      if (shareResult.success || shareResult.aborted) {
        return shareResult;
      }
    } catch (err) {
      console.warn('Web Share API execution failed, falling back to deep-link:', err);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Fallback C (Desktop Browser / Zero Config): Auto-Download PDF + wa.me chat
  // -------------------------------------------------------------------------
  // Download the PDF file to user device downloads so it's ready to attach in WhatsApp Web
  downloadInvoicePdf(sale, { storeName });

  const deepLinkUrl = buildWhatsAppDeepLink(sale.phone_number || '', summaryText, config.defaultCountryCode);
  window.open(deepLinkUrl, '_blank');

  return {
    success: true,
    method: 'deeplink',
    message: sanitizedPhone 
      ? `Downloaded ${sale.invoice_number}.pdf & opened direct WhatsApp chat for +${sanitizedPhone}. Attach the downloaded PDF in your chat.`
      : `Downloaded ${sale.invoice_number}.pdf & opened WhatsApp. Attach the downloaded PDF in your chat.`,
    deepLinkUrl
  };
}
