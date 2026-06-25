import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Loader2, BookOpen } from 'lucide-react';
import { CardSet } from '../types';

interface SetSelectorProps {
  sets: CardSet[];
  selectedSet: CardSet | null;
  onSelectSet: (set: CardSet) => void;
  loading: boolean;
}

export default function SetSelector({ sets, selectedSet, onSelectSet, loading }: SetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSets = sets.filter(set =>
    set.name.toLowerCase().includes(filterText.toLowerCase()) ||
    set.code.includes(filterText)
  );

  return (
    <div className="relative w-full md:w-80" ref={dropdownRef} id="set-selector-container">
      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
        Select Card Set
      </label>
      
      <button
        type="button"
        id="set-selector-button"
        disabled={loading}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setFilterText('');
        }}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white hover:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all text-left disabled:opacity-50 cursor-pointer"
      >
        <span className="flex items-center gap-2 truncate">
          <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="truncate">{selectedSet ? selectedSet.name : 'Loading card sets...'}</span>
        </span>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
        )}
      </button>

      {isOpen && !loading && (
        <div 
          id="set-selector-dropdown"
          className="absolute z-50 mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden max-h-80 flex flex-col animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="p-2 border-b border-zinc-900 flex items-center gap-2 bg-zinc-900/50">
            <Search className="h-4 w-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              id="set-search-input"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search set name or code..."
              className="w-full bg-transparent text-sm text-white focus:outline-none"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto flex-1 py-1 max-h-60 custom-scrollbar">
            {filteredSets.length > 0 ? (
              filteredSets.map((set) => {
                const isSelected = selectedSet?.code === set.code;
                return (
                  <button
                    key={set.code}
                    type="button"
                    id={`set-option-${set.code}`}
                    onClick={() => {
                      onSelectSet(set);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-950/40 text-amber-400 font-medium' 
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <span className="truncate mr-2">{set.name}</span>
                    <span className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono shrink-0">
                      Code: {set.code}
                      {isSelected && <Check className="h-3.5 w-3.5 text-amber-500" />}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-zinc-500">
                No sets match your search
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
