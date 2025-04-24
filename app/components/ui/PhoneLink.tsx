// props の型定義。interface でもいいですが、ここでは type で。
type PhoneLinkProps = {
    /** 電話番号文字列。null/undefined/空の場合はハイフン表示 */
    num?: string | null;
    /** Tailwind などで追加クラスを渡したい場合 */
    className?: string;
};

/** 数字と先頭 + 以外を除去し、tel: スキーム用に整形 */
export function telHref(num: string): string {
    return `tel:${num.replace(/[^\d+]/g, "")}`;
}

/**
 * スマホでタップすると発信できる電話番号リンク
 * - num が falsy のときは "-" を表示
 * - className 指定がなければ青のアンダーライン
 */
export function PhoneLink({
    num,
    className,
}: PhoneLinkProps) {
    if (!num?.trim()) {
        return <>-</>;
    }

    return (
        <a
            href={telHref(num)}
            className={
                className
                    ? className
                    : "text-blue-700 underline hover:text-blue-900"
            }
        >
            {num}
        </a>
    );
}