import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, User, ChevronDown, Check } from 'lucide-react';

/**
 * ClientSearchSelect — a searchable, keyboard-navigable picker for choosing a client.
 *
 * Drop-in replacement: same props as before, so existing usages (Orders) keep working.
 *
 * Props:
 *   clients      — array of client objects from useClients()
 *   value        — currently selected client id
 *   onChange     — callback(id) when selection changes ('' when cleared)
 *   placeholder  — trigger placeholder text (optional)
 *   disabled     — boolean (optional)
 *   autoFocus    — open immediately on mount (optional)
 */
export default function ClientSearchSelect({
  clients = [],
  value,
  onChange,
  placeholder = 'Search client by company, contact, country…',
  disabled = false,
  autoFocus = false,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const normalizeId = (v) => String(v ?? '').trim();

  const selected = clients.find((c) => normalizeId(c.id) === normalizeId(value));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 50);
    return clients
      .filter((c) =>
        [c.company, c.contact, c.country, c.email, c.id]
          .some((field) => (field || '').toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [clients, query]);

  // Keep the highlighted row valid as the list changes.
  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Close on outside click.
  useEffect(() => {
    function onDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Open on mount if requested.
  useEffect(() => {
    if (autoFocus) openMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlight}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  function openMenu() {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  }

  function close() {
    setOpen(false);
    setQuery('');
  }

  function select(client) {
    onChange(normalizeId(client.id));
    close();
  }

  function clear(e) {
    e.stopPropagation();
    onChange('');
    setQuery('');
  }

  function onTriggerKeyDown(e) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu();
    }
  }

  function onInputKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) select(filtered[highlight]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function label(c) {
    return c.company || c.contact || c.email || c.id;
  }

  return (
    <div ref={containerRef} className="csc">
      <ScopedStyles />

      <div
        className="csc-trigger"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <User size={14} className="csc-lead-icon" aria-hidden />
        <span className={'csc-value' + (selected ? '' : ' csc-placeholder')}>
          {selected ? (
            <>
              {label(selected)}
              {selected.country && <span className="csc-value-sub"> · {selected.country}</span>}
            </>
          ) : (
            placeholder
          )}
        </span>
        {selected && !disabled ? (
          <button type="button" className="csc-icon-btn" onClick={clear} aria-label="Clear selection">
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={15} className="csc-chevron" aria-hidden />
        )}
      </div>

      {open && (
        <div className="csc-menu" role="dialog" aria-label="Select a client">
          <div className="csc-search">
            <Search size={14} aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Type to search…"
              aria-label="Search clients"
              aria-controls="csc-listbox"
            />
            {query && (
              <button type="button" className="csc-icon-btn" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="csc-list" role="listbox" id="csc-listbox" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="csc-empty">
                {clients.length === 0 ? 'No clients yet — add one first.' : `No match for “${query}”`}
              </div>
            ) : (
              filtered.map((c, idx) => {
                const isSelected = normalizeId(c.id) === normalizeId(value);
                const isActive = idx === highlight;
                return (
                  <div
                    key={c.id}
                    data-idx={idx}
                    role="option"
                    aria-selected={isSelected}
                    className={'csc-option' + (isActive ? ' csc-option-active' : '')}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => select(c)}
                  >
                    <div className="csc-option-main">
                      <span className="csc-option-name">{label(c)}</span>
                      {isSelected && <Check size={14} className="csc-check" aria-hidden />}
                    </div>
                    <div className="csc-option-sub">
                      {c.contact && <span>{c.contact}</span>}
                      {c.country && <span className="csc-sub-sep">{c.country}</span>}
                      {c.email && <span className="csc-sub-sep csc-email">{c.email}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="csc-count">
            {filtered.length} of {clients.length} {clients.length === 1 ? 'client' : 'clients'}
            {query.trim() === '' && clients.length > 50 && ' · type to narrow'}
          </div>
        </div>
      )}
    </div>
  );
}

// Scoped styles keyed to the app's real design tokens. All classes are `csc-`
// prefixed so nothing collides with index.css.
function ScopedStyles() {
  return (
    <style>{`
      .csc { position:relative; width:100%; }

      .csc-trigger { display:flex; align-items:center; gap:8px; width:100%;
        padding:8px 10px; min-height:38px; text-align:left; cursor:pointer;
        background:var(--color-surface); border:1px solid var(--color-border);
        border-radius:var(--radius-md); font-family:var(--font-body); font-size:13.5px;
        color:var(--color-ink); transition:border-color var(--transition); }
      .csc-trigger:hover { border-color:var(--color-ink-faint); }
      .csc-trigger:focus-visible { outline:2px solid var(--color-primary); outline-offset:1px; }
      .csc-trigger[aria-disabled="true"] { background:var(--color-surface-alt); opacity:.6; cursor:not-allowed; }

      .csc-lead-icon { color:var(--color-ink-faint); flex:0 0 auto; }
      .csc-value { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .csc-placeholder { color:var(--color-ink-faint); }
      .csc-value-sub { color:var(--color-ink-soft); }
      .csc-chevron { color:var(--color-ink-faint); flex:0 0 auto; }

      .csc-icon-btn { display:inline-flex; align-items:center; justify-content:center;
        background:none; border:0; padding:2px; cursor:pointer; color:var(--color-ink-faint);
        border-radius:var(--radius-sm); }
      .csc-icon-btn:hover { color:var(--color-ink); background:var(--color-surface-alt); }

      .csc-menu { position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:1000;
        background:var(--color-surface); border:1px solid var(--color-border);
        border-radius:var(--radius-md); box-shadow:var(--shadow-lg);
        display:flex; flex-direction:column; overflow:hidden; }

      .csc-search { display:flex; align-items:center; gap:8px; padding:8px 10px;
        border-bottom:1px solid var(--color-border); color:var(--color-ink-faint); }
      .csc-search input { flex:1; border:0; outline:0; background:transparent;
        font-family:var(--font-body); font-size:13.5px; color:var(--color-ink); }

      .csc-list { overflow-y:auto; max-height:264px; }
      .csc-empty { padding:18px 12px; text-align:center; font-size:13px; color:var(--color-ink-faint); }

      .csc-option { padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--color-border); }
      .csc-option:last-child { border-bottom:0; }
      .csc-option-active { background:var(--color-primary-soft); }
      .csc-option-main { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .csc-option-name { font-size:13.5px; font-weight:600; color:var(--color-ink);
        overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .csc-check { color:var(--color-primary); flex:0 0 auto; }
      .csc-option-sub { display:flex; flex-wrap:wrap; gap:0 6px; margin-top:2px;
        font-size:11.5px; color:var(--color-ink-soft); }
      .csc-sub-sep::before { content:'·'; margin-right:6px; color:var(--color-ink-faint); }
      .csc-email { color:var(--color-ink-faint); }

      .csc-count { padding:6px 12px; font-size:11px; color:var(--color-ink-faint);
        border-top:1px solid var(--color-border); text-align:right; }

      @media (prefers-reduced-motion: reduce) {
        .csc-trigger { transition:none; }
      }
    `}</style>
  );
}
