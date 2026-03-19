import React from "react";
import { Navigate } from "react-router-dom";

const AdminBDPage: React.FC = () => {
  return <Navigate to="/admin/works" replace />;
};

export default AdminBDPage;
