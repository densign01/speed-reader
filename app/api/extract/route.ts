import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const MIN_WORD_COUNT = 200; // Minimum words to consider extraction successful

interface ExtractionResult {
  title: string;
  author?: string;
  content: string;
  wordCount: number;
}

async function extractFromUrl(url: string): Promise<ExtractionResult | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      return null;
    }

    const content = article.textContent.replace(/\s+/g, ' ').trim();
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    return {
      title: article.title || '',
      author: article.byline || undefined,
      content,
      wordCount,
    };
  } catch {
    return null;
  }
}

async function extractFromArchive(originalUrl: string): Promise<ExtractionResult | null> {
  try {
    // Try archive.is (also known as archive.today)
    const archiveUrl = `https://archive.is/latest/${originalUrl}`;

    const response = await fetch(archiveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url: archiveUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      return null;
    }

    const content = article.textContent.replace(/\s+/g, ' ').trim();
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    return {
      title: article.title || '',
      author: article.byline || undefined,
      content,
      wordCount,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Try direct extraction first
    let result = await extractFromUrl(url);
    let source = 'direct';

    // If direct extraction failed or got too little content, try archive
    if (!result || result.wordCount < MIN_WORD_COUNT) {
      const archiveResult = await extractFromArchive(url);

      // Use archive result if it's better
      if (archiveResult && archiveResult.wordCount > (result?.wordCount || 0)) {
        result = archiveResult;
        source = 'archive';
      }
    }

    if (!result || result.wordCount < 50) {
      return NextResponse.json(
        { error: 'Could not extract article content. Try pasting the text directly.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      title: result.title || parsedUrl.hostname,
      author: result.author,
      content: result.content,
      wordCount: result.wordCount,
      domain: parsedUrl.hostname,
      source, // Let frontend know where content came from
    });
  } catch (error) {
    console.error('Extract error:', error);
    return NextResponse.json(
      { error: 'Failed to extract article. Try pasting the text directly.' },
      { status: 500 }
    );
  }
}
