export interface Article {
  id: string;
  url: string;
  title: string;
  author?: string;
  domain: string;
  content: string;
  wordCount: number;
  addedAt: string;
}

export interface ReadingProgress {
  articleId: string;
  currentIndex: number;
  wpm: number;
  wordsPerFlash: number;
  lastReadAt: string;
}

export interface ArticleWithProgress extends Article {
  progress?: ReadingProgress;
}
