// app/routes/customers.$id.tsx
import type { LoaderFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

type Customer = {
    id: string;
    code: string;
    name: string;
    phone: string;
    contact: string;
    type: string;
};

export const loader: LoaderFunction = async ({ params, context }) => {
    // 将来的に Cloudflare D1 との連携に切り替える際は、以下のコードを有効化してください。
    /*
    const { DB } = context; // Cloudflare D1 の接続情報が context にある前提です。
    const id = params.id!;
    const query = "SELECT id, code, name, phone, contact, type FROM customers WHERE id = ?";
    const result = await DB.prepare(query).bind(id).first();
    if (!result) {
      throw new Response("Customer not found", { status: 404 });
    }
    const customer: Customer = {
      id: result.id,
      code: result.code,
      name: result.name,
      phone: result.phone,
      contact: result.contact,
      type: result.type,
    };
    return json(customer);
    */

    // 現段階ではモックデータを返します
    const mockCustomer: Customer = {
        id: params.id!,
        code: "CUST-001",
        name: "山田 太郎",
        phone: "090-1234-5678",
        contact: "営業部",
        type: "一般顧客",
    };
    return json(mockCustomer);
};

export default function CustomerDetailPage() {
    const customer = useLoaderData<Customer>();

    return (
        <div className="min-h-screen bg-gray-100">
            {/* ヘッダー */}
            <header className="bg-white shadow">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="text-xl font-bold">TKC CDB App</div>
                        <nav className="space-x-4">
                            <Link to="/dashboard" className="text-gray-600 hover:text-gray-800">
                                Dashboard
                            </Link>
                            <Link to="/customers" className="text-gray-600 hover:text-gray-800">
                                顧客一覧
                            </Link>
                            <Link to="/settings" className="text-gray-600 hover:text-gray-800">
                                設定
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* パンくずリスト */}
            <div className="container mx-auto px-4 py-4">
                <nav className="text-sm text-gray-600" aria-label="Breadcrumb">
                    <ol className="list-reset flex">
                        <li>
                            <Link to="/dashboard" className="text-blue-600 hover:underline">
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <span className="mx-2">/</span>
                        </li>
                        <li>
                            <Link to="/customers" className="text-blue-600 hover:underline">
                                顧客一覧
                            </Link>
                        </li>
                        <li>
                            <span className="mx-2">/</span>
                        </li>
                        <li className="text-gray-500">顧客詳細</li>
                    </ol>
                </nav>
            </div>

            {/* 顧客詳細カード */}
            <div className="container mx-auto px-4 py-4">
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-bold">顧客詳細</h2>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <strong>顧客コード:</strong> {customer.code}
                            </div>
                            <div>
                                <strong>名前:</strong> {customer.name}
                            </div>
                            <div>
                                <strong>電話番号:</strong> {customer.phone}
                            </div>
                            <div>
                                <strong>連絡先:</strong> {customer.contact}
                            </div>
                            <div>
                                <strong>タイプ:</strong> {customer.type}
                            </div>
                        </div>
                        <div className="mt-6 flex space-x-4">
                            <Button disabled className="bg-gray-300 cursor-not-allowed">
                                編集
                            </Button>
                            <Button disabled className="bg-gray-300 cursor-not-allowed">
                                削除
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 追加情報・備考エリア */}
            <div className="container mx-auto px-4 py-4">
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-bold">追加情報・備考</h2>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600">
                            ここに取引履歴や備考、関連ファイルなどの追加情報を表示します。（将来的な拡張予定）
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
