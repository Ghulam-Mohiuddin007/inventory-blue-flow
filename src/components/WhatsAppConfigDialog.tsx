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
  Settings, 
  Share2, 
  ShieldCheck, 
  Cloud, 
  Server, 
  CheckCircle2, 
  Key, 
  Globe 
} from "lucide-react";
import { 
  getWhatsAppConfig, 
  saveWhatsAppConfig, 
  WhatsAppCloudConfig 
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white text-slate-900">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              WhatsApp Integration Settings
            </DialogTitle>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs">
              Direct Dispatch
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Configure automated WhatsApp invoice dispatch and PDF delivery
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2 text-xs">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Dispatch Method</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, provider: 'deeplink_only', enabled: false }))}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition flex flex-col justify-between min-h-[75px]",
                  config.provider === 'deeplink_only' 
                    ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/10 text-emerald-950 font-bold" 
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-semibold text-xs">Deep-Link</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">Zero-Config • Instant chat via wa.me</p>
              </button>

              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, provider: 'cloud_api', enabled: true }))}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition flex flex-col justify-between min-h-[75px]",
                  config.provider === 'cloud_api' 
                    ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/10 text-emerald-950 font-bold" 
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-semibold text-xs">Cloud API</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">Official Meta API • Auto PDF upload</p>
              </button>

              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, provider: 'custom_gateway', enabled: true }))}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition flex flex-col justify-between min-h-[75px]",
                  config.provider === 'custom_gateway' 
                    ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/10 text-emerald-950 font-bold" 
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="font-semibold text-xs">Local Gateway</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">Baileys / Node.js microservice</p>
              </button>
            </div>
          </div>

          {/* Default Country Code */}
          <div className="space-y-1">
            <Label htmlFor="default-country" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              Default Country Dialing Code
            </Label>
            <Input
              id="default-country"
              value={config.defaultCountryCode}
              onChange={e => setConfig(prev => ({ ...prev, defaultCountryCode: e.target.value.replace(/[^0-9]/g, '') }))}
              placeholder="92"
              className="h-9 text-xs font-mono w-32"
              required
            />
            <p className="text-[10px] text-slate-400">
              e.g. 92 for Pakistan, 1 for USA. Applied when local 03xx numbers are entered.
            </p>
          </div>

          {/* Cloud API Fields */}
          {config.provider === 'cloud_api' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5 text-blue-600" />
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

          {/* Local Gateway Fields */}
          {config.provider === 'custom_gateway' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-indigo-600" />
                Local Baileys / WhatsApp Gateway Microservice
              </h4>

              <div className="space-y-1">
                <Label htmlFor="gateway-url" className="text-[11px] text-slate-600">Gateway Endpoint URL</Label>
                <Input
                  id="gateway-url"
                  value={config.customGatewayUrl || ''}
                  onChange={e => setConfig(prev => ({ ...prev, customGatewayUrl: e.target.value }))}
                  placeholder="http://localhost:3000/send-document"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="gateway-key" className="text-[11px] text-slate-600">Optional API Key</Label>
                <Input
                  id="gateway-key"
                  type="password"
                  value={config.customGatewayApiKey || ''}
                  onChange={e => setConfig(prev => ({ ...prev, customGatewayApiKey: e.target.value }))}
                  placeholder="Bearer token or secret key"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Deep Link Explanation */}
          {config.provider === 'deeplink_only' && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Zero-Config WhatsApp Web / App Launch Active
              </p>
              <p className="text-slate-600 text-[10px] leading-relaxed">
                Clicking "Send on WhatsApp" automatically opens the customer's chat using their sanitized phone number (<code className="font-mono text-emerald-800">https://wa.me/923xx...</code>) without needing to save their contact in your phone address book!
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
