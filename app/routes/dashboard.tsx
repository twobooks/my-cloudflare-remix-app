import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function Dashboard() {
    const [search, setSearch] = useState("");
    const [customers, setCustomers] = useState([
        { code: "001", name: "山田太郎", phone: "090-xxxx", contact: "yamada@example.com", type: "個人" },
        { code: "002", name: "ABC株式会社", phone: "03-xxxx", contact: "abc@example.com", type: "法人" },
    ]);

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
