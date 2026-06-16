import { useState, useEffect } from 'react';
import { Shield, Link2, Mail, Globe, Server, Loader2, AlertCircle } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabaseClient';

const ROLES = [
  { role: 'Admin / Owner', perms: 'Full access, user management, delete records' },
  { role: 'Director', perms: 'View all, approve orders, export reports' },
  { role: 'Sales Executive', perms: 'Create/edit clients, send emails, create inquiries' },
  { role: 'Export Manager', perms: 'Edit orders, upload docs, update shipment status' },
];

const ROLE_OPTIONS = ['Admin / Owner', 'Director', 'Sales Executive', 'Export Manager'];

const CONNECTED_ACCOUNTS = [
  { name: 'LinkedIn Company Page', detail: 'pk.linkedin.com/company/kassamtradingcompany', icon: Link2, status: 'Connected', managedBy: 'Digital Manager' },
  { name: 'Website (WordPress)', detail: 'kassamtradingcompany.com/wp-admin', icon: Globe, status: 'Not Connected', managedBy: 'Digital Manager' },
  { name: 'cPanel Hosting', detail: 'kassamtradingcompany.com:2083', icon: Server, status: 'Not Connected', managedBy: 'Digital Manager' },
  { name: 'Gmail — Marketing', detail: 'ktcmktg@gmail.com', icon: Mail, status: 'Not Connected', managedBy: 'Digital Manager' },
  { name: 'Gmail — Info', detail: 'info@kassamtradingcompany.com', icon: Mail, status: 'Not Connected', managedBy: 'Digital Manager' },
];

function initials(name, email) {
  if (name) return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  if (email) return email[0].toUpperCase();
  return '?';
}

export default function Settings() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', role: '' });
  const [saving, setSaving] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    if (error) setError(error.message);
    else setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function openEdit(user) {
    setEditingUser(user);
    setEditForm({ full_name: user.full_name || '', role: user.role || 'Sales Executive' });
  }

  async function handleSaveUser(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editForm.full_name, role: editForm.role })
      .eq('id', editingUser.id);
    setSaving(false);
    if (error) {
      alert(`Couldn't save: ${error.message}`);
      return;
    }
    setEditingUser(null);
    fetchUsers();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage users, roles, and reference info for connected accounts</p>
        </div>
      </div>

      <div className="tabs">
        <div className={'tab' + (tab === 'users' ? ' active' : '')} onClick={() => setTab('users')} role="button">Users</div>
        <div className={'tab' + (tab === 'roles' ? ' active' : '')} onClick={() => setTab('roles')} role="button">Roles &amp; Permissions</div>
        <div className={'tab' + (tab === 'accounts' ? ' active' : '')} onClick={() => setTab('accounts')} role="button">Connected Accounts</div>
      </div>

      {tab === 'users' && (
        <div>
          {error && (
            <div className="card" style={{ marginBottom: 16, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <AlertCircle size={18} color="var(--color-danger)" />
                <div>
                  <strong style={{ color: 'var(--color-danger)' }}>Couldn't load users</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 13 }}>{error}</p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading users...</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar">{initials(u.full_name, u.email)}</div>
                          <span className="cell-strong">{u.full_name || '(no name set)'}</span>
                        </div>
                      </td>
                      <td>{u.role}</td>
                      <td className="cell-muted">{u.email}</td>
                      <td className="cell-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={5}><div className="empty-state"><h4>No users yet</h4><p>Add team members via Supabase Authentication.</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p className="cell-muted" style={{ marginTop: 12, fontSize: 12.5 }}>
            To add a new team member, create their login in Supabase → Authentication → Users. Their name and role can then be set here.
          </p>
        </div>
      )}

      {tab === 'roles' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Key Permissions</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => (
                <tr key={r.role}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="timeline-icon" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                        <Shield />
                      </div>
                      <span className="cell-strong">{r.role}</span>
                    </div>
                  </td>
                  <td>{r.perms}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cell-muted" style={{ marginTop: 12, fontSize: 12.5 }}>
            Note: roles are currently informational. Every logged-in user has the same data access today — permission enforcement per role can be added later if needed.
          </p>
        </div>
      )}

      {tab === 'accounts' && (
        <div>
          <div className="card" style={{ marginBottom: 16, background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)' }}>
            <strong style={{ color: 'var(--color-warning)' }}>⚠ Security Notice</strong>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-ink)' }}>
              Passwords are never stored in this app. This is a reference list of KTC's external accounts —
              actual logins are managed via your company password manager or directly with each provider.
            </p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Access Point</th>
                  <th>Status</th>
                  <th>Managed By</th>
                </tr>
              </thead>
              <tbody>
                {CONNECTED_ACCOUNTS.map((a) => (
                  <tr key={a.name}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="timeline-icon" style={{ background: 'var(--color-surface-alt)', color: 'var(--color-ink-soft)' }}>
                          <a.icon />
                        </div>
                        <span className="cell-strong">{a.name}</span>
                      </div>
                    </td>
                    <td className="cell-muted">{a.detail}</td>
                    <td><Badge status={a.status === 'Connected' ? 'Active' : 'Pending'}>{a.status}</Badge></td>
                    <td>{a.managedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
        <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Full Name
            <input className="select-input" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Role
            <select className="select-input" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
