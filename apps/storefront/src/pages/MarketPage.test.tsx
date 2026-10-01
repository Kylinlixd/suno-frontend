import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MarketPage } from "./MarketPage";
import { OrdersPage } from "./OrdersPage";
import { ProductPage } from "./ProductPage";

// vitest 未开启 globals 时 RTL 不会自动清理，跨用例 DOM 会互相污染
afterEach(() => cleanup());

function renderWithProviders(ui: React.ReactElement, route = "/", pattern = "/*") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={pattern} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("MarketPage", () => {
  it("renders demo listings with grade filters", async () => {
    renderWithProviders(<MarketPage />);
    expect(screen.getByText("全部成色")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText(/¥/).length).toBeGreaterThan(0));
    expect(screen.getByText("成色良好")).toBeTruthy();
  });
});

describe("OrdersPage", () => {
  it("shows demo orders and filters by status tab", async () => {
    renderWithProviders(<OrdersPage />);
    expect(await screen.findByText("SN202608050018")).toBeTruthy();
    expect(screen.getByText("SN202607290011")).toBeTruthy();
    screen.getAllByText("待支付").map((element) => element.closest("button")).find(Boolean)?.click();
    await waitFor(() => expect(screen.queryByText("SN202608050018")).toBeNull());
    expect(await screen.findByText("SN202607290011")).toBeTruthy();
  });

  it("offers payment for unpaid orders", async () => {
    renderWithProviders(<OrdersPage />);
    expect(await screen.findByText("去支付")).toBeTruthy();
  });
});

describe("ProductPage", () => {
  it("renders demo product details with reviews", async () => {
    renderWithProviders(<ProductPage />, "/market/l-001", "/market/:id");
    expect(await screen.findByText("Air Jordan 1 Retro High")).toBeTruthy();
    expect(screen.getByText(/立即下单/)).toBeTruthy();
    expect(await screen.findByText(/成色和描述一致/)).toBeTruthy();
    expect(screen.getByText("商家回复 · 感谢信任，欢迎下次再来。")).toBeTruthy();
  });

  it("hides the strike-through price when no original price exists", async () => {
    renderWithProviders(<ProductPage />, "/market/l-006", "/market/:id");
    await screen.findByText(/成色和描述一致/);
    expect(screen.queryAllByText("¥1,499").length).toBe(1);
  });
});
