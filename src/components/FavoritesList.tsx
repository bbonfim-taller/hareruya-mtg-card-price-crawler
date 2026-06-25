import { CardItem } from '../types';
import { Heart, Trash2, ExternalLink } from 'lucide-react';
import { CurrencyType, formatPrice } from '../utils/currency';

interface FavoritesListProps {
  favorites: CardItem[];
  onRemoveFavorite: (item: CardItem) => void;
  onClearAll: () => void;
  currency: CurrencyType;
  rates: Record<CurrencyType, number>;
}

export default function FavoritesList({ 
  favorites, 
  onRemoveFavorite, 
  onClearAll,
  currency,
  rates
}: FavoritesListProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5" id="watchlist-container">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
            Watched Cards ({favorites.length})
          </h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Track card price and stock levels</p>
        </div>
        {favorites.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[10px] font-bold text-zinc-500 hover:text-rose-400 transition-colors uppercase tracking-wider bg-transparent cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-zinc-600">Your watchlist is currently empty.</p>
          <p className="text-[10px] text-zinc-600 mt-1">Click the heart icon on any scraped card to start tracking.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-900 overflow-y-auto max-h-80 custom-scrollbar pr-1">
          {favorites.map((card) => {
            let cleanName = card.name.replace(/《|》/g, '').replace(/【JP】|【EN】/g, '').trim();
            cleanName = cleanName.split('[')[0]?.trim() || cleanName;

            return (
              <div key={card.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-2.5 min-w-0">
                  {card.imageUrl && (
                    <img
                      src={card.imageUrl}
                      alt={cleanName}
                      referrerPolicy="no-referrer"
                      className="h-9 w-7 object-cover rounded shadow-sm border border-zinc-900"
                    />
                  )}
                  <div className="min-w-0">
                    <a
                      href={card.detailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-zinc-200 hover:text-amber-400 truncate block transition-colors cursor-pointer"
                      title={card.name}
                    >
                      {cleanName}
                    </a>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-amber-500 font-bold">
                        {formatPrice(card.priceNumeric, currency, rates)}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono scale-90 origin-left">{card.stockText}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={card.detailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-900 transition-colors cursor-pointer"
                    title="View details"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => onRemoveFavorite(card)}
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-900 transition-colors cursor-pointer"
                    title="Remove from Watchlist"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
