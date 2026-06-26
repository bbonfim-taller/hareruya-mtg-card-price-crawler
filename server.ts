import express from 'express';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3000;

app.use(express.json());

// LigaMagic Integration Types and Mappings
interface LigaCard {
  namePt: string;
  nameEn: string;
  imageUrl: string;
  detailUrl: string;
  priceMin: number;
  priceMed: number;
  priceMax: number;
}

const LIGA_SET_MAPPING: Record<string, { edid: string; ed: string }> = {
  '22': { edid: '217', ed: 'ex' },   // Exodus
  '21': { edid: '15', ed: 'sh' },    // Stronghold
  '20': { edid: '16', ed: 'te' },    // Tempest
  '234': { edid: '219', ed: 'rv' },  // Revised (commonly '3ed' or 'rv')
  '394': { edid: '3041', ed: 'mh3' } // Modern Horizons 3 (mh3)
};

/**
 * Robust parser to extract card information from LigaMagic HTML
 */
function parseLigaHtml(html: string): LigaCard[] {
  const $ = cheerio.load(html);
  const cards: LigaCard[] = [];

  $('.nome-principal').each((_, el) => {
    const namePtEl = $(el);
    const namePt = namePtEl.text().trim();
    
    let container = namePtEl.parent();
    while (container.length > 0) {
      if (container.find('img').length > 0 && container.text().includes('R$')) {
        break;
      }
      const tag = container.get(0)?.tagName;
      if (tag === 'body' || tag === 'html') {
        container = namePtEl.parent(); // Fallback
        break;
      }
      container = container.parent();
    }

    let nameEn = container.find('.nome-auxiliar').text().trim();
    if (!nameEn) {
      nameEn = namePt;
    } else {
      nameEn = nameEn.replace(/^\((.*)\)$/, '$1').trim();
    }

    let detailUrl = namePtEl.attr('href') || container.find('a').first().attr('href') || '';
    if (detailUrl && !detailUrl.startsWith('http')) {
      detailUrl = `https://www.ligamagic.com.br/${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}`;
    }

    let imageUrl = container.find('img').attr('src') || container.find('img').attr('data-src') || '';
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `https://www.ligamagic.com.br/${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
    }

    const containerText = container.text();
    
    let priceMin = 0;
    const minMatch = containerText.match(/(?:Menor|Min|Mínimo)[^\d]*R\$\s*([\d.,]+)/i);
    if (minMatch) {
      priceMin = parseFloat(minMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    let priceMed = 0;
    const medMatch = containerText.match(/(?:Médio|Med|Méd)[^\d]*R\$\s*([\d.,]+)/i);
    if (medMatch) {
      priceMed = parseFloat(medMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    let priceMax = 0;
    const maxMatch = containerText.match(/(?:Maior|Max|Máximo)[^\d]*R\$\s*([\d.,]+)/i);
    if (maxMatch) {
      priceMax = parseFloat(maxMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    if (priceMin === 0 && priceMed === 0 && priceMax === 0) {
      const allPrices: number[] = [];
      const priceMatches = [...containerText.matchAll(/R\$\s*([\d.,]+)/gi)];
      for (const m of priceMatches) {
        const val = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
        if (!isNaN(val)) allPrices.push(val);
      }
      if (allPrices.length >= 3) {
        priceMin = allPrices[0];
        priceMed = allPrices[1];
        priceMax = allPrices[2];
      } else if (allPrices.length === 2) {
        priceMin = allPrices[0];
        priceMed = allPrices[1];
      } else if (allPrices.length === 1) {
        priceMin = allPrices[0];
        priceMed = allPrices[0];
      }
    }

    cards.push({
      namePt,
      nameEn,
      imageUrl,
      detailUrl,
      priceMin,
      priceMed,
      priceMax
    });
  });

  return cards;
}

// 401 Games Integration Types, Cache and Helper Functions
interface Cached401Price {
  price: number;
  priceMin: number;
  priceMax: number;
  available: boolean;
  url: string;
  title: string;
  timestamp: number;
}

const cache401Games = new Map<string, Cached401Price | null>();
const CACHE_401_DURATION = 15 * 60 * 1000; // 15 minutes cache

function cleanTitleFor401(title: string): string {
  // e.g. "City of Traitors (EXO)" -> "City of Traitors"
  return title.split('(')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cleanSetForComparison(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('edition', '')
    .replace('core', '')
    .trim();
}

async function fetch401Price(cardName: string, setName?: string): Promise<Cached401Price | null> {
  const normalizedKey = cardName.trim().toLowerCase();
  const cacheKey = setName 
    ? `${normalizedKey}::${setName.trim().toLowerCase()}` 
    : normalizedKey;
  
  // Check cache first (includes null cache for no matches)
  if (cache401Games.has(cacheKey)) {
    const cached = cache401Games.get(cacheKey);
    if (cached === null) return null;
    if (cached && (Date.now() - cached.timestamp < CACHE_401_DURATION)) {
      return cached;
    }
  }

  const url = `https://store.401games.ca/search/suggest.json?q=${encodeURIComponent(cardName)}&resources[type]=product&resources[limit]=10`;
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 4000
    });

    const products = res.data?.resources?.results?.products || [];
    const targetClean = normalizedKey.replace(/[^a-z0-9]/g, '');

    // Look for exact matches by name (ignoring set code in parentheses)
    const exactMatches = products.filter((p: any) => cleanTitleFor401(p.title) === targetClean);

    if (exactMatches.length > 0) {
      let setMatchedProducts = exactMatches;
      if (setName) {
        const cleanTargetSet = cleanSetForComparison(setName);
        const filtered = exactMatches.filter((p: any) => {
          // 1. Check tags
          if (Array.isArray(p.tags)) {
            for (const tag of p.tags) {
              const cleanTag = cleanSetForComparison(tag.replace(/^set_/i, ''));
              if (cleanTag === cleanTargetSet || cleanTag.includes(cleanTargetSet) || cleanTargetSet.includes(cleanTag)) {
                return true;
              }
            }
          }
          // 2. Check vendor
          if (p.vendor) {
            const cleanVendor = cleanSetForComparison(p.vendor);
            if (cleanVendor === cleanTargetSet || cleanVendor.includes(cleanTargetSet) || cleanTargetSet.includes(cleanVendor)) {
              return true;
            }
          }
          // 3. Check title
          if (p.title) {
            const cleanTitle = cleanSetForComparison(p.title);
            if (cleanTitle.includes(cleanTargetSet)) {
              return true;
            }
          }
          return false;
        });

        if (filtered.length > 0) {
          setMatchedProducts = filtered;
        }
      }

      // Prioritize in-stock matches (available: true)
      setMatchedProducts.sort((a: any, b: any) => {
        if (a.available && !b.available) return -1;
        if (!a.available && b.available) return 1;
        return 0;
      });

      const best = setMatchedProducts[0];
      const priceMaxNum = parseFloat(best.price_max || '0');
      const priceMinNum = parseFloat(best.price_min || '0');
      const priceDefault = parseFloat(best.price || '0');

      // Use max price if available, fallback to default price
      const representativePrice = priceMaxNum > 0 ? priceMaxNum : priceDefault;

      const result: Cached401Price = {
        price: representativePrice,
        priceMin: priceMinNum > 0 ? priceMinNum : priceDefault,
        priceMax: priceMaxNum > 0 ? priceMaxNum : priceDefault,
        available: best.available,
        url: `https://store.401games.ca${best.url}`,
        title: best.title,
        timestamp: Date.now()
      };
      cache401Games.set(cacheKey, result);
      return result;
    }

    // Cache null for a match that returned nothing to avoid hammering the API
    cache401Games.set(cacheKey, null);
    return null;
  } catch (err: any) {
    console.error(`Error fetching 401 Games price for "${cardName}":`, err.message);
    return null;
  }
}

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
  const { cardset, keyword, stockOnly, page, setName } = req.query;

  if (!cardset) {
    return res.status(400).json({ success: false, error: 'cardset parameter is required' });
  }

  const pageNum = parseInt(page as string) || 1;
  const kwStr = (keyword as string) || '';
  const isStockOnly = stockOnly === 'true' || stockOnly === undefined; // Default to true

  // Construct query parameters for the Hareruya Unisearch API
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

  // LigaMagic URL determination
  const setCode = cardset as string;
  let ligaUrl = '';
  const mapping = LIGA_SET_MAPPING[setCode];
  if (mapping) {
    ligaUrl = `https://www.ligamagic.com.br/?view=cards/search&card=edid=${mapping.edid}%20ed=${mapping.ed}`;
  } else if (setName) {
    ligaUrl = `https://www.ligamagic.com.br/?view=cards/search&card=${encodeURIComponent(setName as string)}`;
  }

  try {
    console.log(`Scraping Hareruya API: ${apiUrl}`);
    if (ligaUrl) {
      console.log(`Scraping LigaMagic in parallel: ${ligaUrl}`);
    }

    // Step 1: Query the Unisearch JSON API and LigaMagic HTML in parallel
    const hareruyaPromise = axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `https://www.hareruyamtg.com/en/products/search?cardset=${cardset}&stock=${isStockOnly ? '1' : ''}`
      },
      timeout: 6000
    });

    const ligaPromise = ligaUrl 
      ? axios.get(ligaUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.ligamagic.com.br/'
          },
          timeout: 6000
        }).catch(err => {
          console.warn('LigaMagic parallel fetch failed (Cloudflare 403 or timeout):', err.message);
          return null;
        })
      : Promise.resolve(null);

    const [apiResponse, ligaResponse] = await Promise.all([hareruyaPromise, ligaPromise]);

    const data = apiResponse.data;
    if (!data || !data.response) {
      return res.json({ success: true, count: 0, totalCount: 0, items: [] });
    }

    const docs = data.response.docs || [];
    const totalCount = data.response.numFound || 0;

    if (docs.length === 0) {
      return res.json({ success: true, count: 0, totalCount, items: [] });
    }

    // Parse LigaMagic results if successful
    let ligaCards: LigaCard[] = [];
    let isLigaBlocked = true;
    let ligaStatus: 'live' | 'estimated_cloudflare_block' | 'estimated_no_match' = 'estimated_cloudflare_block';

    if (ligaResponse && ligaResponse.status === 200) {
      ligaCards = parseLigaHtml(ligaResponse.data);
      isLigaBlocked = false;
      ligaStatus = 'live';
      console.log(`LigaMagic successfully parsed ${ligaCards.length} cards.`);
    } else if (!ligaUrl) {
      ligaStatus = 'estimated_no_match';
    }

    const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ligaMap = new Map<string, LigaCard>();
    for (const card of ligaCards) {
      ligaMap.set(normalizeName(card.nameEn), card);
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
      timeout: 6000
    });

    const html = renderResponse.data;
    const $ = cheerio.load(html);
    const items: any[] = [];

    // Step 3: Parse the HTML of individual card list-items and merge with LigaMagic data
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

      const priceNumeric = doc.price ? Number(doc.price) : (priceText ? Number(priceText.replace(/[^0-9]/g, '')) : 0);

      // Match with LigaMagic cards by English name
      const cardNameStr = doc.card_name || nameText.replace(/【[^】]+】/g, '').trim();
      const normCardName = normalizeName(cardNameStr);
      const matchedLigaCard = ligaMap.get(normCardName);

      // Exchange rate and adjustment multipliers
      // JPY to BRL rate is approx 0.035
      const JPY_TO_BRL_RATE = 0.035;

      let itemLigaPriceMin = 0;
      let itemLigaPriceMed = 0;
      let itemLigaPriceMax = 0;
      let itemLigaNamePt = cardNameStr;
      let itemLigaDetailUrl = `https://www.ligamagic.com.br/?view=cards/search&card=${encodeURIComponent(cardNameStr)}`;
      let itemLigaStatus = ligaStatus;

      if (matchedLigaCard) {
        itemLigaPriceMin = matchedLigaCard.priceMin;
        itemLigaPriceMed = matchedLigaCard.priceMed;
        itemLigaPriceMax = matchedLigaCard.priceMax;
        itemLigaNamePt = matchedLigaCard.namePt;
        itemLigaDetailUrl = matchedLigaCard.detailUrl;
        itemLigaStatus = 'live';
      } else {
        // Estimated prices: JPY -> BRL + 20% average localized MTG premium
        const estimatedMedBRL = (priceNumeric * JPY_TO_BRL_RATE) * 1.25;
        itemLigaPriceMed = Math.round(estimatedMedBRL * 100) / 100;
        itemLigaPriceMin = Math.round(estimatedMedBRL * 0.8 * 100) / 100;
        itemLigaPriceMax = Math.round(estimatedMedBRL * 1.3 * 100) / 100;
        itemLigaStatus = isLigaBlocked ? 'estimated_cloudflare_block' : 'estimated_no_match';
      }

      items.push({
        id: uniqueId,
        name: nameText || doc.product_name_en || doc.product_name || 'Unknown MTG Card',
        cardName: cardNameStr,
        priceText: priceText || (doc.price ? `¥ ${Number(doc.price).toLocaleString()}` : ''),
        priceNumeric,
        stockText: stockText || (doc.stock ? `【Stock:${doc.stock}】` : ''),
        stockNumeric: doc.stock ? Number(doc.stock) : (stockText ? Number(stockText.replace(/[^0-9]/g, '')) : 0),
        imageUrl: imageUrl || doc.image_url || '',
        detailUrl,
        weeklySales: Number(weeklySales),
        foil: doc.foil_flg === '1' || nameText.includes('【Foil】') || nameText.toLowerCase().includes('foil'),
        language: lang,
        condition: cond,
        ligaPriceMin: itemLigaPriceMin,
        ligaPriceMed: itemLigaPriceMed,
        ligaPriceMax: itemLigaPriceMax,
        ligaNamePt: itemLigaNamePt,
        ligaDetailUrl: itemLigaDetailUrl,
        ligaStatus: itemLigaStatus
      });
    });

    // Fetch and merge 401 Games prices for unique card names
    const uniqueCardNames = Array.from(new Set(items.map(i => i.cardName).filter(Boolean)));
    const prices401Map = new Map<string, Cached401Price | null>();

    const batchSize = 10;
    for (let i = 0; i < uniqueCardNames.length; i += batchSize) {
      const batch = uniqueCardNames.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (name) => {
          const result = await fetch401Price(name, setName as string);
          prices401Map.set(name.toLowerCase(), result);
        })
      );
    }

    // Map 401 Games prices back to individual items
    for (const item of items) {
      if (item.cardName) {
        const p401 = prices401Map.get(item.cardName.toLowerCase());
        if (p401) {
          item.fourZeroOnePrice = p401.price;
          item.fourZeroOnePriceMin = p401.priceMin;
          item.fourZeroOnePriceMax = p401.priceMax;
          item.fourZeroOneDetailUrl = p401.url;
          item.fourZeroOneAvailable = p401.available;
          item.fourZeroOneStatus = 'live';
        } else {
          item.fourZeroOneStatus = 'not_found';
        }
      } else {
        item.fourZeroOneStatus = 'not_found';
      }
    }

    res.json({
      success: true,
      count: items.length,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / 60),
      ligaMagicStatus: ligaStatus,
      items
    });

  } catch (error: any) {
    console.error('Error in /api/scrape:', error.message);
    res.status(500).json({ success: false, error: `Failed to fetch or parse Hareruya/LigaMagic card data: ${error.message}` });
  }
});

// --- Server Setup / Build serving ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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

if (!process.env.VERCEL) {
  startServer();
}

export default app;
