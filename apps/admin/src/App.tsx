import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./admin/AdminLayout";
import { AdminDashboardPage } from "./admin/AdminDashboardPage";
import { AdminRecyclePage } from "./admin/AdminRecyclePage";
import { AdminRiskPage } from "./admin/AdminRiskPage";

export default function App() {
  return <div className="app-shell"><Routes><Route path="/" element={<AdminLayout />}><Route index element={<AdminDashboardPage />} /><Route path="recycle" element={<AdminRecyclePage />} /><Route path="risk" element={<AdminRiskPage />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></div>;
}
