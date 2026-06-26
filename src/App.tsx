import { useState, useEffect, useCallback, useMemo } from 'react';
import { CardSet, CardItem, SearchHistoryItem } from './types';
import SetSelector from './components/SetSelector';
import StatsDashboard from './components/StatsDashboard';
import CardGrid from './components/CardGrid';
import FavoritesList from './components/FavoritesList';
import { CurrencyType, DEFAULT_RATES } from './utils/currency';
import { 
  Search, 
  RotateCw, 
  Sparkles, 
  HelpCircle, 
  BookOpen, 
  AlertTriangle,
  History,
  ShieldAlert,
  SlidersHorizontal,
  X,
  ExternalLink
} from 'lucide-react';

export default function App() {
  // --- States ---
  const [sets, setSets] = useState<CardSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [selectedSet, setSelectedSet] = useState<CardSet | null>(null);
  
  const [keyword, setKeyword] = useState('');
  const [stockOnly, setStockOnly] = useState(true);
  const [foilFilter, setFoilFilter] = useState<'all' | 'foil' | 'normal'>('all');
  const [sortBy, setSortBy] = useState<'price_desc' | 'price_asc' | 'name' | 'weekly_sold'>('price_desc');
  
  const [items, setItems] = useState<CardItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [favorites, setFavorites] = useState<CardItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currency, setCurrency] = useState<CurrencyType>(() => {
    const saved = localStorage.getItem('hareruya_currency');
    return (saved as CurrencyType) || 'JPY';
  });
  const [exchangeRates, setExchangeRates] = useState<Record<CurrencyType, number>>(DEFAULT_RATES);

  // --- Fetch live JPY exchange rates ---
  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/JPY');
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) {
            setExchangeRates({
              JPY: 1.0,
              BRL: data.rates.BRL || DEFAULT_RATES.BRL,
              USD: data.rates.USD || DEFAULT_RATES.USD,
              EUR: data.rates.EUR || DEFAULT_RATES.EUR,
              CAD: data.rates.CAD || DEFAULT_RATES.CAD,
            });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch live exchange rates, using robust fallback rates:', err);
      }
    }
    fetchRates();
  }, []);

  const handleCurrencyChange = (curr: CurrencyType) => {
    setCurrency(curr);
    localStorage.setItem('hareruya_currency', curr);
  };

  // --- Initialize Favorites & History ---
  useEffect(() => {
    const savedFavs = localStorage.getItem('hareruya_favs');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
    }

    const savedHistory = localStorage.getItem('hareruya_history');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error loading search history:', e);
      }
    }
  }, []);

  // --- Fetch Available Sets on Mount ---
  useEffect(() => {
    async function loadSets() {
      setSetsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/sets');
        const data = await res.json();
        if (data.success && data.sets && data.sets.length > 0) {
          setSets(data.sets);
          
          // Try to restore previous selection or default to Exodus (code 22)
          const lastSetCode = localStorage.getItem('hareruya_last_set');
          let initialSet = data.sets.find((s: CardSet) => s.code === lastSetCode);
          if (!initialSet) {
            initialSet = data.sets.find((s: CardSet) => s.code === '22'); // Exodus (Default)
          }
          if (!initialSet) {
            initialSet = data.sets[0]; // Fallback to first
          }
          setSelectedSet(initialSet || null);
        } else {
          throw new Error(data.error || 'No card sets found from Hareruya.');
        }
      } catch (err: any) {
        setError(`Failed to retrieve card sets list: ${err.message}`);
      } finally {
        setSetsLoading(false);
      }
    }
    loadSets();
  }, []);

  // --- Scraping Action Trigger ---
  const handleScrape = useCallback(async (set: CardSet | null, page: number = 1) => {
    if (!set) return;
    setItemsLoading(true);
    setError(null);

    // Build URL query parameters
    const params = new URLSearchParams();
    params.append('cardset', set.code);
    params.append('setName', set.name);
    if (keyword.trim()) {
      params.append('keyword', keyword.trim());
    }
    params.append('stockOnly', stockOnly ? 'true' : 'false');
    params.append('page', page.toString());

    try {
      const res = await fetch(`/api/scrape?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setTotalCount(data.totalCount || 0);
        setCurrentPage(data.currentPage || 1);
        setTotalPages(data.totalPages || 1);

        // Save last loaded set to local storage
        localStorage.setItem('hareruya_last_set', set.code);

        // Update Search History
        setSearchHistory(prev => {
          // Remove if duplicate set code
          const filtered = prev.filter(item => !(item.cardsetCode === set.code && item.keyword === keyword));
          const newEntry: SearchHistoryItem = {
            cardsetCode: set.code,
            cardsetName: set.name,
            keyword: keyword.trim(),
            timestamp: Date.now()
          };
          const updated = [newEntry, ...filtered].slice(0, 5); // Keep last 5 entries
          localStorage.setItem('hareruya_history', JSON.stringify(updated));
          return updated;
        });

      } else {
        throw new Error(data.error || 'Failed to crawl Hareruya card prices.');
      }
    } catch (err: any) {
      setError(`Crawler failure: ${err.message}. Please verify the set code and try again.`);
      setItems([]);
      setTotalCount(0);
    } finally {
      setItemsLoading(false);
    }
  }, [keyword, stockOnly]);

  // --- Auto Scrape when Selected Set changes ---
  useEffect(() => {
    if (selectedSet) {
      handleScrape(selectedSet, 1);
    }
  }, [selectedSet]);

  // --- Watchlist toggling ---
  const handleToggleFavorite = (item: CardItem) => {
    setFavorites(prev => {
      const isFav = prev.some(f => f.id === item.id);
      let updated;
      if (isFav) {
        updated = prev.filter(f => f.id !== item.id);
      } else {
        updated = [item, ...prev];
      }
      localStorage.setItem('hareruya_favs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearFavorites = () => {
    setFavorites([]);
    localStorage.removeItem('hareruya_favs');
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('hareruya_history');
  };

  // --- Filters Application (Client-Side for sorting/foils) ---
  const processedItems = useMemo(() => {
    let result = [...items];

    // Client-side foil filtering
    if (foilFilter === 'foil') {
      result = result.filter(item => item.foil);
    } else if (foilFilter === 'normal') {
      result = result.filter(item => !item.foil);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'price_desc') {
        return b.priceNumeric - a.priceNumeric;
      }
      if (sortBy === 'price_asc') {
        return a.priceNumeric - b.priceNumeric;
      }
      if (sortBy === 'weekly_sold') {
        return b.weeklySales - a.weeklySales;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [items, foilFilter, sortBy]);

  // --- Set Preset Selection ---
  const presets = [
    { name: 'Exodus', code: '22' },
    { name: 'Stronghold', code: '21' },
    { name: 'Tempest', code: '20' },
    { name: 'Revised Edition', code: '234' },
    { name: 'Modern Horizons 3', code: '394' }
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-amber-500 selection:text-black pb-12">
      
      {/* Top Header Grid Area */}
      <header className="border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-40" id="header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Sparkles className="h-5 w-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide uppercase">
                Hareruya MTG Card Price Crawler
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono tracking-wider">
                Live pricing & stock inspector for Japan's premier MTG shop
              </p>
            </div>
          </div>

          {/* Quick Stats Summary in Header */}
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <div>
              Sets Available: <span className="text-amber-400 font-bold">{sets.length || '...'}</span>
            </div>
            <div className="h-4 w-[1px] bg-zinc-800" />
            <div>
              Live URL: <a href="https://www.hareruyamtg.com" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors cursor-pointer">hareruyamtg.com</a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        
        {/* Error Banner */}
        {error && (
          <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-4 flex items-start gap-3 animate-in fade-in" id="error-banner">
            <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">Error Encountered</h4>
              <p className="text-xs text-red-200 mt-1">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Intro Card */}
        <div className="bg-zinc-900/15 border border-zinc-900/80 rounded-2xl p-6 relative overflow-hidden" id="intro-card">
          <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-950/40 text-amber-400 border border-amber-900/50 text-[10px] uppercase font-bold tracking-widest rounded-full mb-1">
              <Sparkles className="h-3 w-3" /> Cross-Border Triple Scraper
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Head-to-Head Arbitrage: Hareruya vs. 401 Games vs. LigaMagic
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This tool queries the live indexes of <strong>Hareruya</strong> (Japan), <strong>401 Games</strong> (Canada), and <strong>LigaMagic</strong> (Brazil) in parallel. All prices are calculated dynamically using live exchange rates, allowing instant 1:1 side-by-side comparison across three regions to locate cross-border arbitrage opportunities.
            </p>
          </div>
        </div>

        {/* Main Dashboard Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* LEFT COLUMN: Controls & Watchlist */}
          <div className="xl:col-span-1 space-y-8">
            
            {/* Scraping Panel */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-5" id="controls-panel">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-3">
                Scraper Configuration
              </h3>

              {/* Set Selection Dropdown */}
              <SetSelector 
                sets={sets} 
                selectedSet={selectedSet} 
                onSelectSet={(set) => {
                  setSelectedSet(set);
                  setCurrentPage(1);
                }} 
                loading={setsLoading} 
              />

              {/* Presets Grid */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Popular Sets Shortcuts
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => {
                    const isSelected = selectedSet?.code === preset.code;
                    return (
                      <button
                        key={preset.code}
                        type="button"
                        id={`shortcut-${preset.code}`}
                        onClick={() => {
                          const found = sets.find(s => s.code === preset.code);
                          if (found) {
                            setSelectedSet(found);
                          } else {
                            setSelectedSet(preset);
                          }
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' 
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Keyword Search Input */}
              <div className="space-y-1">
                <label htmlFor="card-keyword" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Card Name Keyword
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="card-keyword"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleScrape(selectedSet, 1);
                    }}
                    placeholder="e.g. Survival, Mox, Foil..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-amber-500 text-xs text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-zinc-600"
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-zinc-600 pointer-events-none" />
                </div>
              </div>

              {/* Stock Checkbox Filter */}
              <div className="flex items-center gap-2 pt-1" id="stock-toggle">
                <input
                  type="checkbox"
                  id="in-stock-only"
                  checked={stockOnly}
                  onChange={(e) => setStockOnly(e.target.checked)}
                  className="h-4 w-4 bg-zinc-900 border border-zinc-800 text-amber-500 rounded focus:ring-amber-500 focus:ring-offset-black accent-amber-500 cursor-pointer"
                />
                <label htmlFor="in-stock-only" className="text-xs font-semibold text-zinc-300 cursor-pointer">
                  In-Stock Items Only
                </label>
              </div>

              {/* Submit Scraper Action */}
              <button
                type="button"
                id="scrape-trigger-button"
                disabled={itemsLoading || setsLoading || !selectedSet}
                onClick={() => handleScrape(selectedSet, 1)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                <RotateCw className={`h-4 w-4 ${itemsLoading ? 'animate-spin' : ''}`} />
                {itemsLoading ? 'Crawl in progress...' : 'Inspect Set Prices'}
              </button>

              {/* Direct Store Links */}
              {selectedSet && (
                <div className="space-y-2 pt-3 border-t border-zinc-900">
                  <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Direct Store Links</span>
                    <span className="text-[9px] text-emerald-500 font-mono">In Stock Sync</span>
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {/* 401 Games Link */}
                    <a
                      href={`https://store.401games.ca/collections/mtg-expansion-sets?filters=Set,Set_${encodeURIComponent(selectedSet.name)}&filters=In+Stock,True`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 bg-sky-950/25 hover:bg-sky-900/30 border border-sky-900/40 hover:border-sky-500 text-sky-400 hover:text-sky-300 rounded-lg transition-all text-[11px] font-semibold cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        401 Games ({selectedSet.name})
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>

                    {/* Hareruya Link */}
                    <a
                      href={`https://www.hareruyamtg.com/en/products/search?fq.cardset=${selectedSet.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-900 hover:border-zinc-700 text-zinc-300 rounded-lg transition-all text-[11px] cursor-pointer"
                    >
                      <span>Hareruya Store</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Watchlist Panel */}
            <FavoritesList 
              favorites={favorites} 
              onRemoveFavorite={handleToggleFavorite} 
              onClearAll={handleClearFavorites} 
              currency={currency}
              rates={exchangeRates}
            />

            {/* Recent Searches Panel */}
            {searchHistory.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5" id="history-panel">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <History className="h-4 w-4 text-zinc-500" />
                    Recent Queries
                  </h4>
                  <button 
                    onClick={handleClearHistory}
                    className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold tracking-wider cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-2">
                  {searchHistory.map((item, idx) => (
                    <button
                      key={`${item.cardsetCode}-${item.keyword}-${idx}`}
                      onClick={() => {
                        setSelectedSet({ name: item.cardsetName, code: item.cardsetCode });
                        setKeyword(item.keyword);
                        // Trigger immediate scrape via state updates
                      }}
                      className="w-full text-left text-xs text-zinc-400 hover:text-amber-400 bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800 px-2.5 py-1.5 rounded transition-all flex items-center justify-between gap-2 cursor-pointer truncate"
                    >
                      <span className="truncate">{item.cardsetName}</span>
                      {item.keyword && (
                        <span className="text-[9px] font-mono bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded truncate shrink-0 max-w-[80px]">
                          "{item.keyword}"
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Scrape results + Dashboard stats */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* View Header with Client-Side Filters */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4" id="view-filters-bar">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Result View Controls
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Foil Filter Option */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">Printing:</span>
                  <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
                    <button
                      type="button"
                      id="foil-filter-all"
                      onClick={() => setFoilFilter('all')}
                      className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${foilFilter === 'all' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      id="foil-filter-normal"
                      onClick={() => setFoilFilter('normal')}
                      className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${foilFilter === 'normal' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      id="foil-filter-foil"
                      onClick={() => setFoilFilter('foil')}
                      className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${foilFilter === 'foil' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Foil
                    </button>
                  </div>
                </div>

                {/* Currency Option */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">Currency:</span>
                  <select
                    id="currency-select-field"
                    value={currency}
                    onChange={(e) => handleCurrencyChange(e.target.value as CurrencyType)}
                    className="bg-zinc-900 text-xs text-white border border-zinc-800 focus:border-amber-500 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer font-bold"
                  >
                    <option value="JPY">¥ JPY (Yen)</option>
                    <option value="BRL">R$ BRL (Real)</option>
                    <option value="USD">$ USD (Dollar)</option>
                    <option value="EUR">€ EUR (Euro)</option>
                    <option value="CAD">CA$ CAD (Dollar)</option>
                  </select>
                </div>

                {/* Sort Option */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">Sort:</span>
                  <select
                    id="sort-select-field"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-zinc-900 text-xs text-white border border-zinc-800 focus:border-amber-500 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
                  >
                    <option value="price_desc">Price: High to Low</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="weekly_sold">Weekly Sold Count</option>
                    <option value="name">Card Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scrape results container */}
            {itemsLoading ? (
              <div className="min-h-[400px] flex flex-col justify-center items-center gap-3 bg-zinc-950 border border-zinc-900 rounded-xl" id="results-loader">
                <div className="h-10 w-10 border-2 border-amber-500 border-t-transparent animate-spin rounded-full" />
                <p className="text-xs text-zinc-400 font-mono tracking-wider">
                  Contacting Hareruya API & parsing detailed DOM tables...
                </p>
                <p className="text-[10px] text-zinc-600">
                  Gathering prices, stocks, and English translations.
                </p>
              </div>
            ) : processedItems.length === 0 && items.length > 0 ? (
              <div className="min-h-[300px] flex flex-col justify-center items-center bg-zinc-950 border border-zinc-900 rounded-xl p-8" id="empty-results">
                <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                <p className="text-xs text-zinc-400 font-semibold">
                  No items matched your specific foil/normal filter.
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Try changing the foil setting above or search keyword.
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="min-h-[400px] flex flex-col justify-center items-center bg-zinc-950 border border-zinc-900 rounded-xl p-8 text-center" id="empty-initial">
                <BookOpen className="h-10 w-10 text-zinc-700 mb-3" />
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                  Card Scrape Results Empty
                </p>
                <p className="text-[10px] text-zinc-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Select an MTG card set or enter card names, then click the **Inspect Set Prices** button above to load the latest prices from Hareruya.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Stats Analytics Dashboard */}
                <StatsDashboard 
                  items={items} 
                  currency={currency}
                  rates={exchangeRates}
                />

                {/* Card offers list/grid */}
                <CardGrid
                  items={processedItems}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  onPageChange={(page) => handleScrape(selectedSet, page)}
                  loading={itemsLoading}
                  currency={currency}
                  rates={exchangeRates}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
