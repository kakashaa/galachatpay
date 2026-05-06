/* app v2 */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense, useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import AdminRouteGuard from "@/components/AdminRouteGuard";

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
const Maintenance = lazy(() => import("./pages/Maintenance"));

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
const SalaryHome = lazy(() => import("./pages/SalaryHome"));
const VerifyPhone = lazy(() => import("./pages/VerifyPhone"));
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
const SupporterBenefits = lazy(() => import("./pages/SupporterBenefits"));
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
const AdminUserFinancePage = lazy(() => import("./pages/admin/AdminUserFinancePage"));
const AdminChargebackPage = lazy(() => import("./pages/admin/AdminChargebackPage"));
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
const AdminHostRequestsPage = lazy(() => import("./pages/admin/AdminHostRequestsPage"));
const AdminMonitorPage = lazy(() => import("./pages/admin/AdminMonitorPage"));
const AdminSupporterClubPage = lazy(() => import("./pages/admin/AdminSupporterClubPage"));
const AdminLiveDashboardPage = lazy(() => import("./pages/admin/AdminLiveDashboardPage"));
const AdminDeductionsPage = lazy(() => import("./pages/admin/AdminDeductionsPage"));
const AdminHealthCheck = lazy(() => import("./pages/admin/AdminHealthCheck"));
const AdminVerifiedPhonesPage = lazy(() => import("./pages/admin/AdminVerifiedPhonesPage"));
const AdminLoginBansPage = lazy(() => import("./pages/admin/AdminLoginBansPage"));
const SupportTicketsEmbed = lazy(() => import("./pages/SupportTicketsEmbed"));
const SupportChatEmbed = lazy(() => import("./pages/SupportChatEmbed"));

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

  // Auto-check for app updates via version.json
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const r = await fetch('/version.json?t=' + Date.now());
        const data = await r.json();
        const saved = localStorage.getItem('app_version');
        if (saved && saved !== data.version && data.forceRefresh) {
          localStorage.setItem('app_version', data.version);
          if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map(n => caches.delete(n)));
          }
          window.location.reload();
        } else {
          localStorage.setItem('app_version', data.version);
        }
      } catch {}
    };
    checkVersion();
    const interval = setInterval(checkVersion, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Check for SW updates every 5 minutes
  useEffect(() => {
    const checkSW = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(reg => reg.update());
        });
      }
    };
    const interval = setInterval(checkSW, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Server health check
  const [serverDown, setServerDown] = useState(false);
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('https://hola-chat.com/health.php', {
          signal: AbortSignal.timeout(5000),
        });
        setServerDown(!r.ok);
      } catch {
        setServerDown(true);
      }
    };
    check();
    const i = setInterval(check, 60000);
    return () => clearInterval(i);
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
              {serverDown && (
                <div className="fixed top-0 inset-x-0 bg-destructive text-destructive-foreground text-center py-2 text-sm z-50 font-bold" dir="rtl">
                  ⚠️ بعض الخدمات غير متاحة مؤقتاً
                </div>
              )}
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="*" element={<Maintenance />} />
                  {false && (<>

                  <Route path="/" element={<Login />} />
                  <Route path="/index" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/change-id" element={<ChangeId />} />
                  <Route path="/request-vip" element={<RequestVip />} />
                  <Route path="/support" element={<SupportHub />} />
                  <Route path="/support/vip-chat" element={<VipChat />} />
                  <Route path="/support/tickets" element={<SupportTickets />} />
                  <Route path="/support-chat" element={<SupportChat />} />
                  <Route path="/salary" element={<SalaryHome />} />
                  <Route path="/verify" element={<VerifyPhone />} />
                  <Route path="/salary/cash" element={<SalaryWithdraw />} />
                  <Route path="/salary/charge-self" element={<SalaryWithdraw />} />
                  <Route path="/salary/charge-other" element={<SalaryWithdraw />} />
                  <Route path="/salary/instant" element={<InstantIntro />} />
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
                  <Route path="/admin/gifts" element={<AdminRouteGuard><AdminGiftsPage /></AdminRouteGuard>} />
                  <Route path="/admin/income" element={<AdminRouteGuard><AdminIncomePage /></AdminRouteGuard>} />
                  <Route path="/admin/user-finance" element={<AdminRouteGuard><AdminUserFinancePage /></AdminRouteGuard>} />
                  <Route path="/admin/chargebacks" element={<AdminRouteGuard><AdminChargebackPage /></AdminRouteGuard>} />
                  <Route path="/admin/bd" element={<AdminRouteGuard><AdminBDPage /></AdminRouteGuard>} />
                  <Route path="/admin/vip" element={<AdminRouteGuard><AdminVipPage /></AdminRouteGuard>} />
                  <Route path="/admin/ban" element={<AdminRouteGuard><AdminBanPage /></AdminRouteGuard>} />
                  <Route path="/admin/id-change" element={<AdminRouteGuard><AdminIdChangePage /></AdminRouteGuard>} />
                  <Route path="/admin/salary" element={<AdminRouteGuard><AdminSalaryPage /></AdminRouteGuard>} />
                  <Route path="/admin/agencies" element={<AdminRouteGuard><AdminAgenciesPage /></AdminRouteGuard>} />
                  <Route path="/admin/settings" element={<AdminRouteGuard><AdminSettingsPage /></AdminRouteGuard>} />
                  <Route path="/admin/support" element={<AdminRouteGuard><AdminSupportPage /></AdminRouteGuard>} />
                  <Route path="/admin/chat" element={<AdminRouteGuard><AdminChatPage /></AdminRouteGuard>} />
                  <Route path="/admin/log" element={<AdminRouteGuard><AdminLogPage /></AdminRouteGuard>} />
                  <Route path="/admin/accounts" element={<AdminRouteGuard><AdminAccountsPage /></AdminRouteGuard>} />
                  <Route path="/admin/requests" element={<AdminRouteGuard><AdminRequestsPage /></AdminRouteGuard>} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/policy" element={<PolicyPage />} />
                  <Route path="/quick-support" element={<QuickSupport />} />
                  <Route path="/support-main" element={<SupportMain />} />
                  <Route path="/support-tickets" element={<SupportTickets />} />
                  <Route path="/install" element={<InstallApp />} />
                  <Route path="/bd" element={<BDVerification />} />
                  <Route path="/bd/dashboard" element={<BDDashboard />} />
                  <Route path="/bd/add-member" element={<BDAddMember />} />
                  <Route path="/bd/withdraw" element={<BDWithdraw />} />
                  <Route path="/ban-check" element={<BanCheckPage />} />
                  <Route path="/custom-wares" element={<CustomWaresRequest />} />
                  <Route path="/my-wares-requests" element={<MyWaresRequests />} />
                  <Route path="/admin-complaint" element={<AdminComplaint />} />
                  <Route path="/admin/works" element={<AdminRouteGuard><AdminWorksPage /></AdminRouteGuard>} />
                  <Route path="/works" element={<WorksPage />} />
                  <Route path="/room-background" element={<RoomBackgroundPage />} />
                  <Route path="/admin/host-requests" element={<AdminRouteGuard><AdminHostRequestsPage /></AdminRouteGuard>} />
                  <Route path="/admin/monitor" element={<AdminRouteGuard><AdminMonitorPage /></AdminRouteGuard>} />
                  <Route path="/admin/supporter-club" element={<AdminRouteGuard><AdminSupporterClubPage /></AdminRouteGuard>} />
                  <Route path="/admin/live-dashboard" element={<AdminRouteGuard><AdminLiveDashboardPage /></AdminRouteGuard>} />
                  <Route path="/admin/deductions" element={<AdminRouteGuard><AdminDeductionsPage /></AdminRouteGuard>} />
                  <Route path="/admin/health-check" element={<AdminRouteGuard><AdminHealthCheck /></AdminRouteGuard>} />
                  <Route path="/admin/verified-phones" element={<AdminRouteGuard><AdminVerifiedPhonesPage /></AdminRouteGuard>} />
                  <Route path="/admin/login-bans" element={<AdminRouteGuard><AdminLoginBansPage /></AdminRouteGuard>} />
                  <Route path="/admin/profile/:uuid" element={<AdminProfilePage />} />
                  <Route path="/profile/:uuid" element={<AdminProfilePage />} />
                  <Route path="/supporter-benefits" element={<SupporterBenefits />} />
                  <Route path="/messages" element={<DirectMessages />} />
                  <Route path="/admin/messages" element={<DirectMessages />} />
                  <Route path="/messages/:conversationId" element={<ChatRoom />} />
                  <Route path="/login/agent" element={<AgentLogin />} />
                  <Route path="/agent/setup" element={<AgentSetup />} />
                  <Route path="/agent" element={<AgentDashboard />} />
                  <Route path="/agent/charge" element={<AgentCharge />} />
                  <Route path="/agent/history" element={<AgentHistory />} />
                  <Route path="/agent/stats" element={<AgentStats />} />
                  <Route path="/embed/support-tickets" element={<SupportTicketsEmbed />} />
                  <Route path="/embed/support-chat" element={<SupportChatEmbed />} />
                  <Route path="*" element={<NotFound />} />
                  </>)}
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
