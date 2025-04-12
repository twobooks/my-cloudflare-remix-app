import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

// loader関数: サーバーサイドで実行され、データをルートコンポーネントに提供
export async function loader() {
  // ダミーデータを返す
  const customers = [
    { code: "001", name: "山田太郎", phone: "090-xxxx", contact: "yamada@example.com", type: "個人" },
    { code: "002", name: "ABC株式会社", phone: "03-xxxx", contact: "abc@example.com", type: "法人" },
    { code: "003", name: "佐藤花子", phone: "080-xxxx", contact: "sato@example.com", type: "個人" },
    { code: "004", name: "XYZ商事", phone: "06-xxxx", contact: "xyz@example.com", type: "法人" }
  ];

  // データをJSON形式でレスポンスとして返す
  return json({ customers });
}

export default function Dashboard() {
  // loaderから返されたデータを取得
  const { customers } = useLoaderData();
  const [search, setSearch] = useState("");

  return (
    <div className="p-6 space-y-4">
      {/* CSVアップロードボタン */}
      <Button variant="outline" className="w-full">Upload CSV</Button>

      {/* 検索バー */}
      <Input
        placeholder="Search Customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* 顧客リストテーブル */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>コード</TableHead>
            <TableHead>名前</TableHead>
            <TableHead>電話番号</TableHead>
            <TableHead>連絡先</TableHead>
            <TableHead>タイプ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers
            .filter((c) => c.name.includes(search) || c.contact.includes(search))
            .map((customer) => (
              <TableRow key={customer.code}>
                <TableCell>{customer.code}</TableCell>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.contact}</TableCell>
                <TableCell>{customer.type}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}