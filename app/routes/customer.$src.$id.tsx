import {
    json,
    type LoaderFunctionArgs,
} from "@remix-run/cloudflare";
import { useLoaderData, Link } from '@remix-run/react';
import type { D1Database } from "@cloudflare/workers-types";

// ローダー関数: src(テーブル名) と doc_id(レコードID) を受け取り、D1からデータを取得
export const loader = async ({ context, params }: LoaderFunctionArgs) => {
    console.log('params', params);
    const { src, doc_id } = params;

    const table_name = (src === 'company') ? 'companies' : 'people';
    // doc_id を数値に変換
    const id = Number(doc_id);
    if (isNaN(id)) {
        throw new Response('Invalid ID', { status: 400 });
    }

    // Cloudflare D1 データベースのバインディング名は env.DB と想定
    // const { env } = context.cloudflare;
    // const db = env.DB as D1Database;

    // // SQL クエリを実行
    // const query = `SELECT * FROM ${table_name} WHERE id = ?`;
    // const { results } = await db.prepare(query).bind(id).all();

    // if (!results || results.length === 0) {
    //     throw new Response('Record not found', { status: 404 });
    // }

    // レコードを返却
    // return json({ table: src, record: results[0] });
    return json({
        table: src,
        record: {
            id: id,
            name: src === 'company' ? '株式会社テスト' : '山田太郎',
            address: src === 'company' ? '東京都千代田区' : '東京都新宿区',
            phone: '03-1234-5678',
            email: src === 'company' ? 'test@mail.com' : ''
        }
    })
};

// コンポーネント: ロードしたデータを表示
export default function CustomerDetail() {
    const { table, record } = useLoaderData<typeof loader>();

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">
                {table === 'companies' ? '会社詳細' : '個人詳細'}
            </h1>
            <dl className="grid grid-cols-2 gap-4">
                {Object.entries(record).map(([key, value]) => (
                    <div key={key}>
                        <dt className="font-semibold">{key}</dt>
                        <dd className="break-words">{String(value)}</dd>
                    </div>
                ))}
            </dl>
            <Link to="/customer" className="inline-block mt-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                一覧へ戻る
            </Link>
        </div>
    );
}
