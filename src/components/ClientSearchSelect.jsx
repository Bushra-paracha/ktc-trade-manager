import { useState, useRef, useEffect } from 'react';
import { Search, X, User } from 'lucide-react';

/**
 * ClientSearchSelect — a searchable dropdown for selecting a client
 *
 * Props:
 *   clients      — array of client objects from useClients()
 *   value        — currently selected client_id
 *   onChange     — callback(client_id) when selection changes
 *   placeholder  — placeholder text (optional)
 *   disabled     — boolean (optional)
 */
export default function ClientSearchSelect({ clients = [], value, onChange, placeholder = 'Search client by name, company or country…', disabled = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = clients.find(c => c.id === value);

  // Filter clients based on search query
  const filtered = query.trim().length === 0
    ? clients.slice(0, 50) // show first 50 when no query
    : clients.filter(c => {
        const q = query.toLowerCase();
        return (
          (c.company || '').toLowerCase().includes(q) ||
          (c.contact || '').toLowerCase().includes(q) ||
          (c.country || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q)
        );
      }).slice(0, 50);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(client) {
    onChange(client.id);
    setOpen(false);
    setQuery('');
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange('');
    setQuery('');
  }

  function handleOpen() {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>

      {/* Selected value display / trigger */}
      <div
        onClick={handleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 10px',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          background: disabled ? 'var(--surface-1)' : 'var(--surface-2)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: 36,
          fontSize: 13,
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <User size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected
            ? `${selected.company || selected.contact || selected.email} ${selected.country ? `· ${selected.country}` : ''}`
            : placeholder}
        </span>
        {selected && !disabled && (
          <button
            onClick={handleClear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 999,
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          maxHeight: 300,
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* Search input */}
          <div style={{ padding: '8px 10px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search…"
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                color: 'var(--text-primary)',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Results list */}
          <div style={{ overflowY: 'auto', maxHeight: 240 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                No clients found for "{query}"
              </div>
            ) : (
              filtered.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '0.5px solid var(--border)',
                    background: c.id === value ? 'var(--surface-1)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-1)'}
                  onMouseLeave={e => e.currentTarget.style.background = c.id === value ? 'var(--surface-1)' : 'transparent'}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {c.company || c.contact || c.email || c.id}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                    {c.contact && <span>{c.contact}</span>}
                    {c.country && <span>🌍 {c.country}</span>}
                    {c.email && <span>{c.email}</span>}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Count */}
          <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-muted)', borderTop: '0.5px solid var(--border)', textAlign: 'right' }}>
            {filtered.length} of {clients.length} clients
          </div>
        </div>
      )}
    </div>
  );
}
