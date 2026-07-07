import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, User, ChevronDown, Check } from 'lucide-react';

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
  const [selectedClient, setSelectedClient] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const normalizeId = (v) => String(v ?? '').trim();

  useEffect(() => {
    const next = clients.find((c) => normalizeId(c.id) === normalizeId(value)) || null;
    setSelectedClient(next);
  }, [clients, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 50);
    return clients
      .filter((c) =>
        [c.company, c.contact, c.country, c.email, c.id]
          .some((field) => String(field || '').toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [clients, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    function onDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    if (autoFocus) openMenu();
  }, [autoFocus]);

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
    setSelectedClient(client);
    onChange?.(normalizeId(client.id));
    close();
  }

  function clear(e) {
    e.stopPropagation();
    setSelectedClient(null);
    onChange?.('');
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
    return c?.company || c?.contact || c?.email || c?.id || '';
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
        <span className={'csc-value' + (selectedClient ? '' : ' csc-placeholder')}>
          {selectedClient ? (
            <>
              {label(selectedClient)}
              {selectedClient.country && <span className="csc-value-sub"> · {selectedClient.country}</span>}
            </>
          ) : (
            placeholder
          )}
        </span>
        {selectedClient && !disabled ? (
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
                const isSelected = normalizeId(c.id) === normalizeId(selectedClient?.id);
                const isActive = idx === highlight;
                return (
                  <div
                    key={c.id}
                    data-idx={idx}
                    role="option"
                    aria-selected={isSelected}
                    className={'csc-option' + (isActive ? ' csc-option-active' : '')}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(c);
                    }}
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

function ScopedStyles() {
  return (
    <style>{`
      .csc { position: relative; width: 100%; }
      .csc-trigger {
        width: 100%; min-height: 44px; border: 1px solid var(--border, #d9e1da);
        background: var(--card, #fff); border-radius: 16px; display: flex; align-items: center;
        gap: 10px; padding: 0 14px; cursor: pointer; transition: border-color .18s ease, box-shadow .18s ease;
      }
      .csc-trigger:hover { border-color: var(--green-600, #2b7a4b); }
      .csc-trigger:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(43,122,75,.14); border-color: var(--green-600, #2b7a4b); }
      .csc-lead-icon, .csc-chevron { color: var(--muted, #7c8b81); flex: 0 0 auto; }
      .csc-value { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text, #1d2a22); }
      .csc-placeholder { color: var(--muted, #97a398); }
      .csc-value-sub { color: var(--muted, #7c8b81); }
      .csc-icon-btn {
        border: 0; background: transparent; width: 28px; height: 28px; border-radius: 10px; display: inline-grid; place-items: center; cursor: pointer; color: var(--muted, #7c8b81);
      }
      .csc-icon-btn:hover { background: rgba(16,24,18,.05); color: var(--text, #1d2a22); }
      .csc-menu {
        position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 60;
        background: var(--card, #fff); border: 1px solid var(--border, #d9e1da); border-radius: 18px;
        box-shadow: 0 18px 38px rgba(16,24,18,.10); overflow: hidden;
      }
      .csc-search {
        display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--border, #edf1ee);
      }
      .csc-search input {
        flex: 1 1 auto; border: 0; outline: 0; background: transparent; font: inherit; color: var(--text, #1d2a22);
      }
      .csc-list { max-height: 260px; overflow: auto; }
      .csc-empty { padding: 16px 14px; color: var(--muted, #7c8b81); }
      .csc-option { padding: 12px 14px; cursor: pointer; border-bottom: 1px solid var(--border, #f2f4f2); }
      .csc-option:last-child { border-bottom: 0; }
      .csc-option-active, .csc-option:hover { background: rgba(43,122,75,.08); }
      .csc-option-main { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .csc-option-name { font-weight: 600; color: var(--text, #1d2a22); }
      .csc-check { color: var(--green-600, #2b7a4b); }
      .csc-option-sub { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 8px; color: var(--muted, #7c8b81); font-size: 12px; }
      .csc-sub-sep::before { content: '•'; margin-right: 8px; color: #c8d0ca; }
      .csc-email { word-break: break-all; }
      .csc-count { padding: 10px 14px; border-top: 1px solid var(--border, #edf1ee); color: var(--muted, #7c8b81); font-size: 12px; }
    `}</style>
  );
}
