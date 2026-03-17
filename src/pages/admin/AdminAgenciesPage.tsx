import React from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminAgencyManager from "@/components/AdminAgencyManager";

const AdminAgenciesPage: React.FC = () => {
  const { handleLogout } = useAdminSession();

  return (
    <AdminPageLayout title="إدارة الوكالات" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4" dir="rtl">
        <AdminAgencyManager canAct={true} />
      </div>
    </AdminPageLayout>
  );
};

export default AdminAgenciesPage;
