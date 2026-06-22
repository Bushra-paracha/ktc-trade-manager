import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';

const CATEGORIES = ['All', 'Finance', 'Outreach', 'Operations', 'Admin', 'General'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['Todo', 'In Progress', 'Done'];

const PRIORITY_COLOR = {
  High: { bg: '#FDE8E6', text: '#B5402E' },
  Medium: { bg: '#FDF6E3', text: '#C49A2B' },
  Low: { bg: '#EEF4F8', text: '#2C6E8F' },
};

const CATEGORY_COLOR = {
  Finance: '#1A4D6E',
  Outreach: '#1A6E3A',
  Operations: '#6E4A1A',
  Admin: '#4A1A6E',
  General: '#555555',
};

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'General',
  priority: 'Medium',
  status: 'Todo',
  due_date: '',
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('All');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('status')
      .order('priority')
      .order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterCat !== 'All' && t.category !== filterCat) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, filterCat, filterStatus]);

  const counts = useMemo(() => ({
    todo: tasks.filter(t => t.status === 'Todo').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    done: tasks.filter(t => t.status === 'Done').length,
    high: tasks.filter(t => t.priority === 'High' && t.status !== 'Done').length,
  }), [tasks]);

  async function cycleStatus(task) {
    const next = task.status === 'Todo' ? 'In Progress' : task.status === 'In Progress' ? 'Done' : 'Todo';
    await supabase.from('tasks').update({ status: next, updated_at: new Date().toISOString() }).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
  }

  async function deleteTask(id) {
    if (!window.confirm('Delete this task?')) return;
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function openNew() {
    setEditTask(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(task) {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      category: task.category,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };
    if (editTask) {
      await supabase.from('tasks').update(payload).eq('id', editTask.id);
      setTasks(prev => prev.map(t => t.id === editTask.id ? { ...t, ...payload } : t));
    } else {
      const { data } = await supabase.from('tasks').insert([payload]).select().single();
      if (data) setTasks(prev => [data, ...prev]);
    }
    setSaving(false);
    setModalOpen(false);
  }

  function StatusIcon({ status }) {
    if (status === 'Done') return <CheckCircle2 size={18} color="#1A6E3A" />;
    if (status === 'In Progress') return <Clock size={18} color="#C49A2B" />;
    return <Circle size={18} color="#AAAAAA" />;
  }

  const grouped = useMemo(() => {
    const order = ['Todo', 'In Progress', 'Done'];
    return order.map(status => ({
      status,
      tasks: filtered.filter(t => t.status === status),
    })).filter(g => g.tasks.length > 0);
  }, [filtered]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Task Manager</h1>
          <p>
            {counts.todo} to do · {counts.inProgress} in progress · {counts.done} done
            {counts.high > 0 && <span style={{ color: '#B5402E', marginLeft: 8 }}>· {counts.high} high priority</span>}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className="btn btn-secondary btn-sm"
              style={{
                background: filterCat === cat ? 'var(--color-accent)' : undefined,
                color: filterCat === cat ? 'white' : undefined,
                borderColor: filterCat === cat ? 'var(--color-accent)' : undefined,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <select
          className="select-input"
          style={{ maxWidth: 160 }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Task list grouped by status */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading tasks...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <CheckCircle2 size={32} color="var(--color-ink-faint)" />
          <h4 style={{ marginTop: 12 }}>No tasks here</h4>
          <p className="cell-muted">Click "New Task" to add one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(({ status, tasks: groupTasks }) => (
            <div key={status}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <StatusIcon status={status} />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {status}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-ink-faint)', background: 'var(--color-surface-alt)', borderRadius: 10, padding: '1px 8px' }}>
                  {groupTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {groupTasks.map(task => {
                  const isExpanded = expandedId === task.id;
                  const isDone = task.status === 'Done';
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;

                  return (
                    <div
                      key={task.id}
                      className="card"
                      style={{
                        padding: '12px 14px',
                        opacity: isDone ? 0.6 : 1,
                        border: isOverdue ? '1px solid var(--color-danger)' : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {/* Status toggle */}
                        <button
                          onClick={() => cycleStatus(task)}
                          className="icon-btn"
                          title={`Mark as ${task.status === 'Todo' ? 'In Progress' : task.status === 'In Progress' ? 'Done' : 'Todo'}`}
                          style={{ marginTop: 1, flexShrink: 0 }}
                        >
                          <StatusIcon status={task.status} />
                        </button>

                        {/* Main content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span
                              className="cell-strong"
                              style={{
                                textDecoration: isDone ? 'line-through' : undefined,
                                cursor: 'pointer',
                                fontSize: 14,
                              }}
                              onClick={() => setExpandedId(isExpanded ? null : task.id)}
                            >
                              {task.title}
                            </span>
                            {/* Priority badge */}
                            <span style={{
                              fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                              background: PRIORITY_COLOR[task.priority]?.bg,
                              color: PRIORITY_COLOR[task.priority]?.text,
                            }}>
                              {task.priority}
                            </span>
                            {/* Category badge */}
                            <span style={{
                              fontSize: 10.5, padding: '1px 7px', borderRadius: 10,
                              background: 'var(--color-surface-alt)',
                              color: CATEGORY_COLOR[task.category] || '#555',
                              fontWeight: 600,
                            }}>
                              {task.category}
                            </span>
                            {/* Due date */}
                            {task.due_date && (
                              <span style={{ fontSize: 11, color: isOverdue ? 'var(--color-danger)' : 'var(--color-ink-faint)' }}>
                                {isOverdue ? '⚠ Overdue · ' : ''}Due {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Expanded description */}
                          {isExpanded && task.description && (
                            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-ink-soft)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                              {task.description}
                            </p>
                          )}
                          {task.description && (
                            <button
                              className="cell-muted"
                              style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}
                              onClick={() => setExpandedId(isExpanded ? null : task.id)}
                            >
                              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              {isExpanded ? 'Hide details' : 'Show details'}
                            </button>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button className="icon-btn" onClick={() => openEdit(task)} title="Edit">
                            <AlertCircle size={14} />
                          </button>
                          <button className="icon-btn" onClick={() => deleteTask(task.id)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTask ? 'Edit Task' : 'New Task'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormRow label="Title *">
            <input
              className="select-input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Collect buyer purchase orders"
              autoFocus
            />
          </FormRow>

          <FormRow label="Details (optional)">
            <textarea
              className="select-input"
              rows={4}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Add context, links, or next steps..."
            />
          </FormRow>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormRow label="Category">
              <select className="select-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormRow>
            <FormRow label="Priority">
              <select className="select-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormRow>
            <FormRow label="Status">
              <select className="select-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormRow>
            <FormRow label="Due Date">
              <input
                type="date"
                className="select-input"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </FormRow>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
            >
              {saving ? 'Saving...' : editTask ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}
