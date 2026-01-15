'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SpeedReader from '@/components/SpeedReader';
import { getArticleWithProgress, saveProgress } from '@/lib/storage';
import { ArticleWithProgress } from '@/lib/types';

function ReaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleId = searchParams.get('id');

  const [article, setArticle] = useState<ArticleWithProgress | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!articleId) {
      router.push('/');
      return;
    }

    const loaded = getArticleWithProgress(articleId);
    if (!loaded) {
      setNotFound(true);
      return;
    }

    setArticle(loaded);
  }, [articleId, router]);

  const handleProgressChange = useCallback((index: number, wpm: number, wordsPerFlash: number) => {
    if (!articleId) return;
    saveProgress({
      articleId,
      currentIndex: index,
      wpm,
      wordsPerFlash,
      lastReadAt: new Date().toISOString(),
    });
  }, [articleId]);

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Article not found</h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <SpeedReader
      text={article.content}
      title={article.title}
      author={article.author}
      initialIndex={article.progress?.currentIndex ?? 0}
      initialWpm={article.progress?.wpm ?? 300}
      initialWordsPerFlash={article.progress?.wordsPerFlash ?? 1}
      onProgressChange={handleProgressChange}
      onBack={handleBack}
    />
  );
}

export default function ReadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
