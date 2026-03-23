import { supabase } from "@/integrations/supabase/client";
import { API_URLS } from "@/config/api";

const GALA_MEDIA_BASE = API_URLS.MEDIA;

class GalaApiService {
  private readonly TIMEOUT_TOLERANT_ACTIONS = new Set([
    "agency-salary",
    "user-monthly-charges",
  ]);

  // === Generic proxy call ===
  private async call(target: string, action: string, params: Record<string, unknown> = {}, requireAdmin = false) {
    const body: Record<string, unknown> = { target, action, ...params };

    if (requireAdmin) {
      const token = localStorage.getItem("admin_session_token");
      if (token) body._admin_token = token;
    }

    const { data, error } = await supabase.functions.invoke("gala-proxy", { body });
    if (error) {
      const msg = typeof error === "object" && error?.message ? error.message : String(error);

      if (msg.includes("401") || msg.includes("غير صالحة")) {
        console.warn("[galaApi] Session expired or invalid for action:", action);
        throw new Error("جلسة الأدمن منتهية — أعد تسجيل الدخول");
      }

      if ((msg.includes("Signal timed out") || msg.includes("timed out")) && this.TIMEOUT_TOLERANT_ACTIONS.has(action)) {
        console.warn("[galaApi] Timeout tolerated for action:", action);
        return { success: false, timeout: true, error: "Signal timed out.", data: null };
      }

      throw error;
    }

    if (data?.error) throw new Error(data.error);
    return data;
  }


  // === Token (for ranking/search — hides Facebook bypass) ===
  async getToken(): Promise<string> {
    const { data } = await supabase.functions.invoke("gala-token");
    return data?.token || "";
  }

  // ═══════════════════════════
  //  project-z actions
  // ═══════════════════════════

  async getUserInfo(uuid: string) {
    return this.call("project-z", "admin_user_info", { uuid });
  }

  async giveVip(uuid: string, level: number, duration: string) {
    return this.call("project-z", "admin_give_vip", { uuid, level, duration }, true);
  }

  async changeUuid(uuid: string, newUuid: string) {
    return this.call("project-z", "admin_change_uuid", { uuid, new_uuid: newUuid }, true);
  }

  async banUser(uuid: string, reason: string, params: Record<string, unknown> = {}) {
    return this.call("project-z", "admin_ban_user", { uuid, reason, ...params }, true);
  }

  async unbanUser(uuid: string) {
    return this.call("project-z", "admin_ban_user", { uuid, unban: "true", reason: "admin_action" }, true);
  }

  async adminLogin(username: string, password: string) {
    return this.call("project-z", "admin_login", { username, password });
  }

  async adminFirstSetup(username: string, newPassword: string, phone: string) {
    const session_token = localStorage.getItem("admin_session_token") || "";
    const { data, error } = await supabase.functions.invoke("admin-manage", {
      body: { username, session_token, action: "admin_first_setup", data: { new_password: newPassword, phone } },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return { success: true, ...data };
  }

  // Salary
  async checkSalary(uuid: string) {
    return this.call("project-z", "salary_check", { uuid });
  }

  async salaryReport(uuid: string) {
    return this.call("project-z", "salary_report", { uuid });
  }

  async salaryCheckAll(uuid: string) {
    return this.call("project-z", "salary_check_all", { uuid });
  }

  async mySalaryRequests(uuid: string, month: string) {
    return this.call("project-z", "my_salary_requests", { uuid, month });
  }

  async userTransfers(uuid: string) {
    return this.call("project-z", "user_transfers", { uuid });
  }

  // User detail reports
  async chargesReport(uuid: string, from?: string, to?: string) {
    return this.call("project-z", "admin_charges_report", { uuid, ...(from ? { from } : {}), ...(to ? { to } : {}) }, true);
  }

  async giftLogs(uuid: string, direction: "sender" | "receiver", from?: string, to?: string) {
    return this.call("project-z", "admin_gift_logs", { uuid, direction, ...(from ? { from } : {}), ...(to ? { to } : {}) }, true);
  }

  async salaryWithdrawList(month: string) {
    return this.call("project-z", "salary_withdraw_list", { month }, true);
  }

  async salaryWithdrawApprove(requestId: string, receiptImage: string, notes: string) {
    return this.call("project-z", "salary_withdraw_approve", {
      request_id: requestId, receipt_image: receiptImage, notes,
    }, true);
  }

  async salaryWithdrawReject(requestId: string, reason: string, image?: string) {
    return this.call("project-z", "salary_withdraw_reject", {
      request_id: requestId, reason, image,
    }, true);
  }

  async salaryChargeList(month: string) {
    return this.call("project-z", "salary_charge_list", { month }, true);
  }

  async chargeCoins(uuid: string, amount: number, referenceId: string, targetUuid?: string, requestType?: string) {
    return this.call("project-z", "salary_charge_manual", {
      uuid, amount, reference_id: referenceId,
      ...(targetUuid ? { target_uuid: targetUuid } : {}),
      ...(requestType ? { request_type: requestType } : {}),
    }, true);
  }

  // Agencies
  async agencyList() {
    return this.call("project-z", "agency_list", {}, true);
  }

  async agencyCreate(params: Record<string, unknown>) {
    return this.call("project-z", "agency_create", params, true);
  }

  async agencyAddBalance(username: string, coins: number) {
    return this.call("project-z", "agency_add_balance", { username, coins }, true);
  }

  async agencyToggle(username: string) {
    return this.call("project-z", "agency_toggle", { username }, true);
  }

  async agencyUpdate(params: Record<string, unknown>) {
    return this.call("project-z", "agency_update", params, true);
  }

  async agencySalaryCheck(agencyId: string) {
    return this.call("project-z", "agency_salary_check", { agency_id: agencyId }, true);
  }

  // Agents
  async agentTransactions(username: string) {
    return this.call("project-z", "agent_transactions", { username }, true);
  }

  async agentLookupUser(uuid: string, token?: string) {
    if (token) return this.call("project-z", "agent_lookup_user", { uuid, token });
    return this.call("project-z", "agent_lookup_user", { uuid }, true);
  }

  async agentLogin(username: string, password: string) {
    return this.call("project-z", "agent_login", { username, password });
  }

  async agentChangePassword(token: string, oldPassword: string, newPassword: string) {
    return this.call("project-z", "agent_change_password", { token, old_password: oldPassword, new_password: newPassword });
  }

  async agentCharge(token: string, params: Record<string, unknown>) {
    return this.call("project-z", "agent_charge", { token, ...params });
  }

  async agentDashboard(token: string) {
    return this.call("project-z", "agent_dashboard", { token });
  }

  async agentHistory(token: string, params: Record<string, string> = {}) {
    return this.call("project-z", "agent_history", { token, ...params });
  }

  async agentStats(token: string) {
    return this.call("project-z", "agent_stats", { token });
  }

  // db-proxy detail reports
  async giftsSent(uuid: string, start: string, end: string) {
    return this.dbProxy("gifts-sent", { uuid, start, end }, true);
  }

  async giftsReceived(uuid: string, start: string, end: string) {
    return this.dbProxy("gifts-received", { uuid, start, end }, true);
  }

  async chargesByUuid(uuid: string, start: string, end: string) {
    return this.dbProxy("charges-by-uuid", { uuid, start, end }, true);
  }

  // Avatar
  async getAvatar(uuid: string) {
    return this.call("project-z", "get_avatar", { uuid });
  }

  // Chat
  async chatList() {
    return this.call("project-z", "admin_chat_list", {}, true);
  }

  async chatMessages(chatId: string) {
    return this.call("project-z", "admin_chat_messages", { chat_id: chatId }, true);
  }

  async chatSend(chatId: string, message: string, senderName?: string, mediaUrl?: string) {
    return this.call("project-z", "admin_chat_send", {
      chat_id: chatId, message,
      ...(senderName ? { sender_name: senderName } : {}),
      ...(mediaUrl ? { media_url: mediaUrl } : {}),
    }, true);
  }

  // Action log
  async actionLog(params: Record<string, string> = {}) {
    return this.call("project-z", "admin_action_log", params, true);
  }

  // WhatsApp
  async sendWhatsApp(phone: string, message: string) {
    return this.call("project-z", "wa_notify", { phone, message }, true);
  }

  // Upload helpers
  async updateUserAvatar(uuid: string, avatarUrl: string) {
    return this.call("project-z", "update_user_avatar", { uuid, avatar_url: avatarUrl }, true);
  }

  async uploadCustomGift(userName: string, videoUrl: string, thumbnailUrl: string, price: string) {
    return this.call("project-z", "upload_custom_gift", {
      user_name: userName, video_url: videoUrl, thumbnail_url: thumbnailUrl, price,
    }, true);
  }

  // ═══════════════════════════
  //  hola-chat actions
  // ═══════════════════════════

  async checkSupporter(uuid: string) {
    return this.call("hola-chat", "check-supporter", { uuid });
  }

  async checkAgency(agencyId: string) {
    return this.call("hola-chat", "check-agency", { agency_id: agencyId });
  }

  async getAlerts() {
    return this.call("hola-chat", "promo-alerts");
  }

  async askBot(question: string) {
    return this.call("hola-chat", "monitor-query", { question });
  }

  async getPromoConfig() {
    return this.call("hola-chat", "promo-config", {}, true);
  }

  async updatePromoConfig(update: Record<string, string>) {
    return this.call("hola-chat", "promo-config", update, true);
  }

  async getAgencyMembers(agencyId: number) {
    return this.call("hola-chat", "agency-members", { agency_id: agencyId });
  }

  async getAgencyRequests(agencyId: number) {
    return this.call("hola-chat", "agency-requests", { agency_id: agencyId });
  }

  async banUserReal(uuid: string, reason: string, hours: number, banType: string) {
    return this.call("hola-chat", "ban-user-real", { uuid, reason, hours: String(hours), ban_type: banType }, true);
  }

  async unbanUserReal(uuid: string, unbanType: string = "normal") {
    return this.call("hola-chat", "unban-user-real", { uuid, unban_type: unbanType }, true);
  }

  async userMonthlyCharges(uuid: string, month: string) {
    return this.call("hola-chat", "user-monthly-charges", { uuid, month });
  }

  async agencySalary(agencyId: string, year: string, monthNum: string, uuid?: string) {
    return this.call("hola-chat", "agency-salary", { agency_id: agencyId, year, month_num: monthNum, ...(uuid ? { uuid } : {}) });
  }

  async listRoomBgRequests() {
    return this.call("hola-chat", "list-room-bg-requests");
  }

  async uploadRoomBackground(uuid: string, imageUrl: string) {
    return this.call("hola-chat", "upload-room-background", { uuid, image_url: imageUrl }, true);
  }

  async userFull(uuid: string) {
    return this.call("hola-chat", "user-full", { uuid });
  }

  // bd-data
  async bdUserMonthlyCharges(uuid: string, month: string) {
    return this.call("bd-data", "user-monthly-charges", { uuid, month });
  }

  // ═══════════════════════════
  //  aws actions
  // ═══════════════════════════

  async awsUserInfo(uuid: string) {
    return this.call("aws", "user-info", { uuid });
  }

  async setFrame(uuid: string, wareId: number) {
    return this.call("aws", "set-frame", { uuid, ware_id: wareId, _method: "POST" }, true);
  }

  async setEntry(uuid: string, wareId: number) {
    return this.call("aws", "set-entry", { uuid, ware_id: wareId, _method: "POST" }, true);
  }

  async setNecklace(uuid: string, wareId: number) {
    return this.call("aws", "set-necklace", { uuid, ware_id: wareId, _method: "POST" }, true);
  }

  async addDiamonds(uuid: string, amount: number) {
    return this.call("aws", "add-diamonds", { uuid, amount, _method: "POST" }, true);
  }

  // ═══════════════════════════
  //  db-proxy actions
  // ═══════════════════════════

  async dbProxy(action: string, params: Record<string, string | number> = {}, requireAdmin = false) {
    return this.call("db-proxy", action, params, requireAdmin);
  }

  async activityFeed(limit?: number) {
    return this.dbProxy("activity-feed", limit ? { limit } : {});
  }

  async userDiamonds(uuid: string) {
    return this.dbProxy("user-diamonds", { uuid });
  }

  async withdrawStatus(uuid: string) {
    return this.dbProxy("withdraw-status", { uuid });
  }

  async resetCashUsed(uuid: string, salaryType: string) {
    return this.call("db-proxy", "reset-cash-used", { uuid, salary_type: salaryType }, true);
  }

  async withdrawAgency(uuid: string, usd: number, method: string, toUuid?: string) {
    return this.dbProxy("withdraw-agency", {
      uuid, usd, method,
      ...(toUuid ? { to_uuid: toUuid } : {}),
    });
  }

  async dbTransfer(fromUuid: string, toUuid: string, usd: number) {
    return this.dbProxy("transfer", { from_uuid: fromUuid, to_uuid: toUuid, usd });
  }

  async dbSalaryCheck(uuid: string) {
    return this.dbProxy("salary-check", { uuid });
  }

  async salaryAudit() {
    return this.dbProxy("salary-audit");
  }

  async dailySummary() {
    return this.dbProxy("daily-summary");
  }

  async giftLookup(senderUuid: string, dateFrom: string, dateTo: string, receiverUuid?: string) {
    return this.dbProxy("gift-lookup", {
      sender_uuid: senderUuid, date_from: dateFrom, date_to: dateTo,
      ...(receiverUuid ? { receiver_uuid: receiverUuid } : {}),
    });
  }

  async giftImpact(senderUuid: string, dateFrom: string, dateTo: string, receiverUuid?: string) {
    return this.dbProxy("gift-impact", {
      sender_uuid: senderUuid, date_from: dateFrom, date_to: dateTo,
      ...(receiverUuid ? { receiver_uuid: receiverUuid } : {}),
    });
  }

  async giftDeduct(senderUuid: string, receiverUuid: string, dateFrom: string, dateTo: string) {
    return this.dbProxy("gift-deduct", {
      sender_uuid: senderUuid, receiver_uuid: receiverUuid, date_from: dateFrom, date_to: dateTo,
    }, true);
  }

  async giftRestore(uuid: string, amount: number) {
    return this.dbProxy("gift-restore", { uuid, amount }, true);
  }

  async deductDiamonds(uuid: string, amount: number) {
    return this.dbProxy("deduct-diamonds", { uuid, amount }, true);
  }

  async topSenders() {
    return this.dbProxy("top-senders");
  }

  async topReceivers() {
    return this.dbProxy("top-receivers");
  }

  // ═══════════════════════════
  //  Gala API (needs token)
  // ═══════════════════════════

  async getRanking(rankClass: number, type: number) {
    const token = await this.getToken();
    if (!token) return { success: false, data: { top: [], other: [] } };
    const res = await fetch(`${API_URLS.GALA_API}/ranking`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ class: rankClass, type }),
    });
    return res.json();
  }

  async searchAgencies(page: number) {
    const token = await this.getToken();
    if (!token) return { data: { agencies: [] } };
    const res = await fetch(`${API_URLS.GALA_API}/agencies/filter?page=${page}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page }),
    });
    return res.json();
  }

  async getProfile(userId: string | number) {
    const token = await this.getToken();
    if (!token) return { data: {} };
    const res = await fetch(`${API_URLS.GALA_API}/profile/get/${userId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    return res.json();
  }

  async getGiftHistory(type: "sender" | "receiver", from?: string, to?: string) {
    const token = await this.getToken();
    if (!token) return { data: [] };
    let url = `${API_URLS.GALA_API}/gift_history?type=${type}&perPage=100`;
    if (from && to) url += `&from=${from}&to=${to}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    return res.json();
  }

  async getAgencyHistoryData(month: number, year: number) {
    const token = await this.getToken();
    if (!token) return { data: {} };
    const res = await fetch(`${API_URLS.GALA_API}/agencies/history-data-agency`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ month, year }),
    });
    return res.json();
  }

  async getShowRequest() {
    const token = await this.getToken();
    if (!token) return { data: [] };
    const res = await fetch(`${API_URLS.GALA_API}/agencies/show_request`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    return res.json();
  }
}

export const galaApi = new GalaApiService();
export { GALA_MEDIA_BASE };
