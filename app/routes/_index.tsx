import {
    json,
    type LoaderFunctionArgs,
    type MetaFunction,
} from "@remix-run/cloudflare";
import {
    Form,
    useLoaderData,
    useSubmit,
    useNavigation,
} from "@remix-run/react";
import { useEffect, useState, useRef } from "react";
import type { D1Database } from "@cloudflare/workers-types";

export const meta: MetaFunction = () => [{ title: "顧客一覧" }];

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
    const { env } = context.cloudflare;
    const db = env.DB as D1Database;

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const LIMIT = 100;

    let rows: {
        src: "company" | "person";
        client_code: number;
        person_code: number | null;
        name: string;
        phone: string | null;
        auditor: string | null;
    }[] = [];

    let error = null;

    try {
        if (q) {
            // 検索クエリがある場合の処理
            //         const sql = `
            //     SELECT 'company' AS src,
            //            client_code           AS client_code,
            //            NULL                  AS person_code,
            //            name_kanji            AS name,
            //            phone                 AS phone,
            //            auditor_name          AS auditor
            //     FROM   companies
            //     WHERE  name_kanji LIKE ? OR phone LIKE ? OR auditor_name LIKE ?
            //     UNION ALL
            //     SELECT 'person'  AS src,
            //            client_code        AS client_code,
            //            person_code        AS person_code,
            //            name_kanji         AS name,
            //            COALESCE(phone_home, phone_mobile) AS phone,
            //            NULL                 AS auditor
            //     FROM   people
            //     WHERE  name_kanji LIKE ? OR COALESCE(phone_home, phone_mobile) LIKE ?
            //     LIMIT  ${LIMIT};
            //   `;
            const sql = `
                SELECT 'company' AS src,
                        c.client_code AS client_code,
                        NULL          AS person_code,
                        c.name_kanji  AS name,
                        c.phone       AS phone,
                        c.auditor_name AS auditor
                FROM   search_index
                JOIN   companies AS c ON c.id = search_index.doc_id
                WHERE  search_index.doc_type = 'company'
                    AND  search_index MATCH ?
                UNION ALL
                SELECT 'person'  AS src,
                        p.client_code AS client_code,
                        p.person_code AS person_code,
                        p.name_kanji  AS name,
                        COALESCE(p.phone_home, p.phone_mobile) AS phone,
                        NULL AS auditor
                FROM   search_index
                JOIN   people AS p ON p.id = search_index.doc_id
                WHERE  search_index.doc_type = 'person'
                    AND  search_index MATCH ?
                LIMIT  ${LIMIT};
                `;

            const searchParam = `%${q}%`;
            const { results } = await db
                .prepare(sql)
                .bind(searchParam, searchParam, searchParam, searchParam, searchParam)
                .all();
            rows = results as typeof rows;
        } else {
            // 検索クエリがない場合は全件表示
            const sql = `
        SELECT 'company' AS src,
               client_code           AS client_code,
               NULL                  AS person_code,
               name_kanji            AS name,
               phone                 AS phone,
               auditor_name          AS auditor
        FROM   companies
        ORDER  BY client_code
        LIMIT  ${LIMIT};
      `;
            const { results } = await db.prepare(sql).all();
            rows = results as typeof rows;
        }
    } catch (e) {
        error = e instanceof Error ? e.message : "不明なエラーが発生しました";
        console.error("SQL実行エラー:", e);
    }

    return json({ q, rows, error });
};

export default function IndexPage() {
    const { q, rows, error } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const [query, setQuery] = useState(q ?? "");
    const [isComposing, setIsComposing] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const navigation = useNavigation();
    const isSearching = navigation.formData != null;

    useEffect(() => {
        // 日本語入力中でない場合かつクエリが変更された場合のみ検索を実行
        if (!isComposing && query !== q) {
            const delay = setTimeout(() => {
                if (formRef.current && !isComposing) {
                    submit(formRef.current, { replace: true });
                }
            }, 500); // 少し長めの遅延に設定
            return () => clearTimeout(delay);
        }
    }, [query, submit, isComposing, q]);

    return (
        <main className="mx-auto max-w-4xl p-6">
            <Form id="search-form" method="get" ref={formRef}>
                <input
                    type="text"
                    name="q"
                    value={query}
                    placeholder="顧客名・電話番号などを検索"
                    onChange={(e) => setQuery(e.target.value)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => {
                        setIsComposing(false);
                        // 入力確定後に検索を実行するため、一度ステートを更新
                        if (formRef.current) {
                            setTimeout(() => {
                                submit(formRef.current!, { replace: true });
                            }, 100);
                        }
                    }}
                    className="w-full rounded border px-3 py-2 text-lg shadow"
                    disabled={isSearching}
                />
            </Form>

            {isSearching && (
                <p className="mt-2 text-blue-600">検索中...</p>
            )}

            {error && (
                <div className="mt-4 rounded bg-red-50 p-3 text-red-700">
                    <p className="font-bold">エラーが発生しました</p>
                    <p>{error}</p>
                </div>
            )}

            <table className="mt-6 w-full border-collapse">
                <thead>
                    <tr className="border-b text-left">
                        <th className="py-2 pr-4">関与先コード</th>
                        <th className="py-2 pr-4">個人コード</th>
                        <th className="py-2 pr-4">商号 / 氏名</th>
                        <th className="py-2 pr-4">電話番号</th>
                        <th className="py-2">監査担当者</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={`${r.src}-${r.client_code}-${r.person_code ?? 0}`}>
                            <td className="py-1 pr-4">{r.client_code}</td>
                            <td className="py-1 pr-4">
                                {r.person_code !== null ? r.person_code : "-"}
                            </td>
                            <td className="py-1 pr-4">{r.name}</td>
                            <td className="py-1 pr-4">{r.phone ?? "-"}</td>
                            <td className="py-1">{r.auditor ?? "-"}</td>
                        </tr>
                    ))}
                    {rows.length === 0 && !error && (
                        <tr>
                            <td colSpan={5} className="py-4 text-center text-gray-500">
                                該当する顧客がありません
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </main>
    );
}