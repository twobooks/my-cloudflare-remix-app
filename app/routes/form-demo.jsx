// app/routes/form-demo.jsx
import { json } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";

export const action = async ({ request }) => {
    const formData = await request.formData();

    // テキストボックスの値を取得して"executed"を追加
    const inputText = formData.get("inputText") || "";
    const processedText = `${inputText} executed`;

    // アップロードされたファイルの名前を取得
    const uploadedFile = formData.get("textFile");
    const fileName = uploadedFile ? uploadedFile.name : "ファイルがアップロードされていません";

    // JSON形式でデータを返す
    return json({
        processedText,
        fileName,
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
                    <label htmlFor="textFile" className="block text-sm font-medium mb-1">
                        テキストファイル:
                    </label>
                    <input
                        type="file"
                        id="textFile"
                        name="textFile"
                        className="w-full p-2 border rounded-md"
                        accept=".txt"
                    />
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