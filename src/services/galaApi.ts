import { supabase } from "@/integrations/supabase/client";

const GALA_MEDIA_BASE = "https://media.galalivechat.com/";

class GalaApiService {
  // === Generic proxy call ===
  private async call(target: string, action: string, params: Record<string, unknown> = {}, requireAdmin = false) {
    const body: Record<string, unknown> = { target, action, ...params };

    if (requireAdmin) {
      const token = localStorage.getItem("admin_session_token");
      if (token) body._admin_token = token;
    }

    const { data, error } = await supabase.functions.invoke("gala-proxy", { body });
    if (error) throw error;
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
    return this.call("project-z", "admin_first_setup", { username, new_password: newPassword, phone }, true);
  }

  // Salary
  async checkSalary(uuid: string) {
    return this.call("project-z", "salary_check", { uuid });
  }

  async salaryReport(uuid: string) {
    return this.call("project-z", "salary_report", { uuid });
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

  async chargeCoins(uuid: string, amount: number, referenceId: string, targetUuid?: string) {
    return this.call("project-z", "salary_charge_manual", {
      uuid, amount, reference_id: referenceId,
      ...(targetUuid ? { target_uuid: targetUuid } : {}),
    }, true);
  }

  // Agents
  async agentTransactions(username: string) {
    return this.call("project-z", "agent_transactions", { username }, true);
  }

  async agentLookupUser(uuid: string) {
    return this.call("project-z", "agent_lookup_user", { uuid }, true);
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

  async agencySalary(agencyId: string, year: string, monthNum: string) {
    return this.call("hola-chat", "agency-salary", { agency_id: agencyId, year, month_num: monthNum });
  }

  async listRoomBgRequests() {
    return this.call("hola-chat", "list-room-bg-requests");
  }

  async uploadRoomBackground(uuid: string, imageUrl: string) {
    return this.call("hola-chat", "upload-room-background", { uuid, image_url: imageUrl }, true);
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
  //  Gala API (needs token)
  // ═══════════════════════════

  async getRanking(rankClass: number, type: number) {
    const token = await this.getToken();
    if (!token) return { success: false, data: { top: [], other: [] } };
    const res = await fetch("https://galalivechat.com/api/ranking", {
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
    const res = await fetch(`https://galalivechat.com/api/agencies/filter?page=${page}`, {
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
    const res = await fetch(`https://galalivechat.com/api/profile/get/${userId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    return res.json();
  }

  async getGiftHistory(type: "sender" | "receiver", from?: string, to?: string) {
    const token = await this.getToken();
    if (!token) return { data: [] };
    let url = `https://galalivechat.com/api/gift_history?type=${type}&perPage=100`;
    if (from && to) url += `&from=${from}&to=${to}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    return res.json();
  }

  async getAgencyHistoryData(month: number, year: number) {
    const token = await this.getToken();
    if (!token) return { data: {} };
    const res = await fetch("https://galalivechat.com/api/agencies/history-data-agency", {
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
    const res = await fetch("https://galalivechat.com/api/agencies/show_request", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    return res.json();
  }
}

export const galaApi = new GalaApiService();
export { GALA_MEDIA_BASE };
