import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const MIN_WORD_COUNT = 200; // Minimum words to consider extraction successful

// Check if URL is a Substack article
function isSubstackUrl(url: string): boolean {
  return url.includes('substack.com') || url.includes('/p/');
}

// Extract from Substack via RSS feed
async function extractFromSubstack(url: string): Promise<ExtractionResult | null> {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/');
    const postSlug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

    // Get the RSS feed
    const feedUrl = `${parsedUrl.origin}/feed`;
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SpeedReader/1.0)' },
    });

    if (!response.ok) return null;

    const xml = await response.text();

    // Find the matching article in the feed
    const itemRegex = new RegExp(
      `<item>([\\s\\S]*?<link>[^<]*${postSlug}[^<]*</link>[\\s\\S]*?)</item>`,
      'i'
    );
    const match = xml.match(itemRegex);
    if (!match) return null;

    const item = match[1];

    // Extract title
    const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
    const title = titleMatch ? titleMatch[1] : '';

    // Extract author
    const authorMatch = item.match(/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/);
    const author = authorMatch ? authorMatch[1] : undefined;

    // Extract content
    const contentMatch = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    if (!contentMatch) return null;

    // Parse HTML content to text
    const dom = new JSDOM(contentMatch[1]);
    const content = dom.window.document.body.textContent?.replace(/\s+/g, ' ').trim() || '';
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    return { title, author, content, wordCount };
  } catch {
    return null;
  }
}

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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
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

    let result: ExtractionResult | null = null;
    let source = 'direct';

    // Try Substack RSS extraction first for Substack URLs
    if (isSubstackUrl(url)) {
      result = await extractFromSubstack(url);
      if (result) source = 'substack-rss';
    }

    // Try direct extraction
    if (!result || result.wordCount < MIN_WORD_COUNT) {
      const directResult = await extractFromUrl(url);
      if (directResult && directResult.wordCount > (result?.wordCount || 0)) {
        result = directResult;
        source = 'direct';
      }
    }

    // If still not enough content, try archive
    if (!result || result.wordCount < MIN_WORD_COUNT) {
      const archiveResult = await extractFromArchive(url);
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
