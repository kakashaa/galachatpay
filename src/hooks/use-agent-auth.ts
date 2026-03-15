import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useAgentAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("ghala_type") !== "agent" || !localStorage.getItem("ghala_token")) {
      navigate("/login/agent", { replace: true });
    }
  }, [navigate]);

  const token = localStorage.getItem("ghala_token") || "";
  const agentName = localStorage.getItem("ghala_agent_name") || "";
  const agencyId = localStorage.getItem("ghala_agency_id") || "";

  const logout = () => {
    localStorage.removeItem("ghala_token");
    localStorage.removeItem("ghala_type");
    localStorage.removeItem("ghala_agent_name");
    localStorage.removeItem("ghala_agency_id");
    navigate("/login/agent", { replace: true });
  };

  return { token, agentName, agencyId, logout };
}
