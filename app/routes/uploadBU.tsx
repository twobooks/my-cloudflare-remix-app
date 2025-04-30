import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData } from "@remix-run/react";
import type { D1Database } from "@cloudflare/workers-types"; // 型補完用

// POST /upload
export const action = async ({ request, context }: ActionFunctionArgs) => {
    // === Cloudflare Pages 方式で env を取り出す =========================
    const { env } = context.cloudflare;
    const db = env.DB as D1Database;

    try {
        const form = await request.formData();
        const file = form.get("file");

        if (!(file instanceof File)) {
            throw new Error("xlsx ファイルを選択してください");
        }

        // ---------- Excel 読み込み ----------
        const buffer = await file.arrayBuffer();
        const XLSX = await import("xlsx");
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { raw: false });

        if (rows.length === 0) {
            throw new Error("シートが空です");
        }

        // ---------- D1 へバッチ UPSERT ----------
        const stmt = db.prepare(`
      INSERT INTO companies
        (office_code, client_code, name_kanji, name_furigana, phone, address1)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      ON CONFLICT(office_code, client_code) DO UPDATE SET
        name_kanji    = excluded.name_kanji,
        name_furigana = excluded.name_furigana,
        phone         = excluded.phone,
        address1      = excluded.address1,
        updated_at    = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    `);

        // 1 回 50 行程度ずつに分割すると安全
        const CHUNK = 50;
        for (let i = 0; i < rows.length; i += CHUNK) {
            const chunk = rows.slice(i, i + CHUNK);
            const batch = db.batch(
                chunk.map((r) =>
                    stmt.bind(
                        r["事務所コード"] ?? 0,
                        r["関与先コード"] ?? 0,
                        r["商号"] ?? "",
                        r["商号フリガナ"] ?? "",
                        r["本店電話番号"] ?? r["電話番号"] ?? "",
                        r["住所１"] ?? ""
                    )
                )
            );
            await batch;
        }

        return json({ inserted: rows.length });
    } catch (err) {
        console.error("Upload error:", err);
        return json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
};

export default function Upload() {
    const data = useActionData<typeof action>();

    return (
        <main className="mx-auto max-w-lg p-6">
            <h1 className="text-xl font-bold mb-4">Excel アップロード（テスト）</h1>

            <Form method="post" encType="multipart/form-data">
                <input
                    type="file"
                    name="file"
                    accept=".xlsx,.xls"
                    className="mb-4 block"
                    required
                />
                <button
                    className="rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
                    type="submit"
                >
                    取り込み
                </button>
            </Form>

            {data?.inserted ? (
                <p className="mt-4 text-green-700">
                    {data.inserted} 行を companies に登録しました
                </p>
            ) : data?.error ? (
                <p className="mt-4 text-red-600">エラー: {data.error}</p>
            ) : null}
        </main>
    );
}
