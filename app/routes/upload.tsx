import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData } from "@remix-run/react";
import type { D1Database } from "@cloudflare/workers-types";

/* ============================================================
 * Upload.tsx  (本番スキーマ対応版)
 * - 法人 Excel → companies へ UPSERT
 * - 個人 Excel → people    へ UPSERT
 *   ファイル種別は列ヘッダーの特徴で自動判定（ファイル名依存なし）
 * ============================================================*/

export const action = async ({ request, context }: ActionFunctionArgs) => {
    const { env } = context.cloudflare;
    const db = env.DB as D1Database;

    try {
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) throw new Error("xlsx ファイルを選択してください");

        // ---------- Excel 読み込み ----------
        const buffer = await file.arrayBuffer();
        const XLSX = await import("xlsx");
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { raw: false });
        if (rows.length === 0) throw new Error("シートが空です");

        // ---------- ファイル種別を判定 ----------
        const headers = Object.keys(rows[0]);
        const isCompany = headers.includes("商号") || headers.includes("代表者");
        const isPerson = headers.includes("氏名") || headers.includes("個人コード") || headers.includes("フリガナ");

        if (!isCompany && !isPerson) throw new Error("法人/個人いずれのフォーマットか判定できません");

        // ---------- UPSERT 用ステートメント生成 ----------
        let stmt: ReturnType<D1Database["prepare"]>;
        const now = () => new Date().toISOString();

        if (isCompany) {
            stmt = db.prepare(`
        INSERT INTO companies (
          office_code, client_code, name_kanji, name_furigana, name_alias,
          representative, industry_code, postal_code, address1, address2,
          phone, fax, email, auditor_name, updated_at
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
        ON CONFLICT(office_code, client_code) DO UPDATE SET
          name_kanji      = excluded.name_kanji,
          name_furigana   = excluded.name_furigana,
          name_alias      = excluded.name_alias,
          representative  = excluded.representative,
          industry_code   = excluded.industry_code,
          postal_code     = excluded.postal_code,
          address1        = excluded.address1,
          address2        = excluded.address2,
          phone           = excluded.phone,
          fax             = excluded.fax,
          email           = excluded.email,
          auditor_name    = excluded.auditor_name,
          updated_at      = excluded.updated_at;
      `);
        } else {
            stmt = db.prepare(`
        INSERT INTO people (
          office_code, client_code, person_code, company_id,
          name_kanji, name_furigana, gender, birth_date,
          phone_home, phone_mobile, fax, email,
          postal_code, address1, address2, updated_at
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)
        ON CONFLICT(office_code, client_code, person_code) DO UPDATE SET
          name_kanji    = excluded.name_kanji,
          name_furigana = excluded.name_furigana,
          gender        = excluded.gender,
          birth_date    = excluded.birth_date,
          phone_home    = excluded.phone_home,
          phone_mobile  = excluded.phone_mobile,
          fax           = excluded.fax,
          email         = excluded.email,
          postal_code   = excluded.postal_code,
          address1      = excluded.address1,
          address2      = excluded.address2,
          updated_at    = excluded.updated_at;
      `);
        }

        // ---------- バッチ挿入 ----------
        const CHUNK = 50;
        for (let i = 0; i < rows.length; i += CHUNK) {
            const chunk = rows.slice(i, i + CHUNK);
            const batch = db.batch(
                chunk.map((r) =>
                    isCompany
                        ? stmt.bind(
                            r["事務所コード"] ?? 0,
                            r["関与先コード"] ?? 0,
                            r["商号"] ?? "",
                            r["商号フリガナ"] ?? "",
                            r["通称"] ?? "",
                            r["代表者"] ?? "",
                            r["業種コード"] ?? "",
                            r["郵便番号"] ?? "",
                            r["住所１"] ?? "",
                            r["住所２"] ?? "",
                            r["本店電話番号"] ?? r["電話番号"] ?? "",
                            r["本店FAX番号"] ?? r["FAX番号＿巡回監査先"] ?? r["FAX番号＿郵送先"] ?? "",
                            r["Ｅメール"] ?? r["E-Mail"] ?? r["Eメール"] ?? "",
                            r["監査担当者名"] ?? "",
                            now()
                        )
                        : stmt.bind(
                            r["事務所コード"] ?? 0,
                            r["関与先コード"] ?? 0,
                            r["個人コード"] ?? 0,
                            r["company_id"] ?? null,
                            r["氏名"] ?? r["name"] ?? "",
                            r["フリガナ"] ?? r["name_furigana"] ?? "",
                            r["性別"] ?? "",
                            r["生年月日"] ?? "",
                            r["電話番号"] ?? "",
                            r["携帯番号"] ?? r["phone_mobile"] ?? "",
                            r["FAX番号"] ?? "",
                            r["E-Mail"] ?? r["email"] ?? "",
                            r["郵便番号"] ?? "",
                            r["住所１"] ?? "",
                            r["住所２"] ?? "",
                            now()
                        )
                )
            );
            await batch;
        }

        return json({ inserted: rows.length, target: isCompany ? "companies" : "people" });
    } catch (err) {
        console.error("Upload error:", err);
        return json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
};

export default function Upload() {
    const data = useActionData<typeof action>();

    return (
        <main className="mx-auto max-w-lg p-6">
            <h1 className="text-xl font-bold mb-4">Excel アップロード</h1>
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
                    {data.inserted} 行を {data.target} に登録しました
                </p>
            ) : data?.error ? (
                <p className="mt-4 text-red-600">エラー: {data.error}</p>
            ) : null}
        </main>
    );
}
