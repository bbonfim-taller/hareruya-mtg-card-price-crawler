import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for available card sets
interface CardSet {
  name: string;
  code: string;
}

let cachedSets: CardSet[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

/**
 * Fetch and extract available MTG card sets from Hareruya search page dropdown.
 */
async function fetchCardSets(): Promise<CardSet[]> {
  const now = Date.now();
  if (cachedSets && (now - cacheTimestamp < CACHE_DURATION)) {
    return cachedSets;
  }

  const url = 'https://www.hareruyamtg.com/en/products/search?product=&category=&cardset=22&colorsType=0&cardtypesType=0&subtype=&format=&priceFrom=&priceTo=&illustrator=&stock=1&search=Search';
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const sets: CardSet[] = [];

    $('select').each((_, elem) => {
      const name = $(elem).attr('name') || '';
      const id = $(elem).attr('id') || '';
      if (name.includes('cardset') || id.includes('cardset')) {
        $(elem).find('option').each((_, opt) => {
          const val = $(opt).attr('value') || '';
          const text = $(opt).text().trim();
          if (val && val !== '') {
            sets.push({ name: text, code: val });
          }
        });
      }
    });

    if (sets.length > 0) {
      cachedSets = sets;
      cacheTimestamp = now;
      return sets;
    }
  } catch (error: any) {
    console.error('Error fetching card sets:', error.message);
    if (cachedSets) {
      return cachedSets; // Fallback to expired cache on error
    }
  }

  return [];
}

// --- API Endpoints ---

/**
 * Endpoint to get the list of available card sets
 */
app.get('/api/sets', async (req, res) => {
  try {
    const sets = await fetchCardSets();
    res.json({ success: true, count: sets.length, sets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Endpoint to scrape card prices for a specific set/filters
 */
app.get('/api/scrape', async (req, res) => {
  const { cardset, keyword, stockOnly, page } = req.query;

  if (!cardset) {
    return res.status(400).json({ success: false, error: 'cardset parameter is required' });
  }

  const pageNum = parseInt(page as string) || 1;
  const kwStr = (keyword as string) || '';
  const isStockOnly = stockOnly === 'true' || stockOnly === undefined; // Default to true

  // Construct query parameters for the Hareruya Unisearch API
  // Note: fq.stock=1~* means stock in range [1, *] (at least 1 in stock)
  // fq.price=1~* means price in range [1, *] (at least 1 JPY)
  const queryParams = new URLSearchParams();
  if (kwStr) {
    queryParams.append('kw', kwStr);
  }
  queryParams.append('fq.cardset', cardset as string);
  queryParams.append('fq.price', '1~*');
  if (isStockOnly) {
    queryParams.append('fq.stock', '1~*');
  }
  queryParams.append('rows', '60');
  queryParams.append('page', pageNum.toString());

  const apiUrl = `https://www.hareruyamtg.com/en/products/search/unisearch_api?${queryParams.toString()}`;

  try {
    console.log(`Scraping Hareruya API: ${apiUrl}`);
    
    // Step 1: Query the Unisearch JSON API
    const apiResponse = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `https://www.hareruyamtg.com/en/products/search?cardset=${cardset}&stock=${isStockOnly ? '1' : ''}`
      },
      timeout: 15000
    });

    const data = apiResponse.data;
    if (!data || !data.response) {
      return res.json({ success: true, count: 0, totalCount: 0, items: [] });
    }

    const docs = data.response.docs || [];
    const totalCount = data.response.numFound || 0;

    if (docs.length === 0) {
      return res.json({ success: true, count: 0, totalCount, items: [] });
    }

    // Step 2: Query Hareruya's lazy html renderer to obtain details (prices and links)
    const renderUrl = 'https://www.hareruyamtg.com/en/products/search/unisearch/lazy';
    const renderResponse = await axios.post(renderUrl, {
      docs: docs,
      css: 'itemList'
    }, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `https://www.hareruyamtg.com/en/products/search?cardset=${cardset}&stock=${isStockOnly ? '1' : ''}`
      },
      timeout: 15000
    });

    const html = renderResponse.data;
    const $ = cheerio.load(html);
    const items: any[] = [];

    // Step 3: Parse the HTML of individual card list-items
    $('li.itemList').each((i, el) => {
      const itemEl = $(el);
      const nameEl = itemEl.find('.itemName');
      const priceEl = itemEl.find('.itemDetail__price');
      const stockEl = itemEl.find('.itemDetail__stock');
      const imgEl = itemEl.find('.itemImg img');
      const salesEl = itemEl.find('.itemUserAct__sales__number');

      const nameText = nameEl.text().trim();
      const rawHref = nameEl.attr('href') || '';
      const detailUrl = rawHref.startsWith('http') 
        ? rawHref 
        : `https://www.hareruyamtg.com${rawHref.trim()}`;

      const priceText = priceEl.text().trim();
      const stockText = stockEl.text().trim();
      
      let imageUrl = imgEl.attr('data-original') || imgEl.attr('src') || '';
      if (imageUrl && imageUrl.startsWith('/')) {
        imageUrl = `https://www.hareruyamtg.com${imageUrl}`;
      }

      const weeklySales = salesEl.text().trim() || '0';

      // Find corresponding JSON doc to blend details
      const doc = docs[i] || {};

      const baseId = doc.product || itemEl.find('.addCart').attr('data-product') || `item-${i}`;
      const lang = doc.language || (nameText.includes('【JP】') || nameText.includes('【JA】') ? '1' : nameText.includes('【EN】') ? '2' : '');
      const cond = doc.card_condition || '';
      const foilSuffix = (doc.foil_flg === '1' || nameText.includes('【Foil】') || nameText.toLowerCase().includes('foil')) ? 'foil' : 'normal';
      const uniqueId = `${baseId}-${lang || 'unknown'}-${cond || 'any'}-${foilSuffix}`;

      items.push({
        id: uniqueId,
        name: nameText || doc.product_name_en || doc.product_name || 'Unknown MTG Card',
        cardName: doc.card_name || '',
        priceText: priceText || (doc.price ? `¥ ${Number(doc.price).toLocaleString()}` : ''),
        priceNumeric: doc.price ? Number(doc.price) : (priceText ? Number(priceText.replace(/[^0-9]/g, '')) : 0),
        stockText: stockText || (doc.stock ? `【Stock:${doc.stock}】` : ''),
        stockNumeric: doc.stock ? Number(doc.stock) : (stockText ? Number(stockText.replace(/[^0-9]/g, '')) : 0),
        imageUrl: imageUrl || doc.image_url || '',
        detailUrl,
        weeklySales: Number(weeklySales),
        foil: doc.foil_flg === '1' || nameText.includes('【Foil】') || nameText.toLowerCase().includes('foil'),
        language: lang,
        condition: cond,
      });
    });

    res.json({
      success: true,
      count: items.length,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / 60),
      items
    });

  } catch (error: any) {
    console.error('Error in /api/scrape:', error.message);
    res.status(500).json({ success: false, error: `Failed to fetch or parse Hareruya card data: ${error.message}` });
  }
});

// --- Server Setup / Build serving ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
