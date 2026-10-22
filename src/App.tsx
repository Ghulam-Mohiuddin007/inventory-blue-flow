import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import Inventory from "./pages/Inventory";
import PosTerminal from "./pages/PosTerminal";
import CustomerKhataPage from "./pages/CustomerKhataPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import StockEntriesPage from "./pages/StockEntriesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <Index />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/inventory" element={
              <ProtectedRoute>
                <AppLayout>
                  <Inventory />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/pos" element={
              <ProtectedRoute>
                <AppLayout>
                  <PosTerminal />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/khata" element={
              <ProtectedRoute>
                <AppLayout>
                  <CustomerKhataPage />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/sales-history" element={
              <ProtectedRoute>
                <AppLayout>
                  <SalesHistoryPage />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/stock-entries" element={
              <ProtectedRoute>
                <AppLayout>
                  <StockEntriesPage />
                </AppLayout>
              </ProtectedRoute>
            } />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
