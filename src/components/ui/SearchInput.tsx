import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Pesquisar...',
}: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none stroke-[2.2]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-300/90 bg-white text-base
                   font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                   hover:border-slate-400 transition-all duration-150"
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400
                     hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          aria-label="Limpar pesquisa"
        >
          <X className="w-5 h-5 stroke-[2.2]" />
        </button>
      )}
    </div>
  );
}
