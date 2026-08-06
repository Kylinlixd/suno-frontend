import { defineConfig } from "@tarojs/cli";
import path from "node:path";

export default defineConfig({
  projectName: "suno-mall",
  date: "2026-08-05",
  designWidth: 750,
  deviceRatio: { 640: 2.34, 750: 2, 828: 1.81 },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: "webpack5",
  mini: { compile: { include: [path.resolve(__dirname, "../../../packages/shared")] }, postcss: { pxtransform: { enable: true }, url: { enable: true }, cssModules: { enable: false } } },
  weapp: { appid: "touristappid" },
  h5: { publicPath: "/" }
});
