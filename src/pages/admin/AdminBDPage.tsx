import React from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminBDManager from "@/components/AdminBDManager";

const AdminBDPage: React.FC = () => {
  const { handleLogout, isModeratorRole } = useAdminSession();

  return (
    <AdminPageLayout title="إدارة فريق البيدي" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4" dir="rtl">
        <AdminBDManager readOnly={isModeratorRole} />
      </div>
    </AdminPageLayout>
  );
};

export default AdminBDPage;
