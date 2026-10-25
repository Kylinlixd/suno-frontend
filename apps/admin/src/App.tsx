import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./admin/AdminLayout";
import { AdminDashboardPage } from "./admin/AdminDashboardPage";
import { AdminRecyclePage } from "./admin/AdminRecyclePage";
import { AdminRiskPage } from "./admin/AdminRiskPage";
import { AdminProductsPage } from "./admin/AdminProductsPage";
import { AdminOrdersPage } from "./admin/AdminOrdersPage";
import { AdminUsersPage } from "./admin/AdminUsersPage";
import { AdminCouponsPage } from "./admin/AdminCouponsPage";
import { AdminReportsPage } from "./admin/AdminReportsPage";
import { AdminAuditPage } from "./admin/AdminAuditPage";
import { AdminRefundsPage } from "./admin/AdminRefundsPage";
import { AdminTicketsPage } from "./admin/AdminTicketsPage";

export default function App() {
  return <div className="app-shell"><Routes><Route path="/" element={<AdminLayout />}><Route index element={<AdminDashboardPage />} /><Route path="recycle" element={<AdminRecyclePage />} /><Route path="risk" element={<AdminRiskPage />} />
      <Route path="products" element={<AdminProductsPage />} />
      <Route path="orders" element={<AdminOrdersPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="coupons" element={<AdminCouponsPage />} />
      <Route path="reports" element={<AdminReportsPage />} />
      <Route path="refunds" element={<AdminRefundsPage />} />
      <Route path="audit" element={<AdminAuditPage />} />
      <Route path="tickets" element={<AdminTicketsPage />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></div>;
}
