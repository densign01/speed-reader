import { Article, ReadingProgress, ArticleWithProgress } from './types';

const ARTICLES_KEY = 'speed-reader-articles';
const PROGRESS_KEY = 'speed-reader-progress';

export function getArticles(): Article[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(ARTICLES_KEY);
  return data ? JSON.parse(data) : [];
}

export function getProgress(): Record<string, ReadingProgress> {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem(PROGRESS_KEY);
  return data ? JSON.parse(data) : {};
}

export function saveArticle(article: Article): void {
  const articles = getArticles();
  const existing = articles.findIndex(a => a.id === article.id);
  if (existing >= 0) {
    articles[existing] = article;
  } else {
    articles.unshift(article);
  }
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
}

export function deleteArticle(id: string): void {
  const articles = getArticles().filter(a => a.id !== id);
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));

  const progress = getProgress();
  delete progress[id];
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function saveProgress(progress: ReadingProgress): void {
  const allProgress = getProgress();
  allProgress[progress.articleId] = progress;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
}

export function getArticleWithProgress(id: string): ArticleWithProgress | null {
  const articles = getArticles();
  const article = articles.find(a => a.id === id);
  if (!article) return null;

  const progress = getProgress()[id];
  return { ...article, progress };
}

export function getAllArticlesWithProgress(): ArticleWithProgress[] {
  const articles = getArticles();
  const progress = getProgress();
  return articles.map(article => ({
    ...article,
    progress: progress[article.id]
  }));
}

export function generateArticleId(url: string): string {
  return btoa(url).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
}
