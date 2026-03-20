import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Crown, Plus, Trash2, Save, Loader2, Search, Edit2, X } from "lucide-react";

interface AgentOverride {
  id: string;
  agent_uuid: string;
  agent_name: string;
  vip4_limit: number;
  vip5_limit: number;
  created_at: string;
}

interface AgentUsage {
  vip4_used: number;
  vip5_used: number;
  vip6_used: number;
}

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

interface AdminTopAgentsProps {
  readOnly?: boolean;
}

const AdminTopAgents: React.FC<AdminTopAgentsProps> = ({ readOnly = false }) => {
  const { confirm, ConfirmDialog } = useConfirmModal();
  const [agents, setAgents] = useState<AgentOverride[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, AgentUsage>>({});
  const [loading, setLoading] = useState(true);
  const [addUuid, setAddUuid] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ vip4_limit: 3, vip5_limit: 2, vip6_limit: 0 });

  const loadAgents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("agent_vip_overrides")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data || []) as AgentOverride[];
    setAgents(list);

    // Load usage for each agent
    if (list.length > 0) {
      const month = getCurrentMonth();
      const uuids = list.map((a) => a.agent_uuid);
      const { data: vipReqs } = await supabase
        .from("vip_requests")
        .select("user_uuid, vip_level")
        .in("user_uuid", uuids)
        .eq("request_month", month)
        .gte("vip_level", 4);

      const map: Record<string, AgentUsage> = {};
      for (const a of list) {
        map[a.agent_uuid] = { vip4_used: 0, vip5_used: 0, vip6_used: 0 };
      }
      for (const r of vipReqs || []) {
        if (!map[r.user_uuid]) continue;
        if (r.vip_level === 4) map[r.user_uuid].vip4_used++;
        else if (r.vip_level === 5) map[r.user_uuid].vip5_used++;
        else if (r.vip_level === 6) map[r.user_uuid].vip6_used++;
      }
      setUsageMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const handleAdd = async () => {
    const uuid = addUuid.trim();
    if (!uuid) { toast.error("أدخل آيدي الوكيل"); return; }
    if (agents.some((a) => a.agent_uuid === uuid)) { toast.error("الوكيل مضاف مسبقاً"); return; }

    setAddLoading(true);
    try {
      // Fetch agent name from external API
      const { data: info } = await supabase.functions.invoke("test-user-info", { body: { uuid } });
      const name = info?.name || uuid;

      const { error } = await supabase.from("agent_vip_overrides").insert({
        agent_uuid: uuid,
        agent_name: name,
        vip4_limit: 3,
        vip5_limit: 2,
        vip6_limit: 0,
      });
      if (error) throw error;
      toast.success(`تم إضافة الوكيل ${name}`);
      setAddUuid("");
      loadAgents();
    } catch (e: any) {
      toast.error(e.message || "فشل الإضافة");
    }
    setAddLoading(false);
  };

  const handleSave = async (agent: AgentOverride) => {
    try {
      const { error } = await supabase
        .from("agent_vip_overrides")
        .update({
          vip4_limit: editData.vip4_limit,
          vip5_limit: editData.vip5_limit,
          vip6_limit: editData.vip6_limit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agent.id);
      if (error) throw error;
      toast.success("تم تحديث الصلاحيات");
      setEditingId(null);
      loadAgents();
    } catch {
      toast.error("فشل التحديث");
    }
  };

  const handleDelete = async (agent: AgentOverride) => {
    const ok = await confirm({ title: "حذف وكيل", message: `حذف الوكيل ${agent.agent_name}؟`, danger: true, confirmText: "حذف" });
    if (!ok) return;
    const { error } = await supabase.from("agent_vip_overrides").delete().eq("id", agent.id);
    if (error) { toast.error("فشل الحذف"); return; }
    toast.success("تم الحذف");
    loadAgents();
  };

  const startEdit = (agent: AgentOverride) => {
    setEditingId(agent.id);
    setEditData({ vip4_limit: agent.vip4_limit, vip5_limit: agent.vip5_limit, vip6_limit: agent.vip6_limit });
  };

  return (
    <>
    <div className="space-y-4" dir="rtl">
      {/* Add agent */}
      {!readOnly && (
      <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> إضافة وكيل TOP
        </h3>
        <div className="flex gap-2">
          <Input
            value={addUuid}
            onChange={(e) => setAddUuid(e.target.value)}
            placeholder="آيدي الوكيل (UUID)"
            className="flex-1 text-sm"
            dir="ltr"
          />
          <Button onClick={handleAdd} disabled={addLoading} size="sm" className="gap-1">
            {addLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            إضافة
          </Button>
        </div>
      </div>
      )}

      {/* Agents list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : agents.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">لا يوجد وكلاء TOP بعد</p>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => {
            const usage = usageMap[agent.agent_uuid] || { vip4_used: 0, vip5_used: 0, vip6_used: 0 };
            const isEditing = editingId === agent.id;

            return (
              <div key={agent.id} className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Crown className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{agent.agent_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{agent.agent_uuid}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!isEditing ? (
                      !readOnly && (
                      <>
                        <button onClick={() => startEdit(agent)} className="p-1.5 rounded-lg hover:bg-muted">
                          <Edit2 className="w-4 h-4 text-primary" />
                        </button>
                        <button onClick={() => handleDelete(agent)} className="p-1.5 rounded-lg hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </>
                      )
                    ) : (
                      <>
                        <Button size="sm" onClick={() => handleSave(agent)} className="h-7 text-xs gap-1">
                          <Save className="w-3 h-3" /> حفظ
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-7 text-xs gap-1">
                          <X className="w-3 h-3" /> إلغاء
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* VIP limits grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "VIP 4", key: "vip4", limit: isEditing ? editData.vip4_limit : agent.vip4_limit, used: usage.vip4_used, color: "text-yellow-400" },
                    { label: "VIP 5", key: "vip5", limit: isEditing ? editData.vip5_limit : agent.vip5_limit, used: usage.vip5_used, color: "text-amber-400" },
                    { label: "VIP 6", key: "vip6", limit: isEditing ? editData.vip6_limit : agent.vip6_limit, used: usage.vip6_used, color: "text-orange-400" },
                  ].map((v) => (
                    <div key={v.key} className="bg-muted/20 rounded-lg p-2.5 text-center space-y-1">
                      <p className={`text-xs font-bold ${v.color}`}>{v.label}</p>
                      {isEditing ? (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={editData[`${v.key}_limit` as keyof typeof editData]}
                          onChange={(e) => setEditData({ ...editData, [`${v.key}_limit`]: parseInt(e.target.value) || 0 })}
                          className="h-7 text-center text-sm font-bold w-full"
                        />
                      ) : (
                        <p className="text-base font-bold text-foreground">{v.limit}</p>
                      )}
                      <p className="text-[9px] text-muted-foreground">
                        مستخدم: {v.used} / {isEditing ? editData[`${v.key}_limit` as keyof typeof editData] : v.limit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    {ConfirmDialog}
    </>
  );
};

export default AdminTopAgents;
