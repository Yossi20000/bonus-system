import { useState, useEffect } from 'react';
import api from '../utils/api';

function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', catalog_price: '', sell_price: '', bonus_type: 'percent', bonus_value: 5.5, cost: '', active: 1,
    ...product, catalog_price: product?.catalog_price ?? '', sell_price: product?.sell_price ?? '', cost: product?.cost ?? ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const bonusTypeLabel = { percent: '% ממחיר המכירה', fixed: 'סכום קבוע (₪)', percent_fixed: '% קבוע מהמחיר' };

  const previewBonus = () => {
    const price = parseFloat(form.sell_price) || 0;
    const val = parseFloat(form.bonus_value) || 0;
    if (form.bonus_type === 'fixed') return val;
    return Math.round(price * val / 100 * 100) / 100;
  };

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const payload = {
        ...form,
        catalog_price: form.catalog_price ? parseFloat(form.catalog_price) : null,
        sell_price: form.sell_price ? parseFloat(form.sell_price) : null,
        cost: form.cost ? parseFloat(form.cost) : null,
        bonus_value: parseFloat(form.bonus_value),
        active: parseInt(form.active),
      };
      if (product?.id) await api.put(`/products/${product.id}`, payload);
      else await api.post('/products', payload);
      onSave();
    } catch (e) { setError(e.response?.data?.error || 'שגיאה'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{product?.id ? '✏️ עריכת מוצר' : '➕ הוספת מוצר'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label>שם מוצר *</label>
          <input name="name" value={form.name} onChange={handle} placeholder="Samsung Galaxy A56..." required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>מחיר מחירון (₪)</label>
            <input name="catalog_price" type="number" value={form.catalog_price} onChange={handle} placeholder="1999" />
          </div>
          <div className="form-group">
            <label>מחיר מכירה רגיל (₪)</label>
            <input name="sell_price" type="number" value={form.sell_price} onChange={handle} placeholder="1800" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>סוג בונוס</label>
            <select name="bonus_type" value={form.bonus_type} onChange={handle}>
              <option value="percent">אחוז ממחיר מכירה</option>
              <option value="fixed">סכום קבוע</option>
              <option value="percent_fixed">אחוז קבוע</option>
            </select>
          </div>
          <div className="form-group">
            <label>
              {form.bonus_type === 'fixed' ? 'סכום בונוס (₪)' : 'אחוז בונוס (%)'}
            </label>
            <input name="bonus_value" type="number" step="0.1" value={form.bonus_value} onChange={handle} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>עלות (₪)</label>
            <input name="cost" type="number" value={form.cost} onChange={handle} placeholder="1200" />
          </div>
          {product?.id && (
            <div className="form-group">
              <label>סטטוס</label>
              <select name="active" value={form.active} onChange={handle}>
                <option value={1}>פעיל</option>
                <option value={0}>לא פעיל</option>
              </select>
            </div>
          )}
        </div>
        {form.sell_price && (
          <div className="card card-sm" style={{ background: 'rgba(46,164,79,0.1)', border: '1px solid rgba(46,164,79,0.3)', marginBottom: 8 }}>
            <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>תצוגה מקדימה בונוס: </span>
            <strong style={{ color: 'var(--accent)' }}>
              ₪{previewBonus().toFixed(2)} {form.bonus_type !== 'fixed' && `(${form.bonus_value}% מ-₪${form.sell_price})`}
            </strong>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>ביטול</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? '...' : product?.id ? 'שמור' : 'הוסף'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.get('/products/all');
    setProducts(res.data);
    setLoading(false);
  };

  const deleteProduct = async (p) => {
    if (!confirm(`להסיר את "${p.name}" מהרשימה?`)) return;
    await api.delete(`/products/${p.id}`);
    load();
  };

  const bonusTypeLabel = { percent: '%', fixed: '₪ קבוע', percent_fixed: '% קבוע' };

  const filtered = products
    .filter(p => showInactive || p.active)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const exportProducts = async () => {
    const res = await api.get('/sales/export?type=products', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url;
    a.download = 'products.xlsx'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>📱 ניהול מוצרים</h2>
            <p>{filtered.length} מוצרים ברשימה</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={exportProducts}>📥 ייצוא Excel</button>
            <button className="btn btn-primary" onClick={() => setModal('add')}>➕ הוסף מוצר</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="חיפוש מוצר..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text2)', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            הצג לא פעילים
          </label>
        </div>
        {loading ? <div className="loader"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>מוצר</th><th>מחיר מחירון</th><th>מחיר מכירה</th><th>סוג בונוס</th><th>בונוס</th><th>סטטוס</th><th>פעולות</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const bonusPreview = p.bonus_type === 'fixed' ? p.bonus_value :
                    p.bonus_type === 'percent_fixed' ? `${p.bonus_value}%` :
                    (p.sell_price ? Math.round(p.sell_price * p.bonus_value / 100 * 100) / 100 : `${p.bonus_value}%`);
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.catalog_price ? `₪${p.catalog_price}` : <span style={{ color: 'var(--text2)' }}>—</span>}</td>
                      <td>{p.sell_price ? `₪${p.sell_price}` : <span style={{ color: 'var(--text2)' }}>—</span>}</td>
                      <td><span className="badge badge-blue">{bonusTypeLabel[p.bonus_type]}</span></td>
                      <td>
                        <span className="badge badge-green">
                          {p.bonus_type === 'fixed' ? `₪${p.bonus_value}` : p.bonus_type === 'percent_fixed' ? `${p.bonus_value}%` : `${p.bonus_value}% = ₪${bonusPreview}`}
                        </span>
                      </td>
                      <td><span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>{p.active ? 'פעיל' : 'לא פעיל'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setModal(p)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty-state"><div className="icon">📱</div><p>לא נמצאו מוצרים</p></div>}
          </div>
        )}
      </div>

      {modal && (
        <ProductModal
          product={modal === 'add' ? null : modal}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
