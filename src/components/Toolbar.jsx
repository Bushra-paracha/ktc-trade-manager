import { Search } from 'lucide-react';

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="search-input">
      <Search />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
      />
    </div>
  );
}

export function SelectInput({ value, onChange, options, label }) {
  return (
    <select className="select-input" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label || 'All'}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}
