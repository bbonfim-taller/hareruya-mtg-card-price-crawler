import { CardItem } from '../types';
import { Heart, ExternalLink, ArrowLeft, ArrowRight, Layers, Flame, TrendingUp } from 'lucide-react';
import { CurrencyType, formatPrice } from '../utils/currency';

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
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                        {item.condition === '1' ? 'Near Mint (NM)' : 'Condition ID: ' + item.condition}
                      </span>
                      <a
                        href={item.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-sans text-xs font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-2 block cursor-pointer"
                        title={item.name}
                      >
                        {cleanName}
                      </a>
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
                <div className="p-4 pt-0 border-t border-zinc-900/50 mt-auto bg-zinc-950">
                  <div className="flex items-center justify-between pt-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Price</span>
                      <span className="text-sm sm:text-base font-mono font-bold text-white tracking-tight">
                        {formatPrice(item.priceNumeric, currency, rates)}
                      </span>
                    </div>

                    <a
                      href={item.detailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-amber-500 hover:text-black text-zinc-300 text-xs font-bold rounded-lg transition-colors border border-zinc-800 hover:border-amber-500 cursor-pointer"
                    >
                      Inspect Detail
                      <ExternalLink className="h-3.5 w-3.5" />
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
