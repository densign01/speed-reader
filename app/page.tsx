'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAllArticlesWithProgress,
  saveArticle,
  deleteArticle,
  generateArticleId,
} from '@/lib/storage';
import { ArticleWithProgress } from '@/lib/types';

type InputMode = 'url' | 'paste';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState<ArticleWithProgress[]>([]);

  useEffect(() => {
    setArticles(getAllArticlesWithProgress());
  }, []);

  const handleUrlSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract article');
      }

      const articleId = generateArticleId(url);
      saveArticle({
        id: articleId,
        url: url.trim(),
        title: data.title,
        author: data.author,
        domain: data.domain,
        content: data.content,
        wordCount: data.wordCount,
        addedAt: new Date().toISOString(),
      });

      router.push(`/read?id=${articleId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    const title = pastedTitle.trim() || 'Pasted Article';
    const content = pastedText.trim();
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const articleId = generateArticleId(content.slice(0, 100) + Date.now());

    saveArticle({
      id: articleId,
      url: '',
      title,
      domain: 'Pasted',
      content,
      wordCount,
      addedAt: new Date().toISOString(),
    });

    router.push(`/read?id=${articleId}`);
  };

  const handleDelete = (id: string) => {
    deleteArticle(id);
    setArticles(getAllArticlesWithProgress());
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const getProgressPercent = (article: ArticleWithProgress) => {
    if (!article.progress) return 0;
    return Math.round((article.progress.currentIndex / article.wordCount) * 100);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Speed Reader</h1>
          <p className="text-zinc-500">Read articles faster with RSVP</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-zinc-900 rounded-lg p-1">
            <button
              onClick={() => setMode('url')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'url'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Paste URL
            </button>
            <button
              onClick={() => setMode('paste')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'paste'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Paste Text
            </button>
          </div>
        </div>

        {/* URL Input */}
        {mode === 'url' && (
          <form onSubmit={handleUrlSubmit} className="mb-12">
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-600 text-white placeholder-zinc-600"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Read'}
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              Tries archive.is automatically for paywalled articles
            </p>
            {error && (
              <p className="mt-3 text-red-400 text-sm">{error}</p>
            )}
          </form>
        )}

        {/* Paste Text Input */}
        {mode === 'paste' && (
          <form onSubmit={handlePasteSubmit} className="mb-12">
            <input
              type="text"
              value={pastedTitle}
              onChange={(e) => setPastedTitle(e.target.value)}
              placeholder="Article title (optional)"
              className="w-full px-4 py-3 mb-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-600 text-white placeholder-zinc-600"
            />
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste article text here..."
              rows={8}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-600 text-white placeholder-zinc-600 resize-none"
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-zinc-600">
                {pastedText.trim() ? `${pastedText.trim().split(/\s+/).filter(w => w.length > 0).length.toLocaleString()} words` : 'Paste or type your text'}
              </span>
              <button
                type="submit"
                disabled={!pastedText.trim()}
                className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Read
              </button>
            </div>
          </form>
        )}

        {/* History */}
        {articles.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-zinc-400 mb-4">Reading History</h2>
            <div className="space-y-3">
              {articles.map((article) => {
                const progressPercent = getProgressPercent(article);
                return (
                  <div
                    key={article.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button
                        onClick={() => router.push(`/read?id=${article.id}`)}
                        className="flex-1 text-left"
                      >
                        <h3 className="font-medium text-white hover:text-zinc-300 transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                          <span>{article.domain}</span>
                          <span>·</span>
                          <span>{article.wordCount.toLocaleString()} words</span>
                          <span>·</span>
                          <span>{formatDate(article.addedAt)}</span>
                        </div>
                        {/* Progress bar */}
                        {progressPercent > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                              <span>{progressPercent}% read</span>
                            </div>
                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-600 to-orange-500"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {articles.length === 0 && (
          <div className="text-center text-zinc-600 py-12">
            <p>No articles yet. Paste a URL or text above to get started.</p>
          </div>
        )}

        {/* Attribution */}
        <div className="text-center text-zinc-700 text-xs mt-12 pt-8 border-t border-zinc-900">
          Inspired by{' '}
          <a
            href="https://x.com/packyM/status/2011844959544955289"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-500 underline underline-offset-2"
          >
            Packy McCormick&apos;s tweet
          </a>
        </div>
      </div>
    </div>
  );
}
