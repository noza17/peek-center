import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 環境変数からGASのエンドポイントを取得
    const gasApiUrl = process.env.NEXT_PUBLIC_GAS_API_URL;

    if (!gasApiUrl) {
      return NextResponse.json({ error: 'GAS API URL is not defined' }, { status: 500 });
    }

    // GAS APIにリクエストを送信
    const response = await fetch(gasApiUrl);
    const data = await response.text();

    return NextResponse.json({ data });
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}