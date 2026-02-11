import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password, action, data } = await req.json();

    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    if (!password || password !== adminPassword) {
      return new Response(
        JSON.stringify({ error: "كلمة المرور غير صحيحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result;

    switch (action) {
      // Video tutorials CRUD
      case "list_videos": {
        const { data: videos, error } = await supabase
          .from("video_tutorials")
          .select("*")
          .order("display_order", { ascending: true });
        if (error) throw error;
        result = videos;
        break;
      }
      case "add_video": {
        const { error } = await supabase.from("video_tutorials").insert(data);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "update_video": {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from("video_tutorials")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "delete_video": {
        const { error } = await supabase
          .from("video_tutorials")
          .delete()
          .eq("id", data.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Salary requests management
      case "list_salary_requests": {
        const { data: requests, error } = await supabase
          .from("salary_requests")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = requests;
        break;
      }
      case "update_salary_request": {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from("salary_requests")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Login blocks management
      case "list_blocked_accounts": {
        const { data: blocks, error } = await supabase
          .from("login_attempts")
          .select("*")
          .or("is_permanently_blocked.eq.true,blocked_until.not.is.null")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        result = blocks;
        break;
      }
      case "unblock_account": {
        const { error } = await supabase
          .from("login_attempts")
          .update({
            is_permanently_blocked: false,
            blocked_until: null,
            failed_attempts: 0,
            block_count: 0,
            admin_unblocked_at: new Date().toISOString(),
          })
          .eq("target_uuid", data.target_uuid);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Ban reports management
      case "list_ban_reports": {
        const { data: reports, error } = await supabase
          .from("ban_reports")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = reports;
        break;
      }
      case "update_ban_report": {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from("ban_reports")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "إجراء غير معروف" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
