import React, { useRef, useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Printer, 
  Share2, 
  Download, 
  Settings, 
  Receipt, 
  Building2, 
  Phone, 
  Calendar, 
  User, 
  Sliders, 
  FileDown, 
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Server,
  Cloud,
  FileText
} from "lucide-react";
import { Sale } from "@/services/deviceStorage";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  downloadInvoicePdf, 
  getInvoicePdfBlob, 
  getInvoicePdfFile, 
  getInvoicePdfBase64,
  InvoicePdfOptions 
} from "@/services/pdfService";
import { 
  dispatchInvoiceToWhatsApp, 
  sanitizeWhatsAppNumber, 
  getWhatsAppConfig,
  isWebShareFilesSupported 
} from "@/services/whatsappService";
import { WhatsAppConfigDialog } from "./WhatsAppConfigDialog";
import { cn } from "@/lib/utils";

interface InvoiceReceiptDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}

export const InvoiceReceiptDrawer: React.FC<InvoiceReceiptDrawerProps> = ({
  open,
  onOpenChange,
  sale,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [thermalWidth, setThermalWidth] = useState<'58mm' | '80mm'>('80mm');
  const [pdfFormat, setPdfFormat] = useState<'thermal' | 'a4'>('thermal');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [webShareAvailable, setWebShareAvailable] = useState(false);

  useEffect(() => {
    setWebShareAvailable(isWebShareFilesSupported());
  }, []);

  // Sync recipient phone from sale when drawer opens
  useEffect(() => {
    if (sale?.phone_number) {
      setRecipientPhone(sale.phone_number);
    } else {
      setRecipientPhone("");
    }
  }, [sale]);

  if (!sale) return null;

  const storeName = user?.storeName || "Al-Madina Medicos & Mart";
  const cashierName = user?.name || "Manager";
  const storePhone = "0300-8889900";
  const storeAddress = "Shop #12, Commercial Market, Main Road";

  const getPdfOptions = (): InvoicePdfOptions => ({
    storeName,
    storePhone,
    storeAddress,
    cashierName,
    format: pdfFormat === 'a4' 
      ? 'a4' 
      : (thermalWidth === '58mm' ? 'thermal_58mm' : 'thermal_80mm')
  });

  const saleDateFormatted = new Date(sale.sale_date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      const options = getPdfOptions();
      downloadInvoicePdf(sale, options);
      toast({
        title: "PDF Invoice Downloaded",
        description: `Saved ${sale.invoice_number}.pdf (${pdfFormat === 'a4' ? 'A4 Document' : 'Thermal Slip'}) to device downloads.`,
      });
    } catch (err) {
      toast({
        title: "PDF Error",
        description: (err as Error).message,
        variant: "destructive"
      });
    }
  };

  const handleWhatsAppDispatch = async () => {
    setIsSendingWhatsApp(true);
    try {
      const pdfOptions = getPdfOptions();
      
      // 1. Generate client-side PDF document as pure File and Base64 objects
      const pdfFile = getInvoicePdfFile(sale, pdfOptions);
      const pdfBlob = getInvoicePdfBlob(sale, pdfOptions);
      const pdfBase64 = getInvoicePdfBase64(sale, pdfOptions);

      // Override phone if cashier entered custom recipient phone
      const effectiveSale: Sale = {
        ...sale,
        phone_number: recipientPhone || sale.phone_number
      };

      const config = getWhatsAppConfig();
      const sanitized = sanitizeWhatsAppNumber(effectiveSale.phone_number || '', config.defaultCountryCode);

      // 2. Dispatch via WhatsApp service (Web Share API / Local Gateway / Cloud API / Deep Link)
      const result = await dispatchInvoiceToWhatsApp(effectiveSale, storeName, {
        pdfFile,
        pdfBlob,
        pdfBase64
      });

      if (result.aborted) {
        toast({
          title: "Share Cancelled",
          description: "WhatsApp share picker was dismissed.",
        });
        return;
      }

      if (result.success) {
        if (result.method === 'web_share') {
          toast({
            title: "PDF Attached via Web Share",
            description: `Opened native WhatsApp intent with ${pdfFile.name} attached! Select contact to send.`,
          });
        } else if (result.method === 'custom_gateway') {
          toast({
            title: "Direct Gateway Delivered",
            description: result.message,
          });
        } else if (result.method === 'cloud_api') {
          toast({
            title: "Cloud API Delivered",
            description: result.message,
          });
        } else {
          toast({
            title: "Opening WhatsApp Chat",
            description: sanitized 
              ? `Chat opened for +${sanitized}. Invoice PDF auto-downloaded to attach.` 
              : "WhatsApp opened with invoice breakdown.",
          });
        }
      }
    } catch (err) {
      toast({
        title: "WhatsApp Dispatch Failed",
        description: (err as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[95vh] overflow-y-auto p-4 sm:p-6 bg-slate-900/95 text-slate-100 border-slate-800">
          <DialogHeader className="pb-2 border-b border-slate-800 no-print">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white">
                <Receipt className="h-5 w-5 text-indigo-400" />
                Thermal POS Receipt & Digital Invoice
              </DialogTitle>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="WhatsApp Integration Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <Badge 
                  variant="outline" 
                  className={sale.due_amount > 0 
                    ? "bg-rose-950/60 text-rose-300 border-rose-800" 
                    : "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                  }
                >
                  {sale.due_amount > 0 ? "Credit / Khata Due" : "Paid in Full"}
                </Badge>
              </div>
            </div>
            
            <DialogDescription className="text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 mt-1">
              <span>Invoice #{sale.invoice_number}</span>
              
              <div className="flex items-center gap-2">
                {/* Format Switcher: Thermal vs A4 */}
                <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPdfFormat('thermal')}
                    className={cn(
                      "px-2 py-0.5 rounded font-medium transition flex items-center gap-1",
                      pdfFormat === 'thermal' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Receipt className="h-3 w-3" />
                    Thermal Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfFormat('a4')}
                    className={cn(
                      "px-2 py-0.5 rounded font-medium transition flex items-center gap-1",
                      pdfFormat === 'a4' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <FileText className="h-3 w-3" />
                    A4 Memo
                  </button>
                </div>

                {/* 58mm / 80mm Switcher if thermal */}
                {pdfFormat === 'thermal' && (
                  <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded text-[11px]">
                    <button
                      type="button"
                      onClick={() => setThermalWidth('58mm')}
                      className={cn(
                        "px-1.5 py-0.5 rounded font-mono font-semibold transition",
                        thermalWidth === '58mm' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                      )}
                    >
                      58mm
                    </button>
                    <button
                      type="button"
                      onClick={() => setThermalWidth('80mm')}
                      className={cn(
                        "px-1.5 py-0.5 rounded font-mono font-semibold transition",
                        thermalWidth === '80mm' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                      )}
                    >
                      80mm
                    </button>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {/* Quick WhatsApp Recipient Phone Input (no-print) */}
          <div className="my-2 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80 no-print space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                WhatsApp PDF Document Delivery
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                {webShareAvailable ? (
                  <Badge variant="outline" className="bg-emerald-950/40 text-emerald-300 border-emerald-800 text-[9px] py-0">
                    <Smartphone className="h-2.5 w-2.5 mr-1" /> Mobile Direct Intent
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] py-0">
                    Direct Chat + Auto PDF
                  </Badge>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="Customer WhatsApp Number (e.g. 03001234567)"
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                  className="h-8 text-xs font-mono bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleWhatsAppDispatch}
                disabled={isSendingWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 font-semibold gap-1.5 shrink-0 shadow-sm"
              >
                <Share2 className="h-3.5 w-3.5" />
                {isSendingWhatsApp ? "Sending..." : "Send PDF"}
              </Button>
            </div>
          </div>

          {/* =========================================================================
              THERMAL RECEIPT CONTAINER
              Has id="thermal-receipt-print-area" targeted by @media print CSS rules
             ========================================================================= */}
          <div 
            id="thermal-receipt-print-area"
            className={cn(
              "my-2 mx-auto p-4 bg-white text-slate-900 rounded-lg shadow-md border border-slate-200 font-mono text-[11px] leading-tight space-y-3 transition-all",
              thermalWidth === '58mm' ? "max-w-[320px] roll-58mm" : "max-w-[420px] roll-80mm"
            )}
          >
            {/* Shop Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
              <h3 className="font-bold text-sm tracking-tight text-slate-950 uppercase">{storeName}</h3>
              <p className="text-[10px] text-slate-700">{storeAddress}</p>
              <p className="text-[10px] text-slate-700">Phone: {storePhone}</p>
              <p className="text-[9px] text-slate-500 pt-0.5">*** TAX RETAIL CASH MEMO ***</p>
            </div>

            {/* Meta Details */}
            <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between">
                <span className="text-slate-600">INVOICE:</span>
                <span className="font-bold text-slate-950">{sale.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">DATE:</span>
                <span>{saleDateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">CUSTOMER:</span>
                <span className="font-semibold text-slate-950 truncate max-w-[200px]">
                  {sale.customer_name || "Walk-in Customer"}
                </span>
              </div>
              {(recipientPhone || sale.phone_number) && (
                <div className="flex justify-between">
                  <span className="text-slate-600">PHONE:</span>
                  <span>{recipientPhone || sale.phone_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">CASHIER:</span>
                <span>{cashierName}</span>
              </div>
            </div>

            {/* Itemized Table Header */}
            <div>
              <div className="flex justify-between font-bold text-[10px] border-b border-slate-900 pb-1 mb-1.5 uppercase">
                <span className="flex-1">ITEM (QTY @ RATE)</span>
                <span className="text-right w-20">TOTAL</span>
              </div>

              {/* Items */}
              <div className="space-y-1.5">
                {sale.items && sale.items.length > 0 ? (
                  sale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-[11px]">
                      <div className="flex-1 pr-2">
                        <p className="font-semibold text-slate-900 leading-tight">{item.product_name}</p>
                        <p className="text-[10px] text-slate-600">
                          {item.quantity} × PKR {item.price.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-bold text-slate-950 text-right w-20 shrink-0">
                        PKR {item.total.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between items-start text-[11px]">
                    <div className="flex-1 pr-2">
                      <p className="font-semibold text-slate-900 leading-tight">{sale.product_name}</p>
                      <p className="text-[10px] text-slate-600">
                        {sale.quantity} × PKR {sale.price.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-bold text-slate-950 text-right w-20 shrink-0">
                      PKR {sale.total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Calculation Block */}
            <div className="border-t-2 border-dashed border-slate-400 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-700">
                <span>SUBTOTAL:</span>
                <span className="font-semibold">PKR {sale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>DISCOUNT / TAX:</span>
                <span>PKR 0.00</span>
              </div>
              
              <div className="flex justify-between font-bold text-xs sm:text-sm text-slate-950 border-t border-slate-900 pt-1">
                <span>GRAND TOTAL:</span>
                <span>PKR {sale.total.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-900 pt-1">
                <span>PAID ({sale.payment_method.toUpperCase()}):</span>
                <span className="font-semibold">PKR {sale.amount_paid.toFixed(2)}</span>
              </div>

              {sale.due_amount > 0 ? (
                <div className="flex justify-between font-bold text-slate-950 border-t border-dashed border-slate-400 pt-1 bg-slate-100 p-1 rounded">
                  <span>BALANCE DUE (KHATA):</span>
                  <span>PKR {sale.due_amount.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-[10px] text-slate-700 pt-0.5">
                  <span>CHANGE RETURNED:</span>
                  <span>PKR 0.00</span>
                </div>
              )}
            </div>

            {/* Thermal Footer */}
            <div className="pt-2 text-center border-t border-dashed border-slate-400 space-y-1 text-[10px] text-slate-600">
              <p className="font-bold text-slate-900">THANK YOU FOR YOUR PATRONAGE!</p>
              <p className="italic text-[9px]">
                Goods once sold will only be exchanged within 3 days with this original receipt.
              </p>
              <p className="text-[8px] text-slate-400 pt-1">
                Software: Inventory Blue Flow • In-Device Storage
              </p>
              <div className="text-[10px] tracking-widest text-slate-800 pt-1">
                * * * * * * * * * * * * * * * *
              </div>
            </div>
          </div>

          {/* Dialog Actions */}
          <DialogFooter className="grid grid-cols-2 sm:flex sm:flex-row gap-2 pt-2 no-print">
            <Button
              type="button"
              onClick={handleWhatsAppDispatch}
              disabled={isSendingWhatsApp}
              className="col-span-2 sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-10 font-bold shadow-md shadow-emerald-600/25"
            >
              <Share2 className="h-4 w-4" />
              {isSendingWhatsApp ? "Dispatching..." : "Send on WhatsApp (PDF)"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPdf}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 gap-1.5 text-xs h-10"
            >
              <FileDown className="h-4 w-4" />
              Download PDF
            </Button>

            <Button
              type="button"
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs h-10 font-bold shadow-md shadow-indigo-600/25"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="col-span-2 sm:col-span-1 text-slate-400 hover:text-white h-10 text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Integration Settings Modal */}
      <WhatsAppConfigDialog
        open={showConfigModal}
        onOpenChange={setShowConfigModal}
      />
    </>
  );
};
