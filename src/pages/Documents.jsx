import { useState } from 'react';
import { FileText, Download, Upload } from 'lucide-react';
import { documents } from '../data/mockData';
import Badge from '../components/Badge';
import { SearchInput, SelectInput } from '../components/Toolbar';

const TYPES = [...new Set(documents.map((d) => d.type))];

export default function Documents() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const filtered = documents.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.client.toLowerCase().includes(search.toLowerCase());
    const matchesType = !type || d.type === type;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Document Library</h1>
          <p>{documents.length} documents across all orders and clients</p>
        </div>
        <button className="btn btn-primary">
          <Upload /> Upload Document
        </button>
      </div>

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by document or client..." />
        <SelectInput value={type} onChange={setType} options={TYPES} label="All Types" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Client</th>
              <th>Linked To</th>
              <th>Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="timeline-icon" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                      <FileText />
                    </div>
                    <span className="cell-strong">{d.name}</span>
                  </div>
                </td>
                <td>{d.type}</td>
                <td>{d.client}</td>
                <td className="cell-muted">{d.linkedTo}</td>
                <td className="cell-muted">{d.date}</td>
                <td><Badge status={d.status} /></td>
                <td>
                  <button className="icon-btn" aria-label="Download">
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7}><div className="empty-state"><h4>No documents found</h4><p>Try adjusting your search or filters.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
