"use client";  // 最初に追加

import { useState, useEffect, useCallback } from 'react';
import 'tailwindcss/tailwind.css';

const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const apiEndpoint = 'https://script.google.com/macros/s/AKfycbyQ4UZKZZi9oXH73CVCDxHgtQ54ZadvyuKAbZqw6sbA8PkOGUDZ0Q_pBKoGFdTsoKmC/exec';  // Google Apps ScriptのURL

export default function Home() {
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [summary, setSummary] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // doGetで取得したテキストをtranscriptに代入する関数

  const fetchTranscript = useCallback(async () => {
    try {
      const response = await fetch(apiEndpoint);
      if (response.ok) {
        const data = await response.text();  // テキストとして取得
        console.log("取得した応答:", data);  // 応答全体を出力
        setTranscript(data);  // transcriptにドキュメント内容を代入
      } else {
        console.error("APIの呼び出しに失敗しました:", response.status);
        setError('APIの呼び出しに失敗しました。再試行してください。');
      }
    } catch (error) {
      console.error("API呼び出し中にエラーが発生しました:", error);
      setError('エラーが発生しました。ネットワーク接続を確認してください。');
    }
  }, []);   

  useEffect(() => {
    fetchTranscript(); // 初回のデータ取得
    const interval = setInterval(fetchTranscript, 10000); // 10秒ごとに取得
    return () => clearInterval(interval); // コンポーネントがアンマウントされたときにインターバルをクリア
  }, [fetchTranscript]);

  // transcriptが更新されるたびに生成処理を実行
  useEffect(() => {
    if (transcript.trim()) {
      handleGenerateClick();
    }
  }, [transcript]);

  // 生成処理
  const handleGenerateClick = useCallback(async () => {
    if (isGenerating || !transcript.trim()) {
      console.log("生成処理をスキップしました。isGenerating:", isGenerating, "transcript:", transcript);
      return;
    }
    setIsGenerating(true);

    try {
      console.log("生成処理を開始します:", transcript);

      // タイトル生成
      const titleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'ユーザから、会話の文字起こしが提供されます。この会話にタイトルをつけてください。タイトルは20文字程度で、ぱっと見たときに目を引く内容にしてください。' },
            { role: 'user', content: `「${transcript}」` },
          ],
        }),
      });
      const titleData = await titleResponse.json();
      const generatedTitle = titleData.choices[0].message.content;

      // キーワード抽出
      const keywordResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'ユーザから、会話の文字起こしが提供されます。あなたは、ツッコミ芸人の粗品です。提供された中で下の方の文章の中からメインテーマを決め、この会話に対して、200字程度で笑えるツッコミを入れてください。' },
            { role: 'user', content: `${transcript}` },
          ],
        }),
      });

      const keywordData = await keywordResponse.json();
      const extractedKeywords = keywordData.choices[0].message.content;

      setTitle(generatedTitle);
      setKeywords(extractedKeywords);

      // 画像生成
      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `${extractedKeywords} の中でメインテーマを決め、メインテーマを軸に他の要素を踏まえてリアル調の画像を生成してください。`,
          size: '1024x1024',
        }),
      });

      const imageData = await imageResponse.json();
      if (imageData?.data?.[0]?.url) {
        setImageUrl(imageData.data[0].url);
      }

      setSummary(`${extractedKeywords}`);
      console.log("生成処理が完了しました。");
    } catch (error) {
      console.error("エラーが発生しました:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [transcript, isGenerating]);
  console.log("生成処理前のtranscript:", transcript);

  return (
  <div className="w-screen h-screen bg-white grid grid-cols-2 bg-[url('/background.png')]">
    <div className='flex items-center px-10'>
      {imageUrl && <img src={imageUrl} alt="Generated Character" className="w-full h-[400px] rounded-lg shadow-lg object-cover" />}
    </div>
    <div className='flex flex-col justify-center p-8'>
      <h2 className='text-4xl font-black mb-6 text-gray-800 leading-[3rem]'>{title}</h2>  
      <p className='text-xl text-gray-800 leading-8'>{summary}</p>  
    </div>
    <img src="/logo.png" className="fixed bottom-10 right-10 w-[200px]" />
  </div>
  );
}
