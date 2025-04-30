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
    Link,
} from "@remix-run/react";
import { useEffect, useState, useRef } from "react";
import type { D1Database } from "@cloudflare/workers-types";
import { PhoneLink } from "@/components/PhoneLink";

export const meta: MetaFunction = () => [{ title: "顧客一覧" }];

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
    const { env } = context.cloudflare;
    const db = env.DB as D1Database;

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const LIMIT = 100;

    const term = q ? `${q}*` : "";

    const sql = q
        ? `SELECT s.doc_id, 'company' AS src,
             c.client_code, NULL AS person_code,
             c.name_kanji  AS name,
             c.phone       AS phone,
             c.auditor_name AS auditor
       FROM   search_index AS s
       JOIN   companies     AS c ON c.id = s.doc_id
       WHERE  s.doc_type = 'company' AND search_index MATCH ?
       UNION ALL
       SELECT s.doc_id, 'person',
              p.client_code, p.person_code,
              p.name_kanji,
              COALESCE(p.phone_home, p.phone_mobile),
              NULL
       FROM   search_index AS s
       JOIN   people        AS p ON p.id = s.doc_id
       WHERE  s.doc_type = 'person' AND search_index MATCH ?
       LIMIT  ${LIMIT};`
        : `SELECT id AS doc_id, 'company' AS src,
              client_code, NULL AS person_code,
              name_kanji  AS name,
              phone,
              auditor_name AS auditor
       FROM   companies
       ORDER BY client_code
       LIMIT  ${LIMIT};`;

    const bindings = q ? [term, term] : [];
    const { results } = await db.prepare(sql).bind(...bindings).all();
    return json({ q, rows: results });
};

export default function IndexPage() {
    const { q, rows } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const navigation = useNavigation();
    const [query, setQuery] = useState(q ?? "");
    const formRef = useRef<HTMLFormElement>(null);
    const isSearching = navigation.state === "submitting";

    useEffect(() => {
        if (query !== q) {
            const t = setTimeout(() => formRef.current && submit(formRef.current, { replace: true }), 400);
            return () => clearTimeout(t);
        }
    }, [query, submit, q]);

    return (
        <main className="w-full md:max-w-4xl md:mx-auto p-4 md:p-6">
            <Form id="search-form" method="get" ref={formRef} className="mb-4">
                <input
                    type="text"
                    name="q"
                    value={query}
                    placeholder="顧客名・電話番号などを検索"
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded border px-3 py-2 text-lg shadow"
                    disabled={isSearching}
                />
            </Form>

            {isSearching && <p className="text-blue-600 mb-2">検索中...</p>}

            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b text-left bg-gray-50">
                            <th className="py-2 px-3 whitespace-nowrap">関与先コード</th>
                            <th className="py-2 px-3 whitespace-nowrap">個人コード</th>
                            <th className="py-2 px-3">商号 / 氏名</th>
                            <th className="py-2 px-3 whitespace-nowrap">電話番号</th>
                            <th className="py-2 px-3 whitespace-nowrap md:table-cell hidden">監査担当者</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r: any) => (
                            <tr key={`${r.src}-${r.doc_id}`} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-3 whitespace-nowrap">{r.client_code}</td>
                                <td className="py-2 px-3 whitespace-nowrap">{r.person_code ?? "-"}</td>
                                <td className="py-2 px-3">
                                    <Link
                                        to={`/customer/${r.src}/${r.doc_id}`}
                                        className="text-blue-700 underline hover:text-blue-900"
                                    >
                                        {r.name}
                                    </Link>
                                </td>
                                <td className="py-2 px-3 whitespace-nowrap"><PhoneLink num={r.phone} /></td>
                                <td className="py-2 px-3 whitespace-nowrap md:table-cell hidden">{r.auditor ?? "-"}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-4 text-center text-gray-500">
                                    該当する顧客がありません
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
