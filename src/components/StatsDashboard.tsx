import { useMemo } from 'react';
import { CardItem } from '../types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
} from 'recharts';
import { TrendingUp, DollarSign, Archive, Award } from 'lucide-react';
import { CurrencyType, formatPrice } from '../utils/currency';

interface StatsDashboardProps {
  items: CardItem[];
  currency: CurrencyType;
  rates: Record<CurrencyType, number>;
}

export default function StatsDashboard({ items, currency, rates }: StatsDashboardProps) {
  const stats = useMemo(() => {
    if (items.length === 0) return null;

    const prices = items.map(item => item.priceNumeric).filter(p => p > 0);
    const stocks = items.map(item => item.stockNumeric);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);

    const totalStock = stocks.reduce((sum, s) => sum + s, 0);
    
    // Sort items to find top expensive cards
    const sortedByPrice = [...items].sort((a, b) => b.priceNumeric - a.priceNumeric);
    const topExpensive = sortedByPrice.slice(0, 5);

    // Calculate price distribution with dynamic currency labels
    const distribution = [
      { name: currency === 'JPY' ? '< ¥500' : `< ${formatPrice(500, currency, rates)}`, count: 0, fill: '#71717a' },
      { name: currency === 'JPY' ? '¥500-2K' : `${formatPrice(500, currency, rates)}-2K`, count: 0, fill: '#f59e0b' },
      { name: currency === 'JPY' ? '¥2K-10K' : `2K-10K`, count: 0, fill: '#ea580c' },
      { name: currency === 'JPY' ? '¥10K-50K' : `10K-50K`, count: 0, fill: '#dc2626' },
      { name: currency === 'JPY' ? '¥50K+' : `50K+`, count: 0, fill: '#84cc16' },
    ];

    prices.forEach(price => {
      if (price < 500) distribution[0].count++;
      else if (price < 2000) distribution[1].count++;
      else if (price < 10000) distribution[2].count++;
      else if (price < 50000) distribution[3].count++;
      else distribution[4].count++;
    });

    // Format top cards for horizontal chart, using converted price for proper alignment on XAxis
    const topCardsData = topExpensive.map(item => {
      // Clean names: remove Japanese symbols, brackets, etc.
      let displayName = item.name.replace(/《|》/g, '').split('[')[0].trim();
      if (displayName.includes('/')) {
        displayName = displayName.split('/')[1] || displayName.split('/')[0];
      }
      return {
        name: displayName.length > 20 ? displayName.substring(0, 18) + '...' : displayName,
        price: item.priceNumeric * (rates[currency] || 1),
        rawName: item.name
      };
    });

    return {
      minPrice,
      maxPrice,
      avgPrice,
      totalStock,
      avgStock: Math.round(totalStock / items.length),
      topExpensive,
      distribution,
      topCardsData
    };
  }, [items, currency, rates]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" id="stats-dashboard">
      {/* Col 1: Key Figures */}
      <div className="space-y-4 lg:col-span-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between" id="stat-avg-price">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Price</span>
              <DollarSign className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-mono font-bold text-white sm:text-base">
                {formatPrice(stats.avgPrice, currency, rates)}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Average per item</p>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between" id="stat-max-price">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Max Price</span>
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-mono font-bold text-amber-400 sm:text-base">
                {formatPrice(stats.maxPrice, currency, rates)}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Highest value card</p>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between" id="stat-total-stock">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Stock</span>
              <Archive className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <div className="text-sm font-mono font-bold text-white sm:text-base">
                {stats.totalStock.toLocaleString()}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Items available</p>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between" id="stat-min-price">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Min Price</span>
              <TrendingUp className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <div className="text-sm font-mono font-bold text-zinc-300 sm:text-base">
                {formatPrice(stats.minPrice, currency, rates)}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Lowest price</p>
            </div>
          </div>
        </div>

        {/* Highlight Card */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4" id="top-card-highlight">
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Set Crown Jewel
          </h4>
          <div className="flex items-start gap-3">
            {stats.topExpensive[0]?.imageUrl && (
              <img 
                src={stats.topExpensive[0].imageUrl} 
                alt={stats.topExpensive[0].name}
                referrerPolicy="no-referrer"
                className="h-16 w-12 object-cover rounded shadow-md shadow-black shrink-0 border border-zinc-800"
              />
            )}
            <div className="flex-1 min-w-0">
              <a 
                href={stats.topExpensive[0]?.detailUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-semibold text-white hover:text-amber-400 transition-colors line-clamp-2 block cursor-pointer"
              >
                {stats.topExpensive[0]?.name}
              </a>
              <div className="text-xs font-mono font-bold text-amber-500 mt-1">
                {formatPrice(stats.topExpensive[0]?.priceNumeric, currency, rates)}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                {stats.topExpensive[0]?.stockText}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Col 2: Price Distribution Chart */}
      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-5 flex flex-col justify-between lg:col-span-1" id="price-distribution-chart">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Price Distribution ({currency})
          </h4>
          <p className="text-[10px] text-zinc-500 mb-4">
            Quantity of card items inside price tiers
          </p>
        </div>
        <div className="h-44 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.distribution} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                labelStyle={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 'bold' }}
                itemStyle={{ color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Col 3: Top Value Cards Chart */}
      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-5 flex flex-col justify-between lg:col-span-1" id="top-cards-chart">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Top 5 Most Expensive Cards ({currency})
          </h4>
          <p className="text-[10px] text-zinc-500 mb-4">
            Card single-item values in selected currency
          </p>
        </div>
        <div className="h-44 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={stats.topCardsData} 
              layout="vertical"
              margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
            >
              <XAxis type="number" tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fill: '#e4e4e7', fontSize: 9 }} 
                axisLine={false} 
                tickLine={false} 
                width={90}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                itemStyle={{ color: '#f59e0b', fontSize: '12px' }}
                formatter={(value: any) => {
                  const val = Number(value);
                  if (currency === 'JPY') return [`¥${Math.round(val).toLocaleString()}`, 'Price'];
                  if (currency === 'BRL') return [`R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Price'];
                  if (currency === 'USD') return [`$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Price'];
                  if (currency === 'EUR') return [`€${val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Price'];
                  return [`${val.toFixed(2)}`, 'Price'];
                }}
              />
              <Bar dataKey="price" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
