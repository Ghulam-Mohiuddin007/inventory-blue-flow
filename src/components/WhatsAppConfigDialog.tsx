import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Share2, 
  Cloud, 
  Server, 
  CheckCircle2, 
  Globe, 
  Smartphone,
  ExternalLink,
  Zap,
  HelpCircle
} from "lucide-react";
import { 
  getWhatsAppConfig, 
  saveWhatsAppConfig, 
  WhatsAppCloudConfig,
  isWebShareFilesSupported
} from "@/services/whatsappService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WhatsAppConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WhatsAppConfigDialog: React.FC<WhatsAppConfigDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<WhatsAppCloudConfig>(getWhatsAppConfig());
  const [isTestingGateway, setIsTestingGateway] = useState(false);
  const webShareAvailable = isWebShareFilesSupported();

  useEffect(() => {
    if (open) {
      setConfig(getWhatsAppConfig());
    }
  }, [open]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveWhatsAppConfig(config);
    toast({
      title: "Settings Saved",
      description: "WhatsApp integration preferences updated in local device memory.",
    });
    onOpenChange(false);
  };

  const handleTestGateway = async () => {
    if (!config.customGatewayUrl) {
      toast({
        title: "Endpoint Required",
        description: "Please enter your local WhatsApp gateway endpoint URL first.",
        variant: "destructive"
      });
      return;
    }

    setIsTestingGateway(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.customGatewayApiKey) {
        headers['Authorization'] = `Bearer ${config.customGatewayApiKey}`;
      }

      // Send ping or check
      const res = await fetch(config.customGatewayUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'ping',
          message: 'Inventory Blue Flow Gateway Test Ping'
        })
      });

      if (res.ok) {
        toast({
          title: "Gateway Connected!",
          description: `HTTP ${res.status}: Local gateway responded successfully.`,
        });
      } else {
        toast({
          title: "Gateway Responded with Error",
          description: `Server returned HTTP ${res.status}. Check your gateway route.`,
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Connection Failed",
        description: `Could not reach ${config.customGatewayUrl}. Ensure the local Baileys/Node server is running and CORS is enabled.`,
        variant: "destructive"
      });
    } finally {
      setIsTestingGateway(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white text-slate-900">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              WhatsApp PDF Delivery Setup
            </DialogTitle>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs">
              PDF Invoices
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Configure how generated PDF invoices are dispatched directly to customer WhatsApp chats
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2 text-xs">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Dispatch Delivery Strategy</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option 1: Web Share API */}
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, provider: 'web_share', enabled: true }))}
                className={cn(
                  "p-3 rounded-xl border text-left transition flex flex-col justify-between min-h-[85px]",
                  config.provider === 'web_share' 
                    ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/10 text-emerald-950 font-bold" 
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold text-xs">Web Share API</span>
                  </div>
                  {webShareAvailable ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[9px] py-0 px-1">
                      Supported
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 border-slate-300 text-[9px] py-0 px-1">
                      Mobile Only
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 font-normal leading-tight mt-1">
                  Native Mobile Intent: Directly opens WhatsApp with the generated PDF attached.
                </p>
              </button>

              {/* Option 2: Local Gateway */}
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, provider: 'custom_gateway', enabled: true }))}
                className={cn(
                  "p-3 rounded-xl border text-left transition flex flex-col justify-between min-h-[85px]",
                  config.provider === 'custom_gateway' 
                    ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/10 text-emerald-950 font-bold" 
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Server className="h-4 w-4 text-indigo-600" />
                  <span className="font-semibold text-xs">Local Gateway</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal leading-tight mt-1">
                  Baileys / WhatsApp-Web.JS: Automatically pushes Base64 PDF directly via local REST API.
                </p>
              </button>

              {/* Option 3: Cloud API */}
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, provider: 'cloud_api', enabled: true }))}
                className={cn(
                  "p-3 rounded-xl border text-left transition flex flex-col justify-between min-h-[85px]",
                  config.provider === 'cloud_api' 
                    ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/10 text-emerald-950 font-bold" 
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Cloud className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-xs">Meta Cloud API</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal leading-tight mt-1">
                  Official WhatsApp Business Cloud API with document upload.
                </p>
              </button>

              {/* Option 4: Deep Link */}
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, provider: 'deeplink_only', enabled: false }))}
                className={cn(
                  "p-3 rounded-xl border text-left transition flex flex-col justify-between min-h-[85px]",
                  config.provider === 'deeplink_only' 
                    ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/10 text-emerald-950 font-bold" 
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Share2 className="h-4 w-4 text-slate-600" />
                  <span className="font-semibold text-xs">Deep-Link + Auto PDF</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal leading-tight mt-1">
                  Zero-Config: Downloads PDF and opens wa.me chat ready to attach.
                </p>
              </button>
            </div>
          </div>

          {/* Default Country Code */}
          <div className="space-y-1">
            <Label htmlFor="default-country" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              Default Country Dialing Code
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="default-country"
                value={config.defaultCountryCode}
                onChange={e => setConfig(prev => ({ ...prev, defaultCountryCode: e.target.value.replace(/[^0-9]/g, '') }))}
                placeholder="92"
                className="h-9 text-xs font-mono w-28"
                required
              />
              <span className="text-[11px] text-slate-500">
                (e.g., 92 for Pakistan, 1 for USA. Converts 03xx into 923xx)
              </span>
            </div>
          </div>

          {/* Web Share Strategy Details */}
          {config.provider === 'web_share' && (
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-1.5">
              <h4 className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                Strategy A: Web Share API (Direct Mobile Intent)
              </h4>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                When you click "Send on WhatsApp", the device converts the receipt into a pure PDF File object and invokes <code className="font-mono text-emerald-950 font-semibold">navigator.share()</code>.
              </p>
              <ul className="text-[10px] text-emerald-700 space-y-0.5 list-disc pl-4">
                <li>Opens WhatsApp's native contact picker directly on phone or tablet.</li>
                <li>Attaches the actual PDF invoice document directly to the chat without saving numbers.</li>
                <li>Smoothly falls back to direct deep-link and automatic PDF download on desktop computers.</li>
              </ul>
            </div>
          )}

          {/* Local Gateway Fields */}
          {config.provider === 'custom_gateway' && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Server className="h-4 w-4 text-indigo-600" />
                  Strategy B: Local Baileys Gateway Hook
                </h4>
                <Badge className="bg-indigo-100 text-indigo-800 border-0 text-[10px]">
                  Zero Intervention
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Dispatches a base64-encoded PDF payload directly to your local WhatsApp bridge without opening any dialogs.
              </p>

              <div className="space-y-1">
                <Label htmlFor="gateway-url" className="text-[11px] font-semibold text-slate-600">Endpoint URL</Label>
                <Input
                  id="gateway-url"
                  value={config.customGatewayUrl || ''}
                  onChange={e => setConfig(prev => ({ ...prev, customGatewayUrl: e.target.value }))}
                  placeholder="http://localhost:3000/send-document"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="gateway-key" className="text-[11px] font-semibold text-slate-600">API Key / Token (Optional)</Label>
                <Input
                  id="gateway-key"
                  type="password"
                  value={config.customGatewayApiKey || ''}
                  onChange={e => setConfig(prev => ({ ...prev, customGatewayApiKey: e.target.value }))}
                  placeholder="Bearer token or secret key"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestGateway}
                disabled={isTestingGateway}
                className="w-full text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
              >
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                {isTestingGateway ? "Pinging Gateway..." : "Test Gateway Connection"}
              </Button>
            </div>
          )}

          {/* Cloud API Fields */}
          {config.provider === 'cloud_api' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Cloud className="h-4 w-4 text-blue-600" />
                Meta WhatsApp Business API Credentials
              </h4>

              <div className="space-y-1">
                <Label htmlFor="meta-phone-id" className="text-[11px] text-slate-600">Phone Number ID</Label>
                <Input
                  id="meta-phone-id"
                  value={config.metaPhoneNumberId || ''}
                  onChange={e => setConfig(prev => ({ ...prev, metaPhoneNumberId: e.target.value }))}
                  placeholder="e.g. 104598234857239"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="meta-token" className="text-[11px] text-slate-600">System User Access Token</Label>
                <Input
                  id="meta-token"
                  type="password"
                  value={config.metaAccessToken || ''}
                  onChange={e => setConfig(prev => ({ ...prev, metaAccessToken: e.target.value }))}
                  placeholder="EAAG..."
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Deep Link Explanation */}
          {config.provider === 'deeplink_only' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Deep-Link + Automatic PDF Download
              </p>
              <p className="text-slate-500 text-[10px] leading-relaxed">
                Clicking "Send on WhatsApp" triggers the client-side PDF download and opens the customer's chat on WhatsApp Web/App using their sanitized phone number (<code className="font-mono text-slate-800">https://wa.me/923xx...</code>) without having to save contacts.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
