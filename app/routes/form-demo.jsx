// app/routes/form-demo.jsx
import { json } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import * as XLSX from 'xlsx';

export const action = async ({ request }) => {
    const formData = await request.formData();

    // テキストボックスの値を取得して"executed"を追加
    const inputText = formData.get("inputText") || "";
    const processedText = `${inputText} executed`;

    // アップロードされたファイルを処理
    const uploadedFile = formData.get("xlsxFile");
    let fileName = "ファイルがアップロードされていません";
    let firstRowData = [];

    if (uploadedFile) {
        fileName = uploadedFile.name;

        try {
            // ファイルの内容をバッファとして読み込む
            const fileBuffer = await uploadedFile.arrayBuffer();

            // XLSXとして解析
            const workbook = XLSX.read(fileBuffer, { type: 'array' });

            // 最初のシートを取得
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            // シートからデータを取得
            const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // 1行目のデータを取得（データがある場合）
            if (data.length > 0) {
                firstRowData = data[0];
            }
        } catch (error) {
            console.error("XLSXファイルの処理中にエラーが発生しました:", error);
            return json({
                processedText,
                fileName,
                error: "XLSXファイルの処理中にエラーが発生しました",
                timestamp: new Date().toISOString()
            });
        }
    }

    // JSON形式でデータを返す
    return json({
        processedText,
        fileName,
        firstRowData,
        timestamp: new Date().toISOString()
    });
};

export default function FormDemo() {
    // actionからの戻り値を取得
    const actionData = useActionData();

    return (
        <div className="p-6 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-6">Remixフォーム処理デモ</h1>

            <Form method="post" encType="multipart/form-data" className="space-y-4">
                <div>
                    <label htmlFor="inputText" className="block text-sm font-medium mb-1">
                        テキスト入力:
                    </label>
                    <input
                        type="text"
                        id="inputText"
                        name="inputText"
                        className="w-full p-2 border rounded-md"
                        placeholder="テキストを入力してください"
                    />
                </div>

                <div>
                    <label htmlFor="xlsxFile" className="block text-sm font-medium mb-1">
                        Excelファイル:
                    </label>
                    <input
                        type="file"
                        id="xlsxFile"
                        name="xlsxFile"
                        className="w-full p-2 border rounded-md"
                        accept=".xlsx, .xls"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                        .xlsx または .xls ファイルをアップロードしてください
                    </p>
                </div>

                <button
                    type="submit"
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                    実行
                </button>
            </Form>

            {actionData && (
                <div className="mt-8 p-4 bg-gray-100 rounded-md">
                    <h2 className="text-xl font-semibold mb-2">処理結果:</h2>
                    <div className="space-y-2">
                        <p><strong>処理後テキスト:</strong> {actionData.processedText}</p>
                        <p><strong>アップロードされたファイル:</strong> {actionData.fileName}</p>

                        {actionData.error ? (
                            <p className="text-red-600"><strong>エラー:</strong> {actionData.error}</p>
                        ) : actionData.firstRowData && actionData.firstRowData.length > 0 ? (
                            <div>
                                <p><strong>1行目のデータ:</strong></p>
                                <ul className="list-disc list-inside ml-4">
                                    {actionData.firstRowData.map((cell, index) => (
                                        <li key={index}>{cell}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p>1行目のデータは見つかりませんでした</p>
                        )}

                        <p><strong>処理時間:</strong> {actionData.timestamp}</p>
                    </div>

                    <details className="mt-4">
                        <summary className="cursor-pointer text-blue-600">JSONデータを表示</summary>
                        <pre className="mt-2 p-3 bg-gray-800 text-green-400 rounded overflow-auto">
                            {JSON.stringify(actionData, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );
}