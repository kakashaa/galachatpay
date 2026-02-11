import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import Login from "./pages/Login";

// Lazy load all pages except Login (entry point)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ChangeId = lazy(() => import("./pages/ChangeId"));
const RequestVip = lazy(() => import("./pages/RequestVip"));
const QuickSupport = lazy(() => import("./pages/QuickSupport"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const GiftRequest = lazy(() => import("./pages/GiftRequest"));
const CustomGiftUpload = lazy(() => import("./pages/CustomGiftUpload"));
const AnimatedPhotoRequest = lazy(() => import("./pages/AnimatedPhotoRequest"));
const EntryRequest = lazy(() => import("./pages/EntryRequest"));
const FramesRequest = lazy(() => import("./pages/FramesRequest"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const SalaryWithdraw = lazy(() => import("./pages/SalaryWithdraw"));
const BDRequest = lazy(() => import("./pages/BDRequest"));
const BDDashboard = lazy(() => import("./pages/BDDashboard"));
const MyRequests = lazy(() => import("./pages/MyRequests"));
const InstantIntro = lazy(() => import("./pages/InstantIntro"));
const InstantBanks = lazy(() => import("./pages/InstantBanks"));
const InstantRequest = lazy(() => import("./pages/InstantRequest"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Notifications = lazy(() => import("./pages/Notifications"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/change-id" element={<ChangeId />} />
              <Route path="/request-vip" element={<RequestVip />} />
              <Route path="/support" element={<QuickSupport />} />
              <Route path="/salary" element={<SalaryWithdraw />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/gift" element={<GiftRequest />} />
              <Route path="/custom-gift" element={<CustomGiftUpload />} />
              <Route path="/animated-photo" element={<AnimatedPhotoRequest />} />
              <Route path="/entry-request" element={<EntryRequest />} />
              <Route path="/frames" element={<FramesRequest />} />
              <Route path="/bd-request" element={<BDRequest />} />
              <Route path="/bd-dashboard" element={<BDDashboard />} />
              <Route path="/my-requests" element={<MyRequests />} />
              <Route path="/instant" element={<InstantIntro />} />
              <Route path="/instant/banks" element={<InstantBanks />} />
              <Route path="/instant/request" element={<InstantRequest />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
