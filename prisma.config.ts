import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js と同じ .env.local を読み込みます
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // テーブルを作る・変えるコマンド用の接続先
    url: process.env.DIRECT_URL ?? "",
  },
});
