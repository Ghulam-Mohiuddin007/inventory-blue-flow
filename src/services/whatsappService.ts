// WhatsApp Integration Service
// Handles E.164 phone sanitization, direct wa.me deep linking without contact saving,
// and optional WhatsApp Cloud API (Meta) or local gateway (Baileys) document upload.

import { Sale } from './deviceStorage';

export interface WhatsAppCloudConfig {
  enabled: boolean;
  provider: 'cloud_api' | 'custom_gateway' | 'deeplink_only';
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
  provider: 'deeplink_only',
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
  method: 'cloud_api' | 'custom_gateway' | 'deeplink';
  message: string;
  deepLinkUrl?: string;
}

/**
 * Dispatches an invoice to customer's WhatsApp:
 * 1. Attempts Meta WhatsApp Cloud API if configured.
 * 2. Attempts Custom Gateway (Baileys) if configured.
 * 3. Falls back to direct wa.me deep link with prefilled message.
 */
export async function dispatchInvoiceToWhatsApp(
  sale: Sale,
  storeName: string,
  pdfBlob?: Blob
): Promise<DispatchResult> {
  const config = getWhatsAppConfig();
  const summaryText = formatInvoiceWhatsAppText(sale, storeName);
  const sanitizedPhone = sanitizeWhatsAppNumber(sale.phone_number || '', config.defaultCountryCode);

  // 1. WhatsApp Cloud API (Meta Graph API)
  if (config.enabled && config.provider === 'cloud_api' && config.metaPhoneNumberId && config.metaAccessToken && sanitizedPhone) {
    try {
      if (pdfBlob) {
        // Upload PDF media
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
          // Send Document Message
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
      }
    } catch (err) {
      console.warn('WhatsApp Cloud API failed, falling back to Deep-Link:', err);
    }
  }

  // 2. Custom Gateway (e.g. local Baileys microservice)
  if (config.enabled && config.provider === 'custom_gateway' && config.customGatewayUrl && sanitizedPhone) {
    try {
      const formData = new FormData();
      formData.append('phone', sanitizedPhone);
      formData.append('message', summaryText);
      if (pdfBlob) {
        formData.append('document', pdfBlob, `${sale.invoice_number}.pdf`);
      }

      const headers: Record<string, string> = {};
      if (config.customGatewayApiKey) {
        headers['Authorization'] = `Bearer ${config.customGatewayApiKey}`;
      }

      const res = await fetch(config.customGatewayUrl, {
        method: 'POST',
        headers,
        body: formData
      });

      if (res.ok) {
        return {
          success: true,
          method: 'custom_gateway',
          message: `Invoice sent via local WhatsApp Gateway to +${sanitizedPhone}.`
        };
      }
    } catch (err) {
      console.warn('Custom Gateway failed, falling back to Deep-Link:', err);
    }
  }

  // 3. Deep-Link Direct Launch Fallback (Zero Config)
  const deepLinkUrl = buildWhatsAppDeepLink(sale.phone_number || '', summaryText, config.defaultCountryCode);
  window.open(deepLinkUrl, '_blank');

  return {
    success: true,
    method: 'deeplink',
    message: sanitizedPhone 
      ? `Opened direct WhatsApp chat with +${sanitizedPhone}.` 
      : `Opened WhatsApp share dialogue.`,
    deepLinkUrl
  };
}
