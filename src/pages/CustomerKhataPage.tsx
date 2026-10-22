import React, { useState } from "react";
import { 
  Users, 
  Receipt, 
  Phone, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Wallet,
  Clock,
  Printer,
  Share2,
  FileText,
  Bell,
  BadgeAlert,
  ArrowRight,
  TrendingDown,
  Building2,
  DollarSign,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { useKhataCustomers, useRecordKhataPayment } from "@/hooks/useInventoryData";
import { KhataCustomer, deviceStorage } from "@/services/deviceStorage";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { buildWhatsAppDeepLink, sanitizeWhatsAppNumber } from "@/services/whatsappService";

type AgingBucket = 'all' | 'current' | '16-30' | '31-60' | '60plus';

export const CustomerKhataPage: React.FC = () => {
  const { data: customers = [], isLoading } = useKhataCustomers();
  const recordPaymentMutation = useRecordKhataPayment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [agingFilter, setAgingFilter] = useState<AgingBucket>('all');
  const [filterDueOnly, setFilterDueOnly] = useState(false);

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState<KhataCustomer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  // New Customer form
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustInitialDue, setNewCustInitialDue] = useState("");
  const [newCustNotes, setNewCustNotes] = useState("");

  const storeName = user?.storeName || "Al-Madina Medicos & Mart";

  // Helper to determine customer aging category
  const getCustomerAgingDays = (customer: KhataCustomer): number => {
    if (customer.total_due <= 0) return 0;
    const oldestCreditTx = customer.transactions?.find(t => t.type === 'credit');
    const referenceDate = oldestCreditTx ? new Date(oldestCreditTx.date) : new Date(customer.last_activity || customer.created_at);
    return Math.max(0, differenceInDays(new Date(), referenceDate));
  };

  const getCustomerAgingCategory = (days: number): { label: string; color: string; bucket: AgingBucket } => {
    if (days <= 15) return { label: '0-15 Days (Current)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', bucket: 'current' };
    if (days <= 30) return { label: '16-30 Days (Due)', color: 'text-amber-700 bg-amber-50 border-amber-200', bucket: '16-30' };
    if (days <= 60) return { label: '31-60 Days (Aging)', color: 'text-orange-700 bg-orange-50 border-orange-200', bucket: '31-60' };
    return { label: '60+ Days (Overdue)', color: 'text-rose-700 bg-rose-50 border-rose-200', bucket: '60plus' };
  };

  // Aging Summary Calculation across all accounts
  const agingSummary = customers.reduce(
    (acc, cust) => {
      if (cust.total_due <= 0) return acc;
      const days = getCustomerAgingDays(cust);
      if (days <= 15) {
        acc.current.amount += cust.total_due;
        acc.current.count += 1;
      } else if (days <= 30) {
        acc.due16_30.amount += cust.total_due;
        acc.due16_30.count += 1;
      } else if (days <= 60) {
        acc.due31_60.amount += cust.total_due;
        acc.due31_60.count += 1;
      } else {
        acc.overdue60.amount += cust.total_due;
        acc.overdue60.count += 1;
      }
      return acc;
    },
    {
      current: { amount: 0, count: 0 },
      due16_30: { amount: 0, count: 0 },
      due31_60: { amount: 0, count: 0 },
      overdue60: { amount: 0, count: 0 },
    }
  );

  // Filtered customer list
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !searchTerm || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm));
    
    const matchesDue = !filterDueOnly || c.total_due > 0;

    const days = getCustomerAgingDays(c);
    let matchesAging = true;
    if (agingFilter === 'current') matchesAging = c.total_due > 0 && days <= 15;
    if (agingFilter === '16-30') matchesAging = c.total_due > 0 && days > 15 && days <= 30;
    if (agingFilter === '31-60') matchesAging = c.total_due > 0 && days > 30 && days <= 60;
    if (agingFilter === '60plus') matchesAging = c.total_due > 0 && days > 60;

    return matchesSearch && matchesDue && matchesAging;
  });

  const totalOutstandingDue = customers.reduce((sum, c) => sum + c.total_due, 0);
  const totalRecoveredPaid = customers.reduce((sum, c) => sum + c.total_paid, 0);
  const customersWithDue = customers.filter(c => c.total_due > 0).length;

  const handleOpenPayment = (customer: KhataCustomer) => {
    setSelectedCustomer(customer);
    setPaymentAmount(customer.total_due > 0 ? customer.total_due.toString() : "");
    setPaymentMode("Cash");
    setPaymentNotes("");
    setShowPaymentModal(true);
  };

  const handleOpenLedger = (customer: KhataCustomer) => {
    setSelectedCustomer(customer);
    setShowLedgerModal(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive payment amount.",
        variant: "destructive"
      });
      return;
    }

    recordPaymentMutation.mutate({
      customerId: selectedCustomer.id,
      amount,
      notes: paymentNotes ? `${paymentNotes} (${paymentMode})` : `Settlement payment received via ${paymentMode}`
    }, {
      onSuccess: () => {
        setShowPaymentModal(false);
        setPaymentAmount("");
        setPaymentNotes("");
      }
    });
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const initialDue = parseFloat(newCustInitialDue) || 0;
    await deviceStorage.addOrUpdateKhataCredit(
      newCustName.trim(),
      newCustPhone.trim() || undefined,
      initialDue,
      `INIT-${Math.floor(100 + Math.random() * 900)}`,
      newCustNotes || 'Initial account opening balance'
    );

    queryClient.invalidateQueries({ queryKey: ['khata_customers'] });
    toast({
      title: "Customer Account Created",
      description: `${newCustName} has been recorded in local device Khata.`,
    });

    setShowAddCustomerModal(false);
    setNewCustName("");
    setNewCustPhone("");
    setNewCustInitialDue("");
    setNewCustNotes("");
  };

  const handleShareLedgerWhatsApp = (customer: KhataCustomer) => {
    const rawText = (
      `*${storeName.toUpperCase()} - CUSTOMER KHATA STATEMENT*\n` +
      `Customer: ${customer.name}\n` +
      `Date: ${new Date().toLocaleDateString()}\n` +
      `--------------------------------\n` +
      `*Total Outstanding Due: PKR ${customer.total_due.toFixed(2)}*\n` +
      `Total Recovered / Paid: PKR ${customer.total_paid.toFixed(2)}\n` +
      `--------------------------------\n` +
      `*Recent Transactions:*\n` +
      (customer.transactions?.slice(0, 5).map(t => 
        `• ${new Date(t.date).toLocaleDateString()}: ${t.type === 'credit' ? '+ Due' : '- Paid'} PKR ${t.amount.toFixed(2)} (${t.description})`
      ).join('\n') || 'No transactions yet.') +
      `\n--------------------------------\n` +
      `Kindly settle your pending balance. JazakAllah!`
    );
    const deepLinkUrl = buildWhatsAppDeepLink(customer.phone || '', rawText);
    window.open(deepLinkUrl, '_blank');
  };

  const handleSendReminderWhatsApp = (customer: KhataCustomer) => {
    const rawText = (
      `*Assalam-o-Alaikum ${customer.name},*\n\n` +
      `This is a gentle payment reminder from *${storeName}*.\n` +
      `Your current pending Khata (credit) balance is *PKR ${customer.total_due.toFixed(2)}*.\n\n` +
      `Kindly clear the outstanding amount at your earliest convenience. Thank you for your continued business!`
    );
    const deepLinkUrl = buildWhatsAppDeepLink(customer.phone || '', rawText);
    window.open(deepLinkUrl, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Customer Khata & Credit Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track receivables (Udhaar), cumulative ledger transactions, monthly aging, and cash settlements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Payment Reminders Action */}
          <Button
            onClick={() => setShowRemindersModal(true)}
            variant="outline"
            size="sm"
            className="text-xs font-semibold h-9 gap-1.5 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          >
            <Bell className="h-4 w-4 text-amber-600" />
            <span>Reminders</span>
            {customersWithDue > 0 && (
              <span className="h-5 px-1.5 rounded-full bg-amber-600 text-white font-mono text-[10px] flex items-center justify-center">
                {customersWithDue}
              </span>
            )}
          </Button>

          <Button
            onClick={() => setShowAddCustomerModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold text-xs h-9 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Account
          </Button>
        </div>
      </div>

      {/* =========================================================================
          MONTHLY A/R AGING SUMMARY CARDS
         ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-600" />
            Accounts Receivable Aging Summary (Udhaar Buckets)
          </h3>
          <span className="text-[11px] text-slate-500">
            Total Due: <strong className="font-mono text-slate-900">PKR {totalOutstandingDue.toFixed(2)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Current (0-15 Days) */}
          <button
            type="button"
            onClick={() => setAgingFilter(agingFilter === 'current' ? 'all' : 'current')}
            className={cn(
              "text-left p-3.5 rounded-xl border transition shadow-xs",
              agingFilter === 'current' ? "ring-2 ring-emerald-500 bg-emerald-50/80 border-emerald-300" : "bg-white border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
              <span>0 - 15 Days (Current)</span>
              <span className="font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[10px]">
                {agingSummary.current.count} accts
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold font-mono text-emerald-700">
              PKR {agingSummary.current.amount.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Healthy repayment timeline</p>
          </button>

          {/* Due Soon (16-30 Days) */}
          <button
            type="button"
            onClick={() => setAgingFilter(agingFilter === '16-30' ? 'all' : '16-30')}
            className={cn(
              "text-left p-3.5 rounded-xl border transition shadow-xs",
              agingFilter === '16-30' ? "ring-2 ring-amber-500 bg-amber-50/80 border-amber-300" : "bg-white border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
              <span>16 - 30 Days (Due)</span>
              <span className="font-mono bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[10px]">
                {agingSummary.due16_30.count} accts
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold font-mono text-amber-700">
              PKR {agingSummary.due16_30.amount.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Send polite monthly reminder</p>
          </button>

          {/* Aging Overdue (31-60 Days) */}
          <button
            type="button"
            onClick={() => setAgingFilter(agingFilter === '31-60' ? 'all' : '31-60')}
            className={cn(
              "text-left p-3.5 rounded-xl border transition shadow-xs",
              agingFilter === '31-60' ? "ring-2 ring-orange-500 bg-orange-50/80 border-orange-300" : "bg-white border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
              <span>31 - 60 Days (Aging)</span>
              <span className="font-mono bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded text-[10px]">
                {agingSummary.due31_60.count} accts
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold font-mono text-orange-700">
              PKR {agingSummary.due31_60.amount.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Requires recovery follow-up</p>
          </button>

          {/* Critical Overdue (60+ Days) */}
          <button
            type="button"
            onClick={() => setAgingFilter(agingFilter === '60plus' ? 'all' : '60plus')}
            className={cn(
              "text-left p-3.5 rounded-xl border transition shadow-xs",
              agingFilter === '60plus' ? "ring-2 ring-rose-500 bg-rose-50/80 border-rose-300" : "bg-white border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
              <span>60+ Days (Critical)</span>
              <span className="font-mono bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded text-[10px]">
                {agingSummary.overdue60.count} accts
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold font-mono text-rose-700">
              PKR {agingSummary.overdue60.amount.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">High credit risk • Settle immediately</p>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search Khata by customer name or phone number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs sm:text-sm bg-slate-50/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => { setAgingFilter('all'); setFilterDueOnly(false); }}
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium transition shrink-0",
              agingFilter === 'all' && !filterDueOnly ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All Accounts ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => { setAgingFilter('all'); setFilterDueOnly(!filterDueOnly); }}
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium transition shrink-0",
              filterDueOnly ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Due Only ({customersWithDue})
          </button>
          {agingFilter !== 'all' && (
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Aging: {agingFilter}
            </Badge>
          )}
        </div>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => {
          const agingDays = getCustomerAgingDays(customer);
          const aging = getCustomerAgingCategory(agingDays);

          return (
            <div
              key={customer.id}
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between space-y-3"
            >
              {/* Customer Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 truncate">{customer.name}</h4>
                  {customer.phone ? (
                    <a 
                      href={`tel:${customer.phone}`}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5 font-mono"
                    >
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </a>
                  ) : (
                    <p className="text-[11px] text-slate-400">No phone recorded</p>
                  )}
                </div>

                <Badge 
                  variant="outline" 
                  className={customer.total_due > 0 ? "bg-rose-50 text-rose-700 border-rose-200 font-bold" : "bg-emerald-50 text-emerald-700 border-emerald-200"}
                >
                  {customer.total_due > 0 ? `PKR ${customer.total_due.toFixed(0)} Due` : 'Clear / Settled'}
                </Badge>
              </div>

              {/* Balances & Aging details */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Outstanding</span>
                  <p className="font-mono font-bold text-sm text-slate-900">
                    PKR {customer.total_due.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Lifetime Paid</span>
                  <p className="font-mono font-bold text-sm text-emerald-700">
                    PKR {customer.total_paid.toFixed(2)}
                  </p>
                </div>
                {customer.total_due > 0 && (
                  <div className="col-span-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Aging Timeline:</span>
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", aging.color)}>
                      {aging.label} ({agingDays}d)
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenLedger(customer)}
                  className="text-xs h-8 px-2 text-slate-700 hover:bg-slate-100"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Statement
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendReminderWhatsApp(customer)}
                  disabled={customer.total_due <= 0}
                  className="text-xs h-8 px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  title="Send WhatsApp payment reminder"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1" />
                  Remind
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleOpenPayment(customer)}
                  disabled={customer.total_due <= 0}
                  className="text-xs h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5 mr-1" />
                  Settle
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold text-slate-700">No Khata Accounts Found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'No accounts matched your search criteria.' : 'Create your first customer credit account or complete a credit sale at the POS.'}
          </p>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: Cash Recovery / Partial or Full Settlement Modal
         ========================================================================= */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[460px] p-4 sm:p-6 bg-white text-slate-900">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Log Customer Payment / Settlement
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Account: <strong className="text-slate-900">{selectedCustomer?.name}</strong> • Current Due: <strong className="font-mono text-rose-600">PKR {selectedCustomer?.total_due.toFixed(2)}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmPayment} className="space-y-4 py-2">
            {/* Quick Settle Chips */}
            {selectedCustomer && selectedCustomer.total_due > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-900 font-semibold">
                  <span>Quick Settlement Presets:</span>
                  <span className="font-mono text-emerald-700">Due: PKR {selectedCustomer.total_due.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(selectedCustomer.total_due.toString())}
                    className="py-1.5 px-2 bg-emerald-600 text-white rounded-lg font-bold text-center hover:bg-emerald-700 transition"
                  >
                    100% Full Settle
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount((selectedCustomer.total_due * 0.5).toFixed(0))}
                    className="py-1.5 px-2 bg-white border border-emerald-300 text-emerald-800 rounded-lg font-medium text-center hover:bg-emerald-100 transition"
                  >
                    50% Partial
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount((selectedCustomer.total_due * 0.25).toFixed(0))}
                    className="py-1.5 px-2 bg-white border border-emerald-300 text-emerald-800 rounded-lg font-medium text-center hover:bg-emerald-100 transition"
                  >
                    25% Partial
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="pay-amount" className="text-xs font-semibold text-slate-700">
                Amount Received (PKR) *
              </Label>
              <Input
                id="pay-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="1"
                max={selectedCustomer?.total_due}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                className="h-11 text-lg font-mono font-bold bg-slate-50"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Settlement Method</Label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {["Cash", "Bank Transfer", "Digital/Online"].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={cn(
                      "py-2 rounded-lg border font-medium text-center transition",
                      paymentMode === mode ? "bg-emerald-600 text-white border-emerald-600 font-bold" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-notes" className="text-xs font-semibold text-slate-700">
                Memo / Reference (Optional)
              </Label>
              <Input
                id="pay-notes"
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                placeholder="e.g. Received by cashier, cheque #, slip #12"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                className="h-10 text-xs flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordPaymentMutation.isPending}
                className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
              >
                Confirm Settlement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 2: Customer Statement & Running Cumulative Ledger
         ========================================================================= */}
      <Dialog open={showLedgerModal} onOpenChange={setShowLedgerModal}>
        <DialogContent className="sm:max-w-[580px] max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white text-slate-900">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Ledger Statement: {selectedCustomer?.name}
              </DialogTitle>
              <Badge variant="outline" className="font-mono text-xs font-bold bg-rose-50 text-rose-700 border-rose-200">
                Balance Due: PKR {selectedCustomer?.total_due.toFixed(2)}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Audit trail of all purchases on credit and payments recorded in device IndexedDB
            </DialogDescription>
          </DialogHeader>

          {/* Ledger Statement Table */}
          <div className="space-y-3 py-2 text-xs">
            <div className="flex justify-between items-center text-slate-500 pb-2 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider">
              <span className="flex-1">Date & Description</span>
              <span className="w-24 text-center">Type</span>
              <span className="w-24 text-right">Amount</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {selectedCustomer?.transactions && selectedCustomer.transactions.length > 0 ? (
                selectedCustomer.transactions.map((tx) => (
                  <div key={tx.id} className="pt-2 flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{tx.description}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {format(new Date(tx.date), "dd MMM yyyy, hh:mm a")}
                        {tx.invoice_number && ` • Ref #${tx.invoice_number}`}
                      </p>
                    </div>

                    <div className="w-24 text-center shrink-0">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[9px] uppercase font-bold",
                          tx.type === 'credit' 
                            ? "bg-rose-50 text-rose-700 border-rose-200" 
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}
                      >
                        {tx.type === 'credit' ? "+ Credit" : "- Settled"}
                      </Badge>
                    </div>

                    <div className="text-right shrink-0 w-24 font-mono font-bold">
                      <span className={tx.type === 'credit' ? "text-rose-600" : "text-emerald-600"}>
                        {tx.type === 'credit' ? '+' : '-'} PKR {tx.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 py-6">No transactions recorded yet.</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
            {selectedCustomer && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleShareLedgerWhatsApp(selectedCustomer)}
                className="flex-1 text-xs gap-1.5 h-10 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                <Share2 className="h-4 w-4" />
                Share WhatsApp Statement
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowLedgerModal(false)}
              className="h-10 text-xs px-5"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 3: Payment Reminder List & Recovery Tracker
         ========================================================================= */}
      <Dialog open={showRemindersModal} onOpenChange={setShowRemindersModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white text-slate-900">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                Payment Reminder & Recovery List
              </DialogTitle>
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-mono text-xs">
                {customersWithDue} Active Due Accounts
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Accounts with pending credit balances, sorted by aging for rapid debt collection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto space-y-2 pr-1">
              {customers.filter(c => c.total_due > 0).map(cust => {
                const agingDays = getCustomerAgingDays(cust);
                const aging = getCustomerAgingCategory(agingDays);

                return (
                  <div key={cust.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">{cust.name}</span>
                        <span className={cn("text-[9px] px-1.5 py-0.2 rounded font-bold border", aging.color)}>
                          {agingDays}d overdue
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {cust.phone || 'No phone'} • Last active: {format(new Date(cust.last_activity), "dd MMM yyyy")}
                      </p>
                    </div>

                    <div className="text-right shrink-0 pr-2">
                      <span className="font-mono font-bold text-rose-600 text-sm">
                        PKR {cust.total_due.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendReminderWhatsApp(cust)}
                        className="h-8 px-2 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowRemindersModal(false);
                          handleOpenPayment(cust);
                        }}
                        className="h-8 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        Settle
                      </Button>
                    </div>
                  </div>
                );
              })}

              {customersWithDue === 0 && (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-xs font-semibold text-slate-700">Zero Outstanding Balances!</p>
                  <p className="text-[11px] text-slate-400">All customer Khata accounts are fully settled.</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowRemindersModal(false)}
              className="h-9 text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 4: Create New Khata Account
         ========================================================================= */}
      <Dialog open={showAddCustomerModal} onOpenChange={setShowAddCustomerModal}>
        <DialogContent className="sm:max-w-[440px] p-4 sm:p-6 bg-white text-slate-900">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              Open Customer Khata Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a dedicated customer credit ledger stored in device IndexedDB
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomer} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label htmlFor="cust-name" className="text-xs font-semibold text-slate-700">
                Customer Full Name *
              </Label>
              <Input
                id="cust-name"
                value={newCustName}
                onChange={e => setNewCustName(e.target.value)}
                placeholder="e.g. Dr. Salman Qureshi"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cust-phone" className="text-xs font-semibold text-slate-700">
                Phone Number
              </Label>
              <Input
                id="cust-phone"
                type="tel"
                inputMode="tel"
                value={newCustPhone}
                onChange={e => setNewCustPhone(e.target.value)}
                placeholder="0300-1234567"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cust-due" className="text-xs font-semibold text-slate-700">
                Initial Opening Due Balance (PKR)
              </Label>
              <Input
                id="cust-due"
                type="number"
                inputMode="decimal"
                value={newCustInitialDue}
                onChange={e => setNewCustInitialDue(e.target.value)}
                placeholder="0.00"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cust-notes" className="text-xs font-semibold text-slate-700">
                Account Notes / Address
              </Label>
              <Input
                id="cust-notes"
                value={newCustNotes}
                onChange={e => setNewCustNotes(e.target.value)}
                placeholder="e.g. Clinic Suite #4, verified local resident"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddCustomerModal(false)}
                className="h-9 text-xs flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
              >
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerKhataPage;
