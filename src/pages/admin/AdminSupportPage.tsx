import React from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import AdminSupportManager from "@/components/AdminSupportManager";

const AdminSupportPage: React.FC = () => {
  const { handleLogout, adminUsername, adminDisplayName } = useAdminSession();

  return (
    <AdminPageLayout title="الدعم الفني" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4" dir="rtl">
        <AdminSupportManager adminUsername={adminUsername || ''} adminDisplayName={adminDisplayName || ''} canAct={true} />
      </div>
    </AdminPageLayout>
  );
};

export default AdminSupportPage;
