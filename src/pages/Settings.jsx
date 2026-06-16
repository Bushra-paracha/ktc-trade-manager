import { useState } from 'react';
import { User, Shield, Link2, Mail, Globe, Server } from 'lucide-react';
import Badge from '../components/Badge';

const USERS = [
  { name: 'Imran Kassam', role: 'Director', email: 'imran@kassamtradingcompany.com' },
  { name: 'Bushra Paracha', role: 'Digital Manager / Sales Executive', email: 'ktcmktg@gmail.com' },
  { name: 'Export Manager (TBD)', role: 'Export Manager', email: '—' },
];

const ROLES = [
  { role: 'Admin / Owner', perms: 'Full access, user management, delete records' },
  { role: 'Director', perms: 'View all, approve orders, export reports' },
  { role: 'Sales Executive', perms: 'Create/edit clients, send emails, create inquiries' },
  { role: 'Export Manager', perms: 'Edit orders, upload docs, update shipment status' },
];

const CONNECTED_ACCOUNTS = [
  { name: 'LinkedIn Company Page', detail: 'pk.linkedin.com/company/kassamtradingcompany', icon: Link2, status: 'Connected', managedBy: 'Digital Manager' },
  { name: 'Website (WordPress)', detail: 'kassamtradingcompany.com/wp-admin', icon: Globe, status: 'Not Connected', managedBy: 'Digital Manager' },
  { name: 'cPanel Hosting', detail: 'kassamtradingcompany.com:2083', icon: Server, status: 'Not Connected', managedBy: 'Digital Manager' },
  { name: 'Gmail — Marketing', detail: 'ktcmktg@gmail.com', icon: Mail, status: 'Not Connected', managedBy: 'Digital Manager' },
  { name: 'Gmail — Info', detail: 'info@kassamtradingcompany.com', icon: Mail, status: 'Not Connected', managedBy: 'Digital Manager' },
];

export default function Settings() {
  const [tab, setTab] = useState('accounts');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage users, roles, and connected accounts</p>
        </div>
      </div>

      <div className="tabs">
        <div className={'tab' + (tab === 'accounts' ? ' active' : '')} onClick={() => setTab('accounts')} role="button">Connected Accounts</div>
        <div className={'tab' + (tab === 'users' ? ' active' : '')} onClick={() => setTab('users')} role="button">Users</div>
        <div className={'tab' + (tab === 'roles' ? ' active' : '')} onClick={() => setTab('roles')} role="button">Roles &amp; Permissions</div>
      </div>

      {tab === 'accounts' && (
        <div>
          <div className="card" style={{ marginBottom: 16, background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)' }}>
            <strong style={{ color: 'var(--color-warning)' }}>⚠ Security Notice</strong>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-ink)' }}>
              Passwords are never stored in this app. Connect accounts via secure OAuth where available,
              or use the company password manager for direct logins (cPanel, WordPress).
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
                  <th></th>
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
                    <td>
                      <button className="btn btn-secondary btn-sm">
                        {a.status === 'Connected' ? 'Manage' : 'Connect'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.name}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar">{u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</div>
                      <span className="cell-strong">{u.name}</span>
                    </div>
                  </td>
                  <td>{u.role}</td>
                  <td className="cell-muted">{u.email}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        </div>
      )}
    </div>
  );
}
