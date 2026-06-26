import { CardItem } from '../types';
import { Heart, ExternalLink, ArrowLeft, ArrowRight, Layers, Flame, TrendingUp, Info } from 'lucide-react';
import { CurrencyType, formatPrice, formatBrlPrice, convertBrlPrice, formatCadPrice, convertCadPrice } from '../utils/currency';

interface CardGridProps {
  items: CardItem[];
  favorites: CardItem[];
  onToggleFavorite: (item: CardItem) => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  currency: CurrencyType;
  rates: Record<CurrencyType, number>;
}

export default function CardGrid({
  items,
  favorites,
  onToggleFavorite,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  loading,
  currency,
  rates
}: CardGridProps) {
  const favoriteIds = new Set(favorites.map(f => f.id));

  // Helper to format stock count colors
  const getStockBadgeClass = (stockNumeric: number) => {
    if (stockNumeric === 0) return 'bg-zinc-950 text-zinc-500 border border-zinc-800';
    if (stockNumeric === 1) return 'bg-rose-950/40 text-rose-400 border border-rose-900/50';
    if (stockNumeric <= 3) return 'bg-amber-950/40 text-amber-400 border border-amber-900/50';
    return 'bg-zinc-900 text-zinc-300 border border-zinc-800';
  };

  return (
    <div className="space-y-6" id="card-grid-container">
      {/* Grid Header & Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Scraped Card Offers
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Displaying {items.length} cards out of {totalCount.toLocaleString()} total found
          </p>
        </div>

        {/* Top Mini Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded border border-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono text-zinc-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded border border-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      {items.length === 0 ? (
        <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">No card offers matched your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => {
            const isFav = favoriteIds.has(item.id);
            const isEn = item.name.includes('【EN】') || item.language === '2';
            const isJp = item.name.includes('【JP】') || item.language === '1';

            // Clean card names
            let cleanName = item.name.replace(/《|》/g, '').replace(/【JP】|【EN】/g, '').trim();
            // Remove code like [EXO]
            cleanName = cleanName.split('[')[0]?.trim() || cleanName;

            return (
              <div
                key={item.id}
                id={`card-item-${item.id}`}
                className="group relative flex flex-col justify-between bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden hover:border-zinc-800/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)] transition-all duration-300"
              >
                {/* Header Action Buttons */}
                <div className="absolute top-2.5 right-2.5 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => onToggleFavorite(item)}
                    id={`fav-btn-${item.id}`}
                    className={`p-1.5 rounded-lg border backdrop-blur-md transition-colors cursor-pointer ${
                      isFav 
                        ? 'bg-rose-950/80 border-rose-900 text-rose-400 hover:bg-rose-900/80' 
                        : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900/80'
                    }`}
                    title={isFav ? 'Remove Bookmark' : 'Bookmark Card'}
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                  <a
                    href={item.detailUrl}
                    target="_blank"
                    id={`detail-link-${item.id}`}
                    rel="noopener noreferrer"
                    className="p-1.5 bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/80 backdrop-blur-md transition-colors cursor-pointer"
                    title="View on Hareruya"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Card Main Block */}
                <div>
                  {/* Card Thumbnail Stage */}
                  <div className="relative bg-zinc-900/40 p-4 flex justify-center items-center h-48 border-b border-zinc-900/50 overflow-hidden">
                    {/* Amber Ambient Glow */}
                    <div className="absolute inset-0 bg-radial from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={cleanName}
                        referrerPolicy="no-referrer"
                        className="h-full object-contain rounded-md shadow-lg shadow-black/80 transform group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />
                    ) : (
                      <div className="h-28 w-20 border-2 border-dashed border-zinc-800 rounded flex flex-col justify-center items-center text-[10px] text-zinc-600 font-mono">
                        No Image
                      </div>
                    )}

                    {/* Foil/Shine Effect Overlay if Foil */}
                    {item.foil && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-linear-to-r from-purple-500 via-indigo-500 to-amber-500 text-[9px] font-bold text-white uppercase rounded-md shadow tracking-wider animate-pulse">
                        <Flame className="h-3 w-3 fill-current shrink-0" />
                        Foil
                      </div>
                    )}

                    {/* Language Badge */}
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {isJp && (
                        <span className="px-1.5 py-0.5 bg-red-950/60 text-red-400 border border-red-900/50 text-[9px] font-bold rounded">
                          JP
                        </span>
                      )}
                      {isEn && (
                        <span className="px-1.5 py-0.5 bg-blue-950/60 text-blue-400 border border-blue-900/50 text-[9px] font-bold rounded">
                          EN
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Text Details Block */}
                  <div className="p-4 space-y-2.5">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                          {item.condition === '1' ? 'Near Mint (NM)' : 'Condition ID: ' + item.condition}
                        </span>
                        {item.ligaStatus === 'live' && (
                          <span className="text-[8px] font-semibold px-1 py-0.2 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded">Synced</span>
                        )}
                      </div>
                      <a
                        href={item.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-sans text-xs font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-2 block cursor-pointer"
                        title={item.name}
                      >
                        {cleanName}
                      </a>
                      {item.ligaNamePt && item.ligaNamePt !== cleanName && (
                        <span className="text-[10px] text-zinc-400 font-medium block truncate" title="LigaMagic Portuguese Name">
                          PT: {item.ligaNamePt}
                        </span>
                      )}
                    </div>

                    {/* Badges / Metrics Row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {/* Stock badge */}
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-medium rounded ${getStockBadgeClass(item.stockNumeric)}`}>
                        {item.stockText || 'Out of Stock'}
                      </span>

                      {/* Weekly sales badge */}
                      {item.weeklySales > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 text-[10px] font-mono rounded">
                          <TrendingUp className="h-3 w-3" />
                          Sold: {item.weeklySales}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Price & Call To Action Block */}
                <div className="p-3 pt-2.5 border-t border-zinc-900/50 mt-auto bg-zinc-950/40 space-y-2.5">
                  {/* Price Grid (Hareruya vs 401 Games vs LigaMagic) */}
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    {/* Hareruya (Japan) */}
                    <div className="bg-zinc-900/40 p-1.5 rounded-lg border border-zinc-900/80">
                      <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-mono block">Hareruya</span>
                      <span className="font-mono font-bold text-white block mt-0.5 text-[11px] truncate" title="Hareruya Price">
                        {formatPrice(item.priceNumeric, currency, rates)}
                      </span>
                      <span className="text-[7px] text-zinc-600 block">Japan</span>
                    </div>

                    {/* 401 Games (Canada) */}
                    <div className="bg-zinc-900/40 p-1.5 rounded-lg border border-zinc-900/80 relative">
                      <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-mono flex items-center justify-between">
                        <span>401 Games</span>
                        {item.fourZeroOneStatus === 'live' && (
                          <span className={`h-1 w-1 rounded-full ${item.fourZeroOneAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} title={item.fourZeroOneAvailable ? 'In Stock' : 'Out of Stock'} />
                        )}
                      </span>
                      <span className="font-mono font-bold text-sky-400 block mt-0.5 text-[11px] truncate" title="401 Games Price">
                        {item.fourZeroOnePrice ? formatCadPrice(item.fourZeroOnePrice, currency, rates) : 'No Price'}
                      </span>
                      <span className="text-[7px] text-zinc-600 block truncate">
                        {item.fourZeroOneStatus === 'live' ? (item.fourZeroOneAvailable ? 'In Stock' : 'Out of Stock') : 'Not Found'}
                      </span>
                    </div>

                    {/* LigaMagic (Brazil) */}
                    <div className="bg-zinc-900/40 p-1.5 rounded-lg border border-zinc-900/80 relative group/liga">
                      <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-mono flex items-center justify-between">
                        <span>LigaMagic</span>
                        {item.ligaStatus === 'live' ? (
                          <span className="h-1 w-1 rounded-full bg-emerald-500" title="Live Synced" />
                        ) : (
                          <div className="flex items-center cursor-help">
                            <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                          </div>
                        )}
                      </span>
                      <span className="font-mono font-bold text-amber-400 block mt-0.5 text-[11px] truncate" title="LigaMagic Price">
                        {item.ligaPriceMed ? formatBrlPrice(item.ligaPriceMed, currency, rates) : 'No Price'}
                      </span>
                      <span className="text-[7px] text-zinc-600 block truncate" title={item.ligaStatus === 'live' ? 'BRL Live Median Price' : 'Estimated BRL'}>
                        {item.ligaStatus === 'live' ? 'Live Med' : 'Estimated'}
                      </span>

                      {/* Tooltip on hover when estimated */}
                      {item.ligaStatus !== 'live' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 p-2 bg-zinc-950 border border-zinc-800 text-[9px] leading-normal text-zinc-400 rounded-lg opacity-0 invisible group-hover/liga:opacity-100 group-hover/liga:visible transition-all duration-200 shadow-xl z-20">
                          <div className="font-bold text-amber-400 mb-0.5">LigaMagic Estimated</div>
                          Direct scrape blocked by Cloudflare. Estimated using Hareruya's JPY price + 25% local premium.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price Differences Section */}
                  <div className="space-y-1">
                    {/* 401 Games vs Hareruya Difference */}
                    {item.priceNumeric > 0 && item.fourZeroOnePrice && (
                      (() => {
                        const hRate = rates[currency] || 1;
                        const hVal = item.priceNumeric * hRate;
                        const fVal = convertCadPrice(item.fourZeroOnePrice, currency, rates);
                        
                        const diffVal = fVal - hVal;
                        const diffPct = (diffVal / hVal) * 100;

                        return (
                          <div className="flex items-center justify-between text-[9px] px-2 py-0.5 bg-zinc-900/10 border border-zinc-900/40 rounded">
                            <span className="text-zinc-500">401 vs Hareruya:</span>
                            <span className={`font-mono font-semibold ${diffVal > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {diffVal > 0 ? '+' : ''}{diffPct.toFixed(1)}% ({diffVal > 0 ? '+' : ''}{formatPrice(Math.round(Math.abs(diffVal) / hRate), currency, rates)})
                            </span>
                          </div>
                        );
                      })()
                    )}

                    {/* LigaMagic vs Hareruya Difference */}
                    {item.priceNumeric > 0 && item.ligaPriceMed && (
                      (() => {
                        const hRate = rates[currency] || 1;
                        const hVal = item.priceNumeric * hRate;
                        const lVal = convertBrlPrice(item.ligaPriceMed, currency, rates);
                        
                        const diffVal = lVal - hVal;
                        const diffPct = (diffVal / hVal) * 100;

                        return (
                          <div className="flex items-center justify-between text-[9px] px-2 py-0.5 bg-zinc-900/10 border border-zinc-900/40 rounded">
                            <span className="text-zinc-500">Liga vs Hareruya:</span>
                            <span className={`font-mono font-semibold ${diffVal > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {diffVal > 0 ? '+' : ''}{diffPct.toFixed(1)}% ({diffVal > 0 ? '+' : ''}{formatPrice(Math.round(Math.abs(diffVal) / hRate), currency, rates)})
                            </span>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-zinc-900/30">
                    <div className="flex items-center gap-1 text-[9px] text-zinc-400">
                      <a
                        href={item.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors"
                        title="View on Hareruya"
                      >
                        Hareruya
                      </a>
                      <span>|</span>
                      <a
                        href={item.fourZeroOneDetailUrl || `https://store.401games.ca/search?q=${encodeURIComponent(item.cardName)}&filters=In+Stock,True`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-sky-400 transition-colors"
                        title={item.fourZeroOneDetailUrl ? "View on 401 Games" : "Search in-stock on 401 Games"}
                      >
                        401
                      </a>
                      <span>|</span>
                      <a
                        href={item.ligaDetailUrl || `https://www.ligamagic.com.br/?view=cards/search&card=${encodeURIComponent(item.cardName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-amber-400 transition-colors"
                        title="View on LigaMagic"
                      >
                        Liga
                      </a>
                    </div>

                    <a
                      href={item.fourZeroOneDetailUrl || item.detailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2 py-0.5 bg-zinc-900 hover:bg-amber-500 hover:text-black text-zinc-300 text-[9px] font-bold rounded transition-colors border border-zinc-800 hover:border-amber-500 cursor-pointer"
                    >
                      Buy
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Large Bottom Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 border-t border-zinc-900 pt-6">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg disabled:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          
          <span className="text-xs text-zinc-500 font-mono">
            Page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span>
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg disabled:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
