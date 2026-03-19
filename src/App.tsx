import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense, useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if (navType !== "POP") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname, navType]);
  return null;
};

const Login = lazy(() => import("./pages/Login"));

// Lazy load all pages except Login (entry point)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ChangeId = lazy(() => import("./pages/ChangeId"));
const RequestVip = lazy(() => import("./pages/RequestVip"));
const SupportHub = lazy(() => import("./pages/SupportHub"));
const VipChat = lazy(() => import("./pages/VipChat"));
const SupportTickets = lazy(() => import("./pages/SupportTickets"));
const SupportChat = lazy(() => import("./pages/SupportChat"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const GiftRequest = lazy(() => import("./pages/GiftRequest"));
const CustomGiftUpload = lazy(() => import("./pages/CustomGiftUpload"));
const AnimatedPhotoRequest = lazy(() => import("./pages/AnimatedPhotoRequest"));
const EntryRequest = lazy(() => import("./pages/EntryRequest"));
const FramesRequest = lazy(() => import("./pages/FramesRequest"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const SalaryWithdraw = lazy(() => import("./pages/SalaryWithdraw"));

const MyRequests = lazy(() => import("./pages/MyRequests"));
const InstantIntro = lazy(() => import("./pages/InstantIntro"));
const InstantBanks = lazy(() => import("./pages/InstantBanks"));
const InstantRequest = lazy(() => import("./pages/InstantRequest"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PolicyPage = lazy(() => import("./pages/PolicyPage"));
const QuickSupport = lazy(() => import("./pages/QuickSupport"));
const SupportMain = lazy(() => import("./pages/SupportMain"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const HairsPage = lazy(() => import("./pages/HairsPage"));
const BDVerification = lazy(() => import("./pages/BDVerification"));
const BDDashboard = lazy(() => import("./pages/BDDashboard"));
const BDAddMember = lazy(() => import("./pages/BDAddMember"));
const BDWithdraw = lazy(() => import("./pages/BDWithdraw"));
const BanCheckPage = lazy(() => import("./pages/BanCheckPage"));
const CustomWaresRequest = lazy(() => import("./pages/CustomWaresRequest"));
const MyWaresRequests = lazy(() => import("./pages/MyWaresRequests"));
const AdminComplaint = lazy(() => import("./pages/AdminComplaint"));
const WorksPage = lazy(() => import("./pages/WorksPage"));
const AdminProfilePage = lazy(() => import("./pages/AdminProfilePage"));
const RoomBackgroundPage = lazy(() => import("./pages/RoomBackgroundPage"));
const DirectMessages = lazy(() => import("./pages/DirectMessages"));
const ChatRoom = lazy(() => import("./pages/ChatRoom"));

// Agent pages
const AgentLogin = lazy(() => import("./pages/agent/AgentLogin"));
const AgentSetup = lazy(() => import("./pages/agent/AgentSetup"));
const AgentDashboard = lazy(() => import("./pages/agent/AgentDashboard"));
const AgentCharge = lazy(() => import("./pages/agent/AgentCharge"));
const AgentHistory = lazy(() => import("./pages/agent/AgentHistory"));
const AgentStats = lazy(() => import("./pages/agent/AgentStats"));

// Admin sub-pages
const AdminGiftsPage = lazy(() => import("./pages/admin/AdminGiftsPage"));
const AdminIncomePage = lazy(() => import("./pages/admin/AdminIncomePage"));
const AdminBDPage = lazy(() => import("./pages/admin/AdminBDPage"));
const AdminVipPage = lazy(() => import("./pages/admin/AdminVipPage"));
const AdminBanPage = lazy(() => import("./pages/admin/AdminBanPage"));
const AdminIdChangePage = lazy(() => import("./pages/admin/AdminIdChangePage"));
const AdminSalaryPage = lazy(() => import("./pages/admin/AdminSalaryPage"));
const AdminAgenciesPage = lazy(() => import("./pages/admin/AdminAgenciesPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminSupportPage = lazy(() => import("./pages/admin/AdminSupportPage"));
const AdminChatPage = lazy(() => import("./pages/admin/AdminChatPage"));
const AdminLogPage = lazy(() => import("./pages/admin/AdminLogPage"));
const AdminAccountsPage = lazy(() => import("./pages/admin/AdminAccountsPage"));
const AdminRequestsPage = lazy(() => import("./pages/admin/AdminRequestsPage"));
const AdminWorksPage = lazy(() => import("./pages/admin/AdminWorksPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const App = () => {
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", e.reason);
      e.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/change-id" element={<ChangeId />} />
                  <Route path="/request-vip" element={<RequestVip />} />
                  <Route path="/support" element={<SupportHub />} />
                  <Route path="/support/vip-chat" element={<VipChat />} />
                  <Route path="/support/tickets" element={<SupportTickets />} />
                  <Route path="/support-chat" element={<SupportChat />} />
                  <Route path="/salary" element={<SalaryWithdraw />} />
                  <Route path="/report" element={<ReportPage />} />
                  <Route path="/gift" element={<GiftRequest />} />
                  <Route path="/custom-gift" element={<CustomGiftUpload />} />
                  <Route path="/animated-photo" element={<AnimatedPhotoRequest />} />
                  <Route path="/entry-request" element={<EntryRequest />} />
                  <Route path="/frames" element={<FramesRequest />} />
                  <Route path="/hairs" element={<HairsPage />} />
                  
                  <Route path="/my-requests" element={<MyRequests />} />
                  <Route path="/instant" element={<InstantIntro />} />
                  <Route path="/instant/banks" element={<InstantBanks />} />
                  <Route path="/instant/request" element={<InstantRequest />} />
                  <Route path="/admin" element={<AdminLogin />} />
                  <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                  <Route path="/admin/gifts" element={<AdminGiftsPage />} />
                  <Route path="/admin/income" element={<AdminIncomePage />} />
                  <Route path="/admin/bd" element={<AdminBDPage />} />
                  <Route path="/admin/vip" element={<AdminVipPage />} />
                  <Route path="/admin/ban" element={<AdminBanPage />} />
                  <Route path="/admin/id-change" element={<AdminIdChangePage />} />
                  <Route path="/admin/salary" element={<AdminSalaryPage />} />
                  <Route path="/admin/agencies" element={<AdminAgenciesPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                  <Route path="/admin/support" element={<AdminSupportPage />} />
                  <Route path="/admin/chat" element={<AdminChatPage />} />
                  <Route path="/admin/log" element={<AdminLogPage />} />
                  <Route path="/admin/accounts" element={<AdminAccountsPage />} />
                  <Route path="/admin/requests" element={<AdminRequestsPage />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/policy" element={<PolicyPage />} />
                  <Route path="/quick-support" element={<QuickSupport />} />
                  <Route path="/support-main" element={<SupportMain />} />
                  <Route path="/install" element={<InstallApp />} />
                  <Route path="/bd" element={<BDVerification />} />
                  <Route path="/bd/dashboard" element={<BDDashboard />} />
                  <Route path="/bd/add-member" element={<BDAddMember />} />
                  <Route path="/bd/withdraw" element={<BDWithdraw />} />
                  <Route path="/ban-check" element={<BanCheckPage />} />
                  <Route path="/custom-wares" element={<CustomWaresRequest />} />
                  <Route path="/my-wares-requests" element={<MyWaresRequests />} />
                  <Route path="/admin-complaint" element={<AdminComplaint />} />
                  <Route path="/admin/works" element={<AdminWorksPage />} />
                  <Route path="/works" element={<WorksPage />} />
                  <Route path="/room-background" element={<RoomBackgroundPage />} />
                  <Route path="/admin/profile/:uuid" element={<AdminProfilePage />} />
                  <Route path="/profile/:uuid" element={<AdminProfilePage />} />
                  <Route path="/messages" element={<DirectMessages />} />
                  <Route path="/admin/messages" element={<DirectMessages />} />
                  <Route path="/messages/:conversationId" element={<ChatRoom />} />
                  <Route path="/login/agent" element={<AgentLogin />} />
                  <Route path="/agent/setup" element={<AgentSetup />} />
                  <Route path="/agent" element={<AgentDashboard />} />
                  <Route path="/agent/charge" element={<AgentCharge />} />
                  <Route path="/agent/history" element={<AgentHistory />} />
                  <Route path="/agent/stats" element={<AgentStats />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
