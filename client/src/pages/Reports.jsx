import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Reports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupBy, setGroupBy] = useState('employee');
  const [filters, setFilters] = useState({ employee_id: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [employees, setEmployees] = useState([]);

  useEffect(() => { api.get('/employees').then(r => setEmployees(r.data.filter(e => e.active))); }, []);
  useEffect(() => { load(); }, [groupBy]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { group_by: groupBy };
      if (filters.employee_id) params.employee_id = filters.employee_id;
      if (filters.month) params.month = filters.month;
      if (filters.year) params.year = filters.year;
      const res = await api.get('/sales/summary', { params });
      setData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const applyFilters = () => load();
  const months = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const maxBonus = Math.max(...data.map(d => d.total_bonus || 0), 1);
  const totalBonus = data.reduce((s, d) => s + (d.total_bonus || 0), 0);
  const totalSales = data.reduce((s, d) => s + (d.sale_count || 0), 0);

  const exportReport = async (type) => {
    const res = await api.get(`/sales/export?type=${type}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = `report-${type}.xlsx`; a.click();
  };

  const colDefs = {
    employee: [
      { key: 'employee_name', label: 'עובד' },
      { key: 'sale_count', label: 'מכירות' },
      { key: 'total_revenue', label: 'הכנסות', format: v => `₪${(v || 0).toFixed(0)}` },
      { key: 'total_bonus', label: 'בונוס', format: v => `₪${(v || 0).toFixed(2)}`, className: 'bonus-total' },
    ],
    month: [
      { key: 'employee_name', label: 'עובד' },
      { key: 'period', label: 'חודש' },
      { key: 'sale_count', label: 'מכירות' },
      { key: 'total_revenue', label: 'הכנסות', format: v => `₪${(v || 0).toFixed(0)}` },
      { key: 'total_bonus', label: 'בונוס', format: v => `₪${(v || 0).toFixed(2)}`, className: 'bonus-total' },
    ],
    day: [
      { key: 'employee_name', label: 'עובד' },
      { key: 'period', label: 'תאריך' },
      { key: 'sale_count', label: 'מכירות' },
      { key: 'total_bonus', label: 'בונוס', format: v => `₪${(v || 0).toFixed(2)}`, className: 'bonus-total' },
    ],
    product: [
      { key: 'product_name', label: 'מוצר' },
      { key: 'total_qty', label: 'כמות' },
      { key: 'total_revenue', label: 'הכנסות', format: v => `₪${(v || 0).toFixed(0)}` },
      { key: 'total_bonus', label: 'בונוס', format: v => `₪${(v || 0).toFixed(2)}`, className: 'bonus-total' },
    ],
  };

  const cols = colDefs[groupBy] || colDefs.employee;

  return (
    <div>
      <div className="page-header">
        <div className="header-row">
          <div><h2>📈 דוחות וסיכומים</h2><p>ניתוח מכירות ובונוסים</p></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => exportReport('summary')}>📥 Excel סיכום</button>
            <button className="btn btn-secondary" onClick={() => exportReport('sales')}>📥 Excel מכירות</button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="tabs">
          {[['employee', '👥 לפי עובד'], ['month', '📅 לפי חודש'], ['day', '📆 לפי יום'], ['product', '📱 לפי מוצר']].map(([val, label]) => (
            <button key={val} className={`tab ${groupBy === val ? 'active' : ''}`} onClick={() => setGroupBy(val)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="filters-bar" style={{ marginBottom: 20 }}>
        {groupBy !== 'product' && (
          <div className="filter-group">
            <label>עובד</label>
            <select value={filters.employee_id} onChange={e => setFilters(f => ({ ...f, employee_id: e.target.value }))}>
              <option value="">כולם</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        )}
        {(groupBy === 'employee' || groupBy === 'product') && (
          <>
            <div className="filter-group">
              <label>חודש</label>
              <select value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}>
                <option value="">כל החודשים</option>
                {months.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>שנה</label>
              <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        )}
        <div style={{ alignSelf: 'flex-end' }}>
          <button className="btn btn-primary btn-sm" onClick={applyFilters}>🔍 הצג</button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">סה"כ בונוסים</div><div className="stat-value green">₪{totalBonus.toFixed(0)}</div></div>
        <div className="stat-card"><div className="stat-label">סה"כ מכירות</div><div className="stat-value blue">{totalSales}</div></div>
        <div className="stat-card"><div className="stat-label">רשומות</div><div className="stat-value">{data.length}</div></div>
      </div>

      {/* Bar chart */}
      {data.length > 0 && (groupBy === 'employee' || groupBy === 'product') && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 20 }}>📊 תרשים בונוסים</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.slice(0, 10).map((row, i) => {
              const name = row.employee_name || row.product_name || '';
              const bonus = row.total_bonus || 0;
              const pct = (bonus / maxBonus) * 100;
              const hue = [140, 200, 50, 20, 280, 160, 30, 240, 10, 100][i % 10];
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span>{name}</span>
                    <strong style={{ color: 'var(--accent)' }}>₪{bonus.toFixed(0)}</strong>
                  </div>
                  <div style={{ height: 10, background: 'var(--bg3)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `hsl(${hue}, 65%, 50%)`, borderRadius: 5, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <div className="loader"><div className="spinner" /></div> : data.length === 0 ? (
          <div className="empty-state"><div className="icon">📈</div><p>אין נתונים לתקופה זו</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    {cols.map(c => (
                      <td key={c.key} className={c.className || ''} style={c.className === 'bonus-total' ? { fontSize: '1rem' } : {}}>
                        {c.format ? c.format(row[c.key]) : (row[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
