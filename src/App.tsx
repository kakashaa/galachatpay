import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ChangeId from "./pages/ChangeId";
import RequestVip from "./pages/RequestVip";
import PlaceholderPage from "./pages/PlaceholderPage";
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
          <Route path="/salary" element={<PlaceholderPage title="سحب الراتب" />} />
          <Route path="/report" element={<PlaceholderPage title="بلاغ / حظر" />} />
          <Route path="/support" element={<PlaceholderPage title="الدعم السريع" />} />
          <Route path="/gift" element={<PlaceholderPage title="طلب هدية" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
