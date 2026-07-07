import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  Trophy,
  DollarSign,
  Snowflake,
  CalendarClock,
  CheckCircle2,
  Search,
  GripVertical,
  ExternalLink,
  X,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { formatUSD, statusBadgeClass } from '../data/mockData';
import { useClients } from '../hooks/useClients';

// Ordered pipeline stages. These mirror the `status` values already used across
// Clients.jsx and useAnalytics.js, so the board stays in sync with the rest of the app.
const STAGES = ['New', 'Contacted', 'Engaged', 'Negotiating', 'Won', 'Lost', 'Dormant'];
// Stages where a lead is still "in play" — cold detection and the open-lead count only apply here.
const ACTIVE_STAGES = ['New', 'Contacted', 'Engaged', 'Negotiating'];

const STAGE_ACCENT = {
  New: '#2C6E8F',
  Contacted: '#2C6E8F',
  Engaged: '#C49A2B',
  Negotiating: '#C49A2B',
  Won: '#2D7A4F',
  Lost: '#B5402E',
  Dormant: '#97A199',
};

function daysSince(dateStr) {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Pipeline() {
  const { clients, loading, error, updateClient } = useClients();

  const [query, setQuery] = useState('');
  const [coldDays, setColdDays] = useState(14);
  const [staleOnly, setStaleOnly] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [msg, setMsg] = useState(null); // { tone: 'error' | 'success', text }

  function isStale(c) {
    if (!ACTIVE_STAGES.includes(c.status)) return false;
    const d = daysSince(c.last_contacted_at);
    return d === null || d > coldDays;
  }

  function isFollowupDue(c) {
    const d = daysUntil(c.next_followup_at);
    return d !== null && d <= 0;
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (staleOnly && !isStale(c)) return false;
      if (!q) return true;
      return (
        (c.company || '').toLowerCase().includes(q) ||
        (c.contact || '').toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, query, staleOnly, coldDays]);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s, []]));
    for (const c of filtered) {
      if (map[c.status]) map[c.status].push(c);
      else (map[c.status] = map[c.status] || []).push(c);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  // Top-line numbers, computed from the full list (not the filtered view) so the
  // stat cards always describe the real state of the pipeline.
  const stats = useMemo(() => {
    const open = clients.filter((c) => ACTIVE_STAGES.includes(c.status));
    const attention = open.filter((c) => isStale(c) || isFollowupDue(c));
    const won = clients.filter((c) => c.status === 'Won');
    const booked = won.reduce((sum, c) => sum + (Number(c.revenue) || 0), 0);
    return { open: open.length, attention: attention.length, won: won.length, booked };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, coldDays]);

  async function moveLead(id, toStage) {
    const lead = clients.find((c) => c.id === id);
    if (!lead || lead.status === toStage) return;
    const { error: err } = await updateClient(id, { status: toStage });
    if (err) setMsg({ tone: 'error', text: `Couldn't move lead: ${err}` });
  }

  async function markContactedToday(id) {
    const { error: err } = await updateClient(id, { last_contacted_at: new Date().toISOString() });
    if (err) setMsg({ tone: 'error', text: `Couldn't update: ${err}` });
    else setMsg({ tone: 'success', text: 'Marked contacted today.' });
  }

  async function setFollowup(id, value) {
    const { error: err } = await updateClient(id, { next_followup_at: value || null });
    if (err) {
      // Most likely cause: the optional column hasn't been added yet.
      setMsg({
        tone: 'error',
        text: 'Follow-up dates need the next_followup_at column. Run the one-line SQL from setup, then try again.',
      });
    }
  }

  return (
    <div>
      <ScopedStyles />

      <div className="page-header">
        <div>
          <h1>Pipeline</h1>
          <p>
            {stats.open} open {stats.open === 1 ? 'lead' : 'leads'} · drag a card to move a stage, or
            use the stage menu on mobile
          </p>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard icon={Users} label="Open leads" value={stats.open} accent="#2C6E8F" />
        <StatCard
          icon={AlertTriangle}
          label="Needs attention"
          value={stats.attention}
          delta={stats.attention ? 'cold or follow-up due' : 'all current'}
          deltaDirection={stats.attention ? 'down' : 'up'}
          accent="#B5790A"
        />
        <StatCard icon={Trophy} label="Won" value={stats.won} accent="#2D7A4F" />
        <StatCard icon={DollarSign} label="Booked revenue" value={formatUSD(stats.booked)} accent="#1A4D2E" />
      </div>

      {msg && (
        <div className={`pl-banner pl-banner-${msg.tone}`}>
          <span>{msg.text}</span>
          <button className="icon-btn" onClick={() => setMsg(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="pl-controls">
        <div className="pl-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search company, contact, or country"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search leads"
          />
        </div>

        <label className="pl-field">
          Cold after
          <select
            className="select-input"
            value={coldDays}
            onChange={(e) => setColdDays(Number(e.target.value))}
            aria-label="Days without contact before a lead is cold"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
          </select>
        </label>

        <button
          className={'btn btn-sm ' + (staleOnly ? 'btn-primary' : 'btn-secondary')}
          onClick={() => setStaleOnly((v) => !v)}
        >
          <Snowflake size={15} /> {staleOnly ? 'Showing cold only' : 'Cold leads only'}
        </button>
      </div>

      {loading && <div className="empty-state">Loading your pipeline…</div>}
      {error && <div className="empty-state">Couldn't load leads: {error}</div>}

      {!loading && !error && (
        <div className="pl-board">
          {STAGES.map((stage) => {
            const cards = byStage[stage] || [];
            const value = cards.reduce((sum, c) => sum + (Number(c.revenue) || 0), 0);
            return (
              <div
                key={stage}
                className={'pl-col' + (dragOverStage === stage ? ' pl-col-over' : '')}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverStage !== stage) setDragOverStage(stage);
                }}
                onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
                onDrop={() => {
                  if (draggedId) moveLead(draggedId, stage);
                  setDraggedId(null);
                  setDragOverStage(null);
                }}
              >
                <div className="pl-col-head">
                  <span className="pl-col-dot" style={{ background: STAGE_ACCENT[stage] }} />
                  <span className="pl-col-title">{stage}</span>
                  <span className="pl-col-count">{cards.length}</span>
                </div>
                {value > 0 && <div className="pl-col-value">{formatUSD(value)}</div>}

                <div className="pl-col-body">
                  {cards.length === 0 ? (
                    <div className="pl-empty">No leads here yet</div>
                  ) : (
                    cards.map((c) => (
                      <LeadCard
                        key={c.id}
                        c={c}
                        stale={isStale(c)}
                        onDragStart={() => setDraggedId(c.id)}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDragOverStage(null);
                        }}
                        onMove={(toStage) => moveLead(c.id, toStage)}
                        onContacted={() => markContactedToday(c.id)}
                        onFollowup={(v) => setFollowup(c.id, v)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeadCard({ c, stale, onDragStart, onDragEnd, onMove, onContacted, onFollowup }) {
  const since = daysSince(c.last_contacted_at);
  const untilFollowup = daysUntil(c.next_followup_at);
  const products = Array.isArray(c.products_interest) ? c.products_interest : [];

  return (
    <div
      className={'pl-card' + (stale ? ' pl-card-stale' : '')}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="pl-card-top">
        <GripVertical size={15} className="pl-grip" aria-hidden />
        <Link to={`/clients/${c.id}`} className="pl-card-name">
          {c.company || 'Untitled lead'}
          <ExternalLink size={12} />
        </Link>
      </div>

      <div className="pl-card-meta">
        {c.contact && <span>{c.contact}</span>}
        {c.country && <span className="pl-dot-sep">{c.country}</span>}
      </div>

      {products.length > 0 && (
        <div className="pl-tags">
          {products.slice(0, 3).map((p) => (
            <span key={p} className="badge badge-gray">
              {p}
            </span>
          ))}
          {products.length > 3 && <span className="pl-more">+{products.length - 3}</span>}
        </div>
      )}

      <div className="pl-card-signals">
        {c.est_volume && <span className="pl-vol">{c.est_volume}</span>}
        {typeof c.score === 'number' && <span className="pl-score">Score {c.score}</span>}
        {stale && (
          <span className="pl-chip pl-chip-cold">
            <Snowflake size={12} />
            {since === null ? 'Never contacted' : `${since}d cold`}
          </span>
        )}
        {untilFollowup !== null && (
          <span className={'pl-chip ' + (untilFollowup <= 0 ? 'pl-chip-due' : 'pl-chip-soft')}>
            <CalendarClock size={12} />
            {untilFollowup <= 0
              ? untilFollowup === 0
                ? 'Follow up today'
                : `Overdue ${Math.abs(untilFollowup)}d`
              : `Follow up in ${untilFollowup}d`}
          </span>
        )}
      </div>

      <div className="pl-card-actions">
        <select
          className="select-input pl-move"
          value={c.status}
          onChange={(e) => onMove(e.target.value)}
          aria-label={`Move ${c.company || 'lead'} to a stage`}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="icon-btn" title="Mark contacted today" onClick={onContacted}>
          <CheckCircle2 size={16} />
        </button>
        <input
          type="date"
          className="pl-date"
          value={c.next_followup_at ? String(c.next_followup_at).slice(0, 10) : ''}
          min={todayISO()}
          onChange={(e) => onFollowup(e.target.value)}
          title="Set next follow-up date"
          aria-label="Next follow-up date"
        />
      </div>
    </div>
  );
}

// Scoped styles: every class is prefixed `pl-` so nothing collides with index.css,
// and all colors/radii come from the existing design tokens.
function ScopedStyles() {
  return (
    <style>{`
      .pl-banner { display:flex; align-items:center; justify-content:space-between; gap:12px;
        padding:10px 14px; border-radius:var(--radius-md); margin-bottom:16px; font-size:14px; }
      .pl-banner-error { background:var(--color-danger-soft); color:var(--color-danger); }
      .pl-banner-success { background:var(--color-success-soft); color:var(--color-success); }

      .pl-controls { display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-bottom:16px; }
      .pl-search { display:flex; align-items:center; gap:8px; padding:0 12px; flex:1; min-width:220px;
        background:var(--color-surface); border:1px solid var(--color-border);
        border-radius:var(--radius-md); color:var(--color-ink-faint); }
      .pl-search input { border:0; outline:0; background:transparent; padding:10px 0; width:100%;
        font-family:var(--font-body); font-size:14px; color:var(--color-ink); }
      .pl-field { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--color-ink-soft); }

      .pl-board { display:flex; gap:14px; overflow-x:auto; padding-bottom:12px;
        scroll-snap-type:x proximity; }
      .pl-col { flex:0 0 268px; background:var(--color-surface-alt);
        border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:12px;
        scroll-snap-align:start; transition:border-color var(--transition), background var(--transition); }
      .pl-col-over { border-color:var(--color-primary); background:var(--color-primary-soft); }
      .pl-col-head { display:flex; align-items:center; gap:8px; margin-bottom:2px; }
      .pl-col-dot { width:8px; height:8px; border-radius:50%; flex:0 0 auto; }
      .pl-col-title { font-family:var(--font-display); font-weight:600; font-size:15px; color:var(--color-ink); }
      .pl-col-count { margin-left:auto; font-size:12px; font-weight:600; color:var(--color-ink-soft);
        background:var(--color-surface); border:1px solid var(--color-border);
        border-radius:999px; padding:1px 9px; }
      .pl-col-value { font-family:var(--font-mono); font-size:12px; color:var(--color-primary); margin-bottom:8px; }
      .pl-col-body { display:flex; flex-direction:column; gap:10px; min-height:40px; margin-top:8px; }
      .pl-empty { font-size:13px; color:var(--color-ink-faint); text-align:center; padding:16px 8px; }

      .pl-card { background:var(--color-surface); border:1px solid var(--color-border);
        border-radius:var(--radius-md); padding:11px 12px; box-shadow:var(--shadow-sm);
        cursor:grab; transition:box-shadow var(--transition), transform var(--transition); }
      .pl-card:hover { box-shadow:var(--shadow-md); }
      .pl-card:active { cursor:grabbing; }
      .pl-card-stale { border-left:3px solid var(--color-warning); }

      .pl-card-top { display:flex; align-items:center; gap:6px; }
      .pl-grip { color:var(--color-ink-faint); flex:0 0 auto; }
      .pl-card-name { display:inline-flex; align-items:center; gap:5px; font-weight:600; font-size:14px;
        color:var(--color-ink); text-decoration:none; }
      .pl-card-name svg { color:var(--color-ink-faint); }
      .pl-card-name:hover { color:var(--color-primary); }
      .pl-card-meta { font-size:12.5px; color:var(--color-ink-soft); margin:3px 0 0 21px; }
      .pl-dot-sep::before { content:'·'; margin:0 6px; color:var(--color-ink-faint); }

      .pl-tags { display:flex; flex-wrap:wrap; gap:5px; margin:8px 0 0 21px; }
      .pl-more { font-size:11px; color:var(--color-ink-faint); align-self:center; }

      .pl-card-signals { display:flex; flex-wrap:wrap; gap:6px; margin:9px 0 0 21px; align-items:center; }
      .pl-vol { font-family:var(--font-mono); font-size:11.5px; color:var(--color-ink-soft); }
      .pl-score { font-size:11.5px; color:var(--color-ink-faint); }
      .pl-chip { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600;
        padding:2px 7px; border-radius:999px; }
      .pl-chip-cold { background:var(--color-warning-soft); color:var(--color-warning); }
      .pl-chip-due { background:var(--color-danger-soft); color:var(--color-danger); }
      .pl-chip-soft { background:var(--color-info-soft); color:var(--color-info); }

      .pl-card-actions { display:flex; align-items:center; gap:6px; margin:11px 0 0 21px; }
      .pl-move { flex:1; min-width:0; font-size:12.5px; padding:5px 8px; }
      .pl-date { border:1px solid var(--color-border); border-radius:var(--radius-sm);
        padding:4px 6px; font-family:var(--font-body); font-size:12px; color:var(--color-ink-soft);
        background:var(--color-surface); }

      @media (prefers-reduced-motion: reduce) {
        .pl-col, .pl-card { transition:none; }
      }
    `}</style>
  );
}
