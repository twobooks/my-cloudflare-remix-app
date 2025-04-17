// app/routes/d1-demo.jsx
import { json } from "@remix-run/cloudflare";
import { Form, useActionData } from "@remix-run/react";

// D1にアクセスするための関数
export const action = async ({ request, context }) => {
    const formData = await request.formData();

    // テキストボックスの値を取得
    const inputText = formData.get("inputText") || "";

    // アップロードされたファイルの情報を取得
    const uploadedFile = formData.get("xlsxFile");
    const fileName = uploadedFile ? uploadedFile.name : "ファイルがアップロードされていません";

    // D1データベースへのアクセスを試みる
    let d1Status = {
        success: false,
        message: "D1データベースへのアクセスに失敗しました"
    };

    try {
        // context.envからD1データベースを取得
        // const db = context.env.DB;
        const db = context.DB;

        if (!db) {
            throw new Error("D1データベースの参照に失敗しました");
        }

        // 簡単なクエリを実行してD1が機能していることを確認
        const result = await db.prepare("SELECT 1 as test").all();

        if (result && result.results && result.results.length > 0) {
            d1Status = {
                success: true,
                message: "D1データベースにアクセスできました",
                data: result.results
            };
        }
    } catch (error) {
        console.error("D1の操作中にエラーが発生しました:", error);
        d1Status = {
            success: false,
            message: `D1エラー: ${error.message || "不明なエラー"}`,
            error: error.toString()
        };
    }

    // JSON形式でデータを返す
    return json({
        inputText,
        fileName,
        d1Status,
        timestamp: new Date().toISOString()
    });
};

export default function D1Demo() {
    // actionからの戻り値を取得
    const actionData = useActionData();

    return (
        <div className="p-6 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-6">Remix + Cloudflare D1 デモ</h1>

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
                    D1接続テスト実行
                </button>
            </Form>

            {actionData && (
                <div className="mt-8 p-4 bg-gray-100 rounded-md">
                    <h2 className="text-xl font-semibold mb-2">D1接続テスト結果:</h2>

                    <div className="space-y-3">
                        <div className={`p-3 rounded ${actionData.d1Status.success ? 'bg-green-100' : 'bg-red-100'}`}>
                            <p className="font-medium">
                                <span className={actionData.d1Status.success ? 'text-green-600' : 'text-red-600'}>
                                    {actionData.d1Status.success ? '✓ 成功:' : '✗ 失敗:'}
                                </span>
                                {' '}{actionData.d1Status.message}
                            </p>

                            {actionData.d1Status.data && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium">テストクエリ結果:</p>
                                    <pre className="mt-1 p-2 bg-gray-50 rounded text-sm">
                                        {JSON.stringify(actionData.d1Status.data, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {actionData.d1Status.error && (
                                <p className="mt-2 text-sm text-red-600">エラー詳細: {actionData.d1Status.error}</p>
                            )}
                        </div>

                        <div>
                            <p><strong>入力されたテキスト:</strong> {actionData.inputText}</p>
                            <p><strong>アップロードされたファイル:</strong> {actionData.fileName}</p>
                            <p><strong>処理時間:</strong> {actionData.timestamp}</p>
                        </div>
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