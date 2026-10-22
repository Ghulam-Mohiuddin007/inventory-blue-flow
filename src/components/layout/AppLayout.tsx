import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  History, 
  BarChart3, 
  LogOut, 
  Menu, 
  X, 
  HardDrive, 
  ShieldCheck, 
  Plus, 
  Download, 
  Upload, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Store
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useProducts, useKhataCustomers } from "@/hooks/useInventoryData";
import { InstallButton } from "@/components/InstallButton";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenAddProduct?: () => void;
  onOpenAddSale?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children,
  onOpenAddProduct,
  onOpenAddSale,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: products = [] } = useProducts();
  const { data: khataCustomers = [] } = useKhataCustomers();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lowStockCount = products.filter(p => p.quantity < 10).length;
  const khataDueCount = khataCustomers.filter(c => c.total_due > 0).length;

  const navItems = [
    {
      title: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      title: "Inventory & Stock",
      path: "/inventory",
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} low` : null,
      badgeVariant: "destructive" as const,
    },
    {
      title: "POS Terminal",
      path: "/pos",
      icon: ShoppingCart,
      badge: "Fast",
      badgeVariant: "secondary" as const,
    },
    {
      title: "Customer Khata",
      path: "/khata",
      icon: Users,
      badge: khataDueCount > 0 ? `${khataDueCount} due` : null,
      badgeVariant: "destructive" as const,
    },
    {
      title: "Sales History",
      path: "/sales-history",
      icon: BarChart3,
      badge: null,
    },
    {
      title: "Stock Entry Log",
      path: "/stock-entries",
      icon: History,
      badge: null,
    },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-800">
      {/* DESKTOP SIDEBAR + MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex w-full">
        {/* DESKTOP SIDEBAR (Visible on md and above) */}
        <aside 
          className={cn(
            "hidden md:flex flex-col bg-[#0f172a] text-slate-300 border-r border-slate-800 transition-all duration-300 sticky top-0 h-screen z-40 shrink-0 select-none",
            isSidebarCollapsed ? "w-20" : "w-64"
          )}
        >
          {/* Brand Header */}
          <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
            <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shrink-0">
                <Store className="h-5 w-5" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-white tracking-tight truncate">Inventory Blue</h2>
                  <p className="text-[10px] text-blue-400 font-mono tracking-wider uppercase">SaaS Enterprise</p>
                </div>
              )}
            </Link>

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative",
                    active 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  )}
                  title={isSidebarCollapsed ? item.title : undefined}
                >
                  <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", active ? "text-white" : "text-slate-400")} />
                  
                  {!isSidebarCollapsed && (
                    <span className="flex-1 truncate">{item.title}</span>
                  )}

                  {!isSidebarCollapsed && item.badge && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold tracking-tight uppercase",
                      item.badgeVariant === 'destructive' 
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" 
                        : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Device Storage Status Card */}
          {!isSidebarCollapsed && (
            <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>IndexedDB Engine Active</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                Data persists in local device IndexedDB via Dexie.js. Zero cloud dependency.
              </p>
            </div>
          )}

          {/* User Profile & Sign Out Footer */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
            <div className={cn("flex items-center gap-2", isSidebarCollapsed ? "justify-center" : "justify-between")}>
              {!isSidebarCollapsed && (
                <div className="min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate">{user?.storeName || user?.name || "Shopkeeper"}</p>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase",
                      user?.role === 'staff' 
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                        : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    )}>
                      {user?.role || 'admin'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                </div>
              )}
              
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition shrink-0"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN APPLICATION CONTAINER */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {/* ENTERPRISE TOP NAVBAR */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
            <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
              {/* Left: Mobile hamburger or page context */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2">
                  <div className="md:hidden h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                      {user?.storeName || "Inventory Blue Flow"}
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1.5 ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      IndexedDB Offline Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Action Tools */}
              <div className="flex items-center gap-2 sm:gap-3">
                <InstallButton />

                {onOpenAddSale && (
                  <Button 
                    size="sm" 
                    onClick={onOpenAddSale}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold text-xs h-9 px-3 gap-1.5"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Quick Sale</span>
                  </Button>
                )}

                {onOpenAddProduct && (
                  <Button 
                    size="sm" 
                    onClick={onOpenAddProduct}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold text-xs h-9 px-3 gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">New Product</span>
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* MAIN WORKSPACE BODY */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
            {children}
          </main>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Fixed on small screens, min 44px tap targets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 px-2 py-1 flex items-center justify-around shadow-lg safe-bottom">
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-[10px] font-semibold transition active:scale-95",
            isActive("/") ? "text-indigo-600 font-bold" : "text-slate-500"
          )}
        >
          <LayoutDashboard className="h-5 w-5 mb-0.5" />
          <span>Home</span>
        </Link>

        <Link
          to="/inventory"
          className={cn(
            "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-[10px] font-semibold transition active:scale-95 relative",
            isActive("/inventory") ? "text-indigo-600 font-bold" : "text-slate-500"
          )}
        >
          <Package className="h-5 w-5 mb-0.5" />
          <span>Stock</span>
          {lowStockCount > 0 && (
            <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-rose-500" />
          )}
        </Link>

        {/* Central Prominent POS Terminal button */}
        <Link
          to="/pos"
          className="flex flex-col items-center justify-center -mt-4 bg-indigo-600 text-white h-12 w-12 rounded-full shadow-lg shadow-indigo-600/40 active:scale-90 transition"
          aria-label="POS Terminal"
        >
          <ShoppingCart className="h-5 w-5" />
        </Link>

        <Link
          to="/khata"
          className={cn(
            "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-[10px] font-semibold transition active:scale-95 relative",
            isActive("/khata") ? "text-indigo-600 font-bold" : "text-slate-500"
          )}
        >
          <Users className="h-5 w-5 mb-0.5" />
          <span>Khata</span>
          {khataDueCount > 0 && (
            <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-rose-500" />
          )}
        </Link>

        <Link
          to="/sales-history"
          className={cn(
            "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-[10px] font-semibold transition active:scale-95",
            isActive("/sales-history") ? "text-indigo-600 font-bold" : "text-slate-500"
          )}
        >
          <BarChart3 className="h-5 w-5 mb-0.5" />
          <span>Sales</span>
        </Link>
      </nav>

      {/* MOBILE DRAWER / FLYOUT MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setMobileMenuOpen(false)} 
          />

          <div className="relative w-4/5 max-w-xs bg-[#0f172a] text-slate-200 h-full flex flex-col shadow-2xl z-10">
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-indigo-400" />
                <span className="font-bold text-white text-sm">Inventory Blue</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-2">Navigation</p>
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold",
                      isActive(item.path) 
                        ? "bg-indigo-600 text-white" 
                        : "text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="text-xs">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-white">{user?.storeName || user?.name || "Shopkeeper"}</p>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase",
                    user?.role === 'staff' 
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                      : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  )}>
                    {user?.role || 'admin'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">{user?.email}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="text-rose-400 hover:bg-rose-950/30 text-xs"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
