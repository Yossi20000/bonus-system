import { useState, useEffect } from 'react';
import api from '../utils/api';

function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', catalog_price: '', sell_price: '', bonus_type: 'profit_pct',
    bonus_value: 5.5, cost: '', overhead: 100, active: 1,
    ...product,
    catalog_price: product?.catalog_price ?? '',
    sell_price: product?.sell_price ?? '',
    cost: product?.cost ?? '',
    overhead: product?.overhead ?? 100,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const previewBonus = () => {
    const price = parseFloat(form.sell_price) || 0;
    const val = parseFloat(form.bonus_value) || 0;
    const cost = parseFloat(form.cost) || 0;
    const overhead = parseFloat(form.overhead) || 0;
    if (form.bonus_type === 'profit_pct') {
      const profit = price / 1.03 - overhead - cost;
      return Math.round(profit * val / 100 * 100) / 100;
    } else if (form.bonus_type === 'sell_pct') {
      return Math.round(price * val / 100 * 100) / 100;
    }
    return 0;
  };

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const payload = {
        ...form,
        catalog_price: form.catalog_price ? parseFloat(form.catalog_price) : null,
        sell_price: form.sell_price ? parseFloat(form.sell_price) : null,
        cost: form.cost ? parseFloat(form.cost) : null,
        overhead: parseFloat(form.overhead) || 0,
        bonus_value: parseFloat(form.bonus_value),
        active: parseInt(form.active),
      };
      if (product?.id) await api.put(`/products/${product.id}`, payload);
      else await api.post('/products', payload);
      onSave();
    } catch (e) { setError(e.response?.data?.error || 'שגיאה'); }
    setLoading(false);
  };

  const bonusTypeLabels = {
    profit_pct: '% מהרווחיות (מחיר÷1.03 − עלויות − עלות)',
    sell_pct: '% ממחיר המכירה (מגנים וכד\')',
    none: 'ללא בונוס',
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
          <input name="name" value={form.name} onChange={handle} placeholder="Samsung Galaxy..." required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>מחיר מחירון (₪)</label>
            <input name="catalog_price" type="number" value={form.catalog_price} onChange={handle} placeholder="1999" />
          </div>
          <div className="form-group">
            <label>מחיר מכירה ברירת מחדל (₪)</label>
            <input name="sell_price" type="number" value={form.sell_price} onChange={handle} placeholder="1800" />
          </div>
        </div>
        <div className="form-group">
          <label>סוג חישוב בונוס</label>
          <select name="bonus_type" value={form.bonus_type} onChange={handle}>
            {Object.entries(bonusTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {form.bonus_type !== 'none' && (
          <div className="form-row">
            <div className="form-group">
              <label>אחוז בונוס (%)</label>
              <input name="bonus_value" type="number" step="0.1" value={form.bonus_value} onChange={handle} />
            </div>
            {form.bonus_type === 'profit_pct' && (
              <>
                <div className="form-group">
                  <label>עלות מוצר (₪)</label>
                  <input name="cost" type="number" value={form.cost} onChange={handle} placeholder="298" />
                </div>
                <div className="form-group">
                  <label>עלויות נלוות (₪)</label>
                  <input name="overhead" type="number" value={form.overhead} onChange={handle} placeholder="100" />
                </div>
              </>
            )}
          </div>
        )}
        {form.sell_price && form.bonus_type !== 'none' && (
          <div className="card card-sm" style={{ background: 'rgba(46,164,79,0.1)', border: '1px solid rgba(46,164,79,0.3)', marginBottom: 8 }}>
            <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>תצוגת בונוס לפי מחיר מכירה ₪{form.sell_price}: </span>
            <strong style={{ color: 'var(--accent)' }}>₪{previewBonus().toFixed(2)}</strong>
          </div>
        )}
        {product?.id && (
          <div className="form-group" style={{ marginTop: 8 }}>
            <label>סטטוס</label>
            <select name="active" value={form.active} onChange={handle}>
              <option value={1}>פעיל</option>
              <option value={0}>לא פעיל</option>
            </select>
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
    if (!confirm(`להסיר את "${p.name}"?`)) return;
    await api.delete(`/products/${p.id}`);
    load();
  };

  const exportProducts = async () => {
    const res = await api.get('/sales/export?type=products', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'products.xlsx'; a.click();
  };

  const getBonusDisplay = (p) => {
    if (p.bonus_type === 'none') return <span className="badge badge-gray">ללא בונוס</span>;
    if (p.bonus_type === 'sell_pct') return <span className="badge badge-blue">{p.bonus_value}% מהמכירה</span>;
    // profit_pct
    if (p.sell_price) {
      const profit = p.sell_price / 1.03 - (p.overhead || 0) - (p.cost || 0);
      const bonus = Math.round(profit * p.bonus_value / 100 * 100) / 100;
      return <span className="badge badge-green">{p.bonus_value}% רווח = ₪{bonus}</span>;
    }
    return <span className="badge badge-green">{p.bonus_value}% מהרווחיות</span>;
  };

  const filtered = products
    .filter(p => showInactive || p.active)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>📱 ניהול מוצרים</h2>
            <p>{filtered.length} מוצרים</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={exportProducts}>📥 Excel</button>
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
                <tr><th>מוצר</th><th>מחיר מכירה</th><th>עלות</th><th>עלויות נלוות</th><th>בונוס</th><th>סטטוס</th><th>פעולות</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.sell_price ? `₪${p.sell_price}` : <span style={{ color: 'var(--text2)' }}>—</span>}</td>
                    <td>{p.cost ? `₪${p.cost}` : <span style={{ color: 'var(--text2)' }}>—</span>}</td>
                    <td>{p.overhead ? `₪${p.overhead}` : '—'}</td>
                    <td>{getBonusDisplay(p)}</td>
                    <td><span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>{p.active ? 'פעיל' : 'לא פעיל'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal(p)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
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
