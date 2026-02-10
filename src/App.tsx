import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ChangeId from "./pages/ChangeId";
import RequestVip from "./pages/RequestVip";
import QuickSupport from "./pages/QuickSupport";
import PlaceholderPage from "./pages/PlaceholderPage";
import GiftRequest from "./pages/GiftRequest";
import ReportPage from "./pages/ReportPage";
import SalaryWithdraw from "./pages/SalaryWithdraw";
import BDRequest from "./pages/BDRequest";
import BDDashboard from "./pages/BDDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/change-id" element={<ChangeId />} />
          <Route path="/request-vip" element={<RequestVip />} />
          <Route path="/support" element={<QuickSupport />} />
          <Route path="/salary" element={<SalaryWithdraw />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/gift" element={<GiftRequest />} />
          <Route path="/bd-request" element={<BDRequest />} />
          <Route path="/bd-dashboard" element={<BDDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
