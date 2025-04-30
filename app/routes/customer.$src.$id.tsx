import {
    json,
    redirect,
    type LoaderFunctionArgs,
    type ActionFunctionArgs,
} from "@remix-run/cloudflare";
import {
    Form,
    useLoaderData,
    useNavigation,
    Link,
} from "@remix-run/react";
import { useEffect, useRef } from "react";

// D1データベース型のインポート方法を修正
import type { D1Database } from "@cloudflare/workers-types";

// 相対パスでコンポーネントをインポート (絶対パスの@が問題になっている可能性あり)
import { PhoneLink } from "../components/ui/PhoneLink";
// または
// import { PhoneLink } from "~/components/ui/PhoneLink";

// ------------------  Loader ------------------
export const loader = async ({ params, context }: LoaderFunctionArgs) => {
    const { src, id } = params as { src: "company" | "person"; id: string };

    // D1データベースの取得方法を修正
    const db = context.cloudflare.env.DB as D1Database;

    let row: any = null;
    if (src === "company") {
        row = await db
            .prepare(
                `SELECT id, client_code, name_kanji, name_furigana, name_alias,
                    representative, industry_code,
                    postal_code, address1, address2,
                    phone, fax, email, auditor_name,
                    raw_json,
                    json_extract(raw_json,'$.custom_note') AS custom_note
             FROM   companies WHERE id = ? LIMIT 1;`
            )
            .bind(id)
            .first()
    } else {
        row = await db
            .prepare(
                `SELECT id, client_code, person_code, company_id,
                    name_kanji, name_furigana, gender, birth_date,
                    phone_home, phone_mobile, fax, email,
                    postal_code, address1, address2,
                    raw_json,
                    json_extract(raw_json,'$.personal_auditor') AS personal_auditor,
                    json_extract(raw_json,'$.custom_note')      AS custom_note
             FROM   people WHERE id = ? LIMIT 1;`
            )
            .bind(id)
            .first();
    }
    if (!row) throw new Response("Not found", { status: 404 });
    return json({ src, row });
};

// ------------------  Action ------------------
export const action = async ({ request, params, context }: ActionFunctionArgs) => {
    const { src, id } = params as { src: "company" | "person"; id: string };

    // D1データベースの取得方法を修正
    const db = context.cloudflare.env.DB as D1Database;

    const fd = await request.formData();
    const _action = fd.get("_action");

    if (_action === "delete") {
        // ---- 削除 ----
        if (src === "company") {
            await db.prepare(`DELETE FROM companies WHERE id = ?`).bind(id).run();
        } else {
            await db.prepare(`DELETE FROM people WHERE id = ?`).bind(id).run();
        }
        // リダイレクト URL の形式を修正
        return redirect("/");
    }

    // ---- 更新 ----
    const customNote = fd.get("custom_note") as string;
    const personalAuditor = fd.get("personal_auditor") as string | null;

    if (src === "company") {
        await db
            .prepare(
                `UPDATE companies
         SET raw_json = json_set(COALESCE(raw_json,'{}'), '$.custom_note', ?)
         WHERE id = ?;`
            )
            .bind(customNote, id)
            .run();
    } else {
        await db
            .prepare(
                `UPDATE people
         SET raw_json = json_set(
               COALESCE(raw_json,'{}'),
               '$.custom_note', ?,
               '$.personal_auditor', ?
             )
         WHERE id = ?;`
            )
            .bind(customNote, personalAuditor, id)
            .run();
    }
    return json({ ok: true });
};

// ------------------  React ------------------
export default function CustomerDetail() {
    const { src, row } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (!isSubmitting) formRef.current?.reset();
    }, [isSubmitting]);

    return (
        <main className="mx-auto max-w-3xl p-6 space-y-8">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    {src === "company" ? "会社：" : "個人："}
                    {row.name_kanji}
                </h1>
                {/* 削除ボタン */}
                <Form method="post">
                    <input type="hidden" name="_action" value="delete" />
                    <button
                        type="submit"
                        className="rounded bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                        onClick={(e) => {
                            if (!confirm("本当に削除しますか？")) e.preventDefault();
                        }}
                    >
                        削除
                    </button>
                </Form>
            </header>

            {src === "company" ? <CompanyTable row={row} /> : <PersonTable row={row} />}

            {/* 任意メモ・個人担当者 */}
            <Form method="post" ref={formRef} className="space-y-4">
                {src === "person" && (
                    <div>
                        <label className="block font-medium" htmlFor="personal_auditor">
                            個人担当者
                        </label>
                        <input
                            name="personal_auditor"
                            id="personal_auditor"
                            type="text"
                            defaultValue={row.personal_auditor ?? ""}
                            className="mt-1 w-full rounded border p-2"
                        />
                    </div>
                )}
                <div>
                    <label className="block font-medium" htmlFor="custom_note">
                        任意メモ
                    </label>
                    <textarea
                        name="custom_note"
                        id="custom_note"
                        defaultValue={row.custom_note ?? ""}
                        className="mt-1 w-full rounded border p-2"
                    />
                </div>
                <button
                    type="submit"
                    className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "保存中…" : "保存"}
                </button>
            </Form>
        </main>
    );
}

// ---------- 表示部品 ----------
function CompanyTable({ row }: { row: any }) {
    return (
        <table className="w-full border-collapse text-sm">
            <tbody>
                <TableRow label="関与先コード" value={row.client_code} />
                <TableRow label="商号フリガナ" value={row.name_furigana} />
                <TableRow label="通称" value={row.name_alias} />
                <TableRow label="代表者" value={row.representative} />
                <TableRow label="業種コード" value={row.industry_code} />
                <TableRow label="郵便番号" value={row.postal_code} />
                <TableRow label="住所1" value={row.address1} />
                <TableRow label="住所2" value={row.address2} />
                <TableRow label="電話番号" value={<PhoneLink num={row.phone} />} />
                <TableRow label="FAX番号" value={<PhoneLink num={row.fax} />} />
                <TableRow label="E‑mail" value={row.email} />
                <TableRow label="監査担当者" value={row.auditor_name} />
            </tbody>
        </table>
    );
}

function PersonTable({ row }: { row: any }) {
    return (
        <table className="w-full border-collapse text-sm">
            <tbody>
                <TableRow label="関与先コード" value={row.client_code} />
                <TableRow label="個人コード" value={row.person_code} />
                <TableRow label="所属会社ID" value={row.company_id} />
                <TableRow label="氏名フリガナ" value={row.name_furigana} />
                <TableRow label="性別" value={row.gender} />
                <TableRow label="生年月日" value={row.birth_date} />
                <TableRow label="電話(自宅)" value={<PhoneLink num={row.phone_home} />} />
                <TableRow label="電話(携帯)" value={<PhoneLink num={row.phone_mobile} />} />
                <TableRow label="FAX番号" value={<PhoneLink num={row.fax} />} />
                <TableRow label="E‑mail" value={row.email} />
                <TableRow label="郵便番号" value={row.postal_code} />
                <TableRow label="住所1" value={row.address1} />
                <TableRow label="住所2" value={row.address2} />
            </tbody>
        </table>
    );
}

function TableRow({ label, value }: { label: string; value: any }) {
    return (
        <tr>
            <th className="w-40 border-b py-2 text-left font-medium whitespace-nowrap">{label}</th>
            <td className="border-b py-2">{value ?? "-"}</td>
        </tr>
    );
}