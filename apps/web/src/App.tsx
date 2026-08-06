import { Navigate, Route, Routes } from "react-router-dom";
import { SunoNav } from "./components/SunoNav";
import { SunoFooter } from "./components/SunoFooter";
import { HomePage } from "./pages/HomePage";
import { MarketPage } from "./pages/MarketPage";
import { ProductPage } from "./pages/ProductPage";
import { RecyclePage } from "./pages/RecyclePage";
import { OrdersPage } from "./pages/OrdersPage";
import { AccountPage } from "./pages/AccountPage";
import { AdminLayout } from "./admin/AdminLayout";
import { AdminDashboardPage } from "./admin/AdminDashboardPage";
import { AdminRecyclePage } from "./admin/AdminRecyclePage";
import { AdminRiskPage } from "./admin/AdminRiskPage";

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="recycle" element={<AdminRecyclePage />} />
          <Route path="risk" element={<AdminRiskPage />} />
        </Route>
        <Route path="*" element={<CustomerShell />} />
      </Routes>
    </div>
  );
}

function CustomerShell() {
  return <>
    <SunoNav />
    <main className="w-full max-w-full overflow-x-hidden">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/market/:id" element={<ProductPage />} />
        <Route path="/recycle" element={<RecyclePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
    <SunoFooter />
  </>;
}
