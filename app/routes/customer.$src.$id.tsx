import {
    json,
    type LoaderFunctionArgs,
    type ActionFunctionArgs,
} from "@remix-run/cloudflare";
import {
    Form,
    useLoaderData,
    useNavigation,
    useNavigate,
} from "@remix-run/react";
import type { D1Database } from "@cloudflare/workers-types";
import { useEffect, useRef } from "react";
import { PhoneLink } from "@/components/ui/PhoneLink";

/* ------------------  Loader ------------------ */
export const loader = async ({ params, context }: LoaderFunctionArgs) => {
    console.log("Params:", params); // URL パラメータをログに出力
    const { src, id } = params as { src: "company" | "person"; id: string };
    const db = context.cloudflare.env.DB as unknown as D1Database;

    let row: any;
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
            .first();
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

/* ------------------  Action ------------------ */
export const action = async ({ request, params, context }: ActionFunctionArgs) => {
    const { src, id } = params as { src: "company" | "person"; id: string };
    const db = context.cloudflare.env.DB as unknown as D1Database;
    const fd = await request.formData();
    const intent = fd.get("_action");

    /* --- 削除 --- */
    if (intent === "delete") {
        const table = src === "company" ? "companies" : "people";
        await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
        return json({ deleted: true });
    }

    /* --- 更新 --- */
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

/* ------------------  React ------------------ */
export default function CustomerDetail() {
    const { src, row } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const navigate = useNavigate();
    const isSubmitting = navigation.state === "submitting";
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (!isSubmitting) formRef.current?.reset();
    }, [isSubmitting]);

    // 削除後に一覧へリダイレクト
    useEffect(() => {
        if (navigation.formData?.get("_action") === "delete" && !isSubmitting) {
            navigate("/", { replace: true });
        }
    }, [isSubmitting, navigation, navigate]);

    return (
        <main className="mx-auto max-w-3xl p-6">
            <h1 className="mb-6 text-2xl font-bold">
                {src === "company" ? "会社：" : "個人："}
                {row.name_kanji}
            </h1>

            {src === "company" ? (
                <CompanyTable row={row} />
            ) : (
                <PersonTable row={row} />
            )}

            {/* 更新フォーム */}
            <Form method="post" ref={formRef} className="mt-8 space-y-4">
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
                <div className="flex gap-4">
                    <button
                        type="submit"
                        name="_action"
                        value="update"
                        className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "保存中…" : "保存"}
                    </button>

                    <button
                        type="submit"
                        name="_action"
                        value="delete"
                        className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                        onClick={(e) => {
                            if (!confirm("本当に削除しますか？")) e.preventDefault();
                        }}
                    >
                        削除
                    </button>
                </div>
            </Form>
        </main>
    );
}

/* ---------- 表示部品 ---------- */
function CompanyTable({ row }: { row: any }) {
    return (
        <table className="w-full border-collapse">
            <tbody>
                <TableRow label="関与先コード" value={row.client_code} />
                <TableRow label="商号フリガナ" value={row.name_furigana} />
                <TableRow label="通称" value={row.name_alias} />
                <TableRow label="代表者" value={row.representative} />
                <TableRow label="業種コード" value={row.industry_code} />
                <TableRow label="郵便番号" value={row.postal_code} />
                <TableRow label="住所1" value={row.address1} />
                <TableRow label="住所2" value={row.address2} />
                <TableRow label="電話" value={<PhoneLink num={row.phone} />} />
                <TableRow label="FAX" value={<PhoneLink num={row.fax} />} />
                <TableRow label="E-mail" value={row.email} />
                <TableRow label="監査担当者" value={row.auditor_name} />
            </tbody>
        </table>
    );
}

function PersonTable({ row }: { row: any }) {
    return (
        <table className="w-full border-collapse">
            <tbody>
                <TableRow label="関与先コード" value={row.client_code} />
                <TableRow label="個人コード" value={row.person_code} />
                <TableRow label="所属会社ID" value={row.company_id} />
                <TableRow label="氏名フリガナ" value={row.name_furigana} />
                <TableRow label="性別" value={row.gender} />
                <TableRow label="生年月日" value={row.birth_date} />
                <TableRow label="電話(自宅)" value={<PhoneLink num={row.phone_home} />} />
                <TableRow label="電話(携帯)" value={<PhoneLink num={row.phone_mobile} />} />
                <TableRow label="FAX" value={<PhoneLink num={row.fax} />} />
                <TableRow label="E-mail" value={row.email} />
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
            <th className="w-40 border-b py-1 text-left font-medium">{label}</th>
            <td className="border-b py-1">{value ?? "-"}</td>
        </tr>
    );
}

/* ======================================================================
   エラーハンドリング境界
   ====================================================================== */
import {
    useRouteError,
    isRouteErrorResponse,
} from "@remix-run/react";

/** loader / action が throw Response(...) したとき */
export function CatchBoundary() {
    const error = useRouteError() as Response;
    return (
        <ErrorBox
            title={`Error ${error.status}`}
            message={error.statusText || "Unexpected response"}
        />
    );
}

/** それ以外の実行時エラー (throw new Error など) */
export function ErrorBoundary() {
    const error = useRouteError();

    if (isRouteErrorResponse(error)) {
        return (
            <ErrorBox
                title={`Error ${error.status}`}
                message={error.data || error.statusText}
            />
        );
    }

    console.error("Unexpected Error:", error); // Workers のログへ
    return (
        <ErrorBox
            title="Unexpected Error"
            message={(error as Error)?.message || String(error)}
        />
    );
}

/* 共通レイアウト */
function ErrorBox({ title, message }: { title: string; message: string }) {
    return (
        <main className="mx-auto max-w-xl p-6">
            <h1 className="mb-4 text-2xl font-bold text-red-700">{title}</h1>
            <pre className="whitespace-pre-wrap rounded bg-red-50 p-4 text-red-800">
                {message}
            </pre>
            <a
                href="/"
                className="mt-6 inline-block text-blue-700 underline hover:text-blue-900"
            >
                一覧へ戻る
            </a>
        </main>
    );
}
