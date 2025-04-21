import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/cloudflare";
import {
  Form,
  useLoaderData,
  useSubmit,
} from "@remix-run/react";
import { useEffect, useState } from "react";
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

  if (q) {
    const sql = `
      SELECT 'company' AS src,
             c.client_code         AS client_code,
             NULL                  AS person_code,
             c.name_kanji          AS name,
             c.phone               AS phone,
             c.auditor_name        AS auditor
      FROM   search_index s
      JOIN   companies     c ON c.id = s.doc_id
      WHERE  s.doc_type = 'company' AND s MATCH ?
      UNION ALL
      SELECT 'person'  AS src,
             p.client_code        AS client_code,
             p.person_code        AS person_code,
             p.name_kanji         AS name,
             COALESCE(p.phone_home, p.phone_mobile) AS phone,
             NULL                 AS auditor
      FROM   search_index s
      JOIN   people        p ON p.id = s.doc_id
      WHERE  s.doc_type = 'person' AND s MATCH ?
      LIMIT  ${LIMIT};
    `;
    const { results } = await db.prepare(sql).bind(q, q).all();
    rows = results as typeof rows;
  } else {
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

  return json({ q, rows });
};

export default function IndexPage() {
  const { q, rows } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [query, setQuery] = useState(q ?? "");

  useEffect(() => {
    const delay = setTimeout(() => {
      const form = document.getElementById("search-form") as HTMLFormElement;
      submit(form, { replace: true });
    }, 300);
    return () => clearTimeout(delay);
  }, [query, submit]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Form id="search-form" method="get">
        <input
          type="text"
          name="q"
          value={query}
          placeholder="顧客名・電話番号などを検索"
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded border px-3 py-2 text-lg shadow"
        />
      </Form>

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
          {rows.length === 0 && (
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
