<!--
メンター向けメモ：
この手順は、実際の Supabase との接続までは検証できていません（作成時の環境から Prisma のダウンロード先に接続できなかったため）。
最初の受講生の前に、自分で一度、最初から最後まで通して、動くかを確認してください。
-->

# Prisma（データベースの読み書き）

第3週に、面談③で一緒に行います。**細かい書き方は覚えなくて大丈夫**です。
まずは「何のために、どこで使うか」をつかむことが目的です。

## Prisma とは

TypeScript から、データベースを**型つきで**読み書きするための道具です。
SQL を直接書く代わりに、「どんなデータを持つか（モデル）」を決めておくと、`prisma.book.findMany()` のように書けます。

- モデルは `prisma/schema.prisma` に書きます（設計メモの「5. データ」がもとになります）。
- Prisma は**サーバー側でだけ**動きます（画面（ブラウザ）からは直接使えません）。

## 第3週の流れ

### 1. Supabase のプロジェクトを作る

- リージョンは、日本に近いもの（Tokyo）を選びます。
- データベースのパスワードを決めて、**安全な場所に控えます**（あとで見られないことがあります）。

### 2. 接続文字列を2つ取得して、`.env.local` に書く

Supabase の「Connect」の画面から、Prisma 向けの表示で、接続文字列をコピーします。

- `DATABASE_URL`：トランザクションモード（ポート 6543）
- `DIRECT_URL`：セッションモード（ポート 5432）

`.env.example` をコピーして `.env.local` を作り、値を入れます。**接続文字列にはパスワードが入っています。絶対にコミットしないでください。**

Supabase 公式の Prisma ガイドも見ておくと確実です。
https://supabase.com/docs/guides/database/prisma

### 3. モデルを書く

`prisma/schema.prisma` に、モデルを書きます（ファイル内のコメントの例を参考にします）。

### 4. テーブルを作る

```
npx prisma db push
```

1か月目は、この簡単な方法を使います。2か月目に、変更の履歴を残せる `prisma migrate` を学びます。

### 5. クライアントを生成する

```
npx prisma generate
```

そのあと、`package.json` の `scripts` に次を足します。Vercel でも、ビルドの前に、同じ処理が必要になるためです。

```
"postinstall": "prisma generate"
```

### 6. 読み書きを1か所にまとめる（`lib/prisma.ts`）

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// 開発中に、何度も作り直されないようにしています
export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### 7. 一覧を表示する（例）

```tsx
// app/page.tsx
import { prisma } from "@/lib/prisma";

// ビルド時ではなく、開くたびに最新のデータを取ります
export const dynamic = "force-dynamic";

export default async function Home() {
  const books = await prisma.book.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <ul>
      {books.map((book) => (
        <li key={book.id}>{book.title}</li>
      ))}
    </ul>
  );
}
```

### 8. 追加する（例）

```ts
// app/api/books/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { title, memo } = await request.json();

  if (typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "title は必須です" }, { status: 400 });
  }

  const book = await prisma.book.create({ data: { title, memo } });
  return NextResponse.json(book, { status: 201 });
}
```

画面側のフォームは、`fetch("/api/books", { method: "POST", ... })` で送り、成功したら `router.refresh()` で一覧を更新します。

> 上のコードは**例**です。そのままコピーせず、面談で、1行ずつ読みながら理解します。

### 9. Vercel に環境変数を登録する

Vercel のプロジェクトの設定（Environment Variables）に、`DATABASE_URL` を登録します。`.env.local` は GitHub に上がらないので、Vercel には自動では渡りません。

### 10. Supabase の設定を確認する

Supabase には、Prisma とは別に、データへアクセスできる入り口があります。**使わない入り口は、閉じておきます**（Row Level Security の設定）。面談③で、一緒に確認します。

## つまずきやすい点

- `Cannot find module '@/generated/prisma/client'`：`npx prisma generate` を実行していない
- 接続できない：接続文字列の種類（トランザクション／セッション）を、取り違えていないか確認する
- Vercel でビルドが失敗する：`postinstall` を足したか、`DATABASE_URL` を登録したかを確認する
