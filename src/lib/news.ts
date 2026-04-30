import axios from 'axios'

const NEWS_API_KEY = process.env.NEWS_API_KEY
const NEWS_API_URL = 'https://newsapi.org/v2'

export interface NewsArticle {
  title: string
  description: string
  url: string
  urlToImage: string
  publishedAt: string
  source: {
    name: string
  }
  content?: string
}

/**
 * Fetch trending finance news
 */
export async function getTrendingFinanceNews(
  category: string = 'finance',
  limit: number = 10
): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    console.warn('NEWS_API_KEY not configured')
    return []
  }

  try {
    const response = await axios.get(`${NEWS_API_URL}/top-headlines`, {
      params: {
        category: 'business',
        q: 'finance OR investment OR savings OR money OR stocks',
        language: 'en',
        pageSize: limit,
        apiKey: NEWS_API_KEY,
      },
    })

    return response.data.articles
  } catch (error) {
    console.error('Error fetching news:', error)
    return []
  }
}

/**
 * Search for specific finance topics
 */
export async function searchFinanceNews(
  query: string,
  limit: number = 10
): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    console.warn('NEWS_API_KEY not configured')
    return []
  }

  try {
    const response = await axios.get(`${NEWS_API_URL}/everything`, {
      params: {
        q: query,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: limit,
        apiKey: NEWS_API_KEY,
      },
    })

    return response.data.articles
  } catch (error) {
    console.error('Error searching news:', error)
    return []
  }
}

/**
 * Extract key points from news article for content generation
 */
export function extractNewsKeyPoints(article: NewsArticle): string {
  const title = article.title
  const description = article.description || ''
  const content = article.content || ''

  return `
Title: ${title}
Summary: ${description}
${content ? `Details: ${content.substring(0, 500)}` : ''}
Source: ${article.source.name}
Published: ${new Date(article.publishedAt).toLocaleDateString()}
  `.trim()
}

/**
 * Generate content topic from news article
 */
export function generateTopicFromNews(article: NewsArticle): string {
  // Extract main topic from title
  const title = article.title.toLowerCase()
  
  // Common finance keywords
  const keywords = [
    'investment', 'stock', 'crypto', 'bitcoin', 'savings',
    'retirement', 'inflation', 'interest rate', 'market',
    'portfolio', 'dividend', 'etf', 'mutual fund', 'real estate'
  ]

  // Find relevant keywords in title
  const foundKeywords = keywords.filter(keyword => title.includes(keyword))

  if (foundKeywords.length > 0) {
    return `Latest update on ${foundKeywords[0]}: ${article.title}`
  }

  return article.title
}
