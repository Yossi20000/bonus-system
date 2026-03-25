import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

export default function Sales({ adminView = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [filters, setFilters] = useState({
    employee_id: '', product_id: '', date_from: '', date_to: '',
    month: '', year: new Date().getFullYear()
  });

  useEffect(() => {
    if (isAdmin) {
      api.get('/employees').then(r => setEmployees(r.data));
      api.get('/products').then(r => setProducts(r.data));
    }
    load();
  }, []);

  const load = async (f = filters) => {
    setLoading(true);
    const params = {};
    if (f.employee_id) params.employee_id = f.employee_id;
    if (f.product_id) params.product_id = f.product_id;
    if (f.date_from) params.date_from = f.date_from;
    if (f.date_to) params.date_to = f.date_to;
    if (f.month) params.month = f.month;
    if (f.year) params.year = f.year;
    const res = await api.get('/sales', { params });
    setSales(res.data);
    setLoading(false);
  };

  const applyFilters = () => load(filters);
  const resetFilters = () => {
    const f = { employee_id: '', product_id: '', date_from: '', date_to: '', month: '', year: new Date().getFullYear() };
    setFilters(f); load(f);
  };

  const deleteSale = async (id) => {
    if (!confirm('למחוק מכירה זו?')) return;
    await api.delete(`/sales/${id}`);
    load();
  };

  const exportSales = async () => {
    const res = await api.get('/sales/export?type=sales', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'sales.xlsx'; a.click();
  };

  const totalBonus = sales.reduce((s, sale) => s + (sale.total_bonus || 0), 0);
  const months = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  return (
    <div>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>{isAdmin ? '💼 ניהול מכירות' : '💼 המכירות שלי'}</h2>
            <p>{sales.length} מכירות | בונוס: <strong style={{ color: 'var(--accent)' }}>₪{totalBonus.toFixed(2)}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin && <button className="btn btn-secondary" onClick={exportSales}>📥 Excel</button>}
            <Link to={isAdmin ? '/admin/new-sale' : '/employee/new-sale'} className="btn btn-primary">➕ מכירה חדשה</Link>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="filters-bar">
          <div className="filter-group">
            <label>עובד</label>
            <select value={filters.employee_id} onChange={e => setFilters(f => ({ ...f, employee_id: e.target.value }))}>
              <option value="">כולם</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>מוצר</label>
            <select value={filters.product_id} onChange={e => setFilters(f => ({ ...f, product_id: e.target.value }))}>
              <option value="">כולם</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>חודש</label>
            <select value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}>
              {months.map((m, i) => <option key={i} value={i === 0 ? '' : i}>{m || 'כל החודשים'}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>שנה</label>
            <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
              <option value="">כל השנים</option>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>מתאריך</label>
            <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value, month: '' }))} />
          </div>
          <div className="filter-group">
            <label>עד תאריך</label>
            <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value, month: '' }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={applyFilters}>🔍 סנן</button>
            <button className="btn btn-secondary btn-sm" onClick={resetFilters}>↺ אפס</button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <div className="loader"><div className="spinner" /></div> : sales.length === 0 ? (
          <div className="empty-state"><div className="icon">💼</div><p>לא נמצאו מכירות</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>תאריך</th>
                  {isAdmin && <th>עובד</th>}
                  <th>לקוח</th>
                  <th>מוצרים</th>
                  <th>בונוס</th>
                  {isAdmin && <th>פעולות</th>}
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <>
                    <tr key={sale.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}>
                      <td style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>{sale.sale_date}</td>
                      {isAdmin && <td>{sale.employee_name}</td>}
                      <td><strong>{sale.customer_name}</strong></td>
                      <td>
                        <span className="badge badge-blue">{sale.items?.length} פריטים</span>
                        <span style={{ color: 'var(--text2)', fontSize: '0.8rem', marginRight: 6 }}>
                          {sale.items?.map(i => i.product_name).join(', ').slice(0, 40)}
                          {sale.items?.map(i => i.product_name).join(', ').length > 40 ? '...' : ''}
                        </span>
                      </td>
                      <td><span className="bonus-total" style={{ fontSize: '1rem' }}>₪{(sale.total_bonus || 0).toFixed(2)}</span></td>
                      {isAdmin && (
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); deleteSale(sale.id); }}>🗑️</button>
                        </td>
                      )}
                    </tr>
                    {expanded === sale.id && (
                      <tr key={`${sale.id}-exp`}>
                        <td colSpan={isAdmin ? 6 : 5} style={{ background: 'var(--bg3)', padding: 0 }}>
                          <div style={{ padding: '12px 16px' }}>
                            <table style={{ width: '100%', fontSize: '0.85rem' }}>
                              <thead><tr><th>מוצר</th><th>כמות</th><th>מחיר מכירה</th><th>בונוס</th></tr></thead>
                              <tbody>
                                {sale.items?.map(item => (
                                  <tr key={item.id}>
                                    <td>{item.product_name}</td>
                                    <td>{item.quantity}</td>
                                    <td>₪{item.sell_price}</td>
                                    <td style={{ color: 'var(--accent)' }}>₪{(item.bonus_amount * item.quantity).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {sale.notes && <p style={{ color: 'var(--text2)', fontSize: '0.8rem', marginTop: 8 }}>📝 {sale.notes}</p>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
