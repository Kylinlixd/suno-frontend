export default defineAppConfig({
  pages: ["pages/home/index", "pages/market/index", "pages/product/index", "pages/recycle/index", "pages/orders/index", "pages/account/index"],
  window: { navigationBarBackgroundColor: "#f4f2eb", navigationBarTextStyle: "black", backgroundColor: "#f4f2eb" },
  tabBar: {
    color: "#969990",
    selectedColor: "#151714",
    backgroundColor: "#f4f2eb",
    borderStyle: "white",
    list: [
      { pagePath: "pages/home/index", text: "首页" },
      { pagePath: "pages/market/index", text: "逛逛" },
      { pagePath: "pages/recycle/index", text: "回收" },
      { pagePath: "pages/orders/index", text: "订单" },
      { pagePath: "pages/account/index", text: "我的" }
    ]
  }
});
