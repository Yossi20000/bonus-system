import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

function ProductSearch({ onSelect }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data)).catch(() => {});
    const handleClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const filtered = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 10);
    setResults(filtered);
    setOpen(filtered.length > 0);
  }, [q, products]);

  const getBonusDesc = (p) => {
    if (p.bonus_type === 'none') return 'ללא בונוס';
    if (p.bonus_type === 'sell_pct') return `${p.bonus_value}% ממחיר המכירה`;
    return `${p.bonus_value}% מהרווחיות`;
  };

  const select = (p) => { onSelect(p); setQ(''); setOpen(false); };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          onFocus={() => q && setOpen(results.length > 0)}
          placeholder="חפש מוצר להוספה..."
        />
      </div>
      {open && (
        <div className="product-search-results">
          {results.map(p => (
            <div key={p.id} className="product-result-item" onClick={() => select(p)}>
              <div className="product-result-name">{p.name}</div>
              <div className="product-result-price">
                {p.sell_price ? `מחיר ברירת מחדל: ₪${p.sell_price} | ` : ''}
                {getBonusDesc(p)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function calcItemBonus(product, sellPrice) {
  const price = parseFloat(sellPrice) || 0;
  const val = parseFloat(product.bonus_value) || 0;
  if (product.bonus_type === 'none') return 0;
  if (product.bonus_type === 'sell_pct') return Math.round(price * val / 100 * 100) / 100;
  // profit_pct
  const overhead = parseFloat(product.overhead) || 0;
  const cost = parseFloat(product.cost) || 0;
  const profit = price / 1.03 - overhead - cost;
  return Math.round(profit * val / 100 * 100) / 100;
}

function SaleItem({ item, onChange, onRemove }) {
  const bonus = calcItemBonus(item.product, item.sell_price);
  const getBonusDesc = () => {
    if (item.product.bonus_type === 'none') return 'ללא בונוס';
    if (item.product.bonus_type === 'sell_pct') return `${item.product.bonus_value}% ממכירה`;
    return `${item.product.bonus_value}% מרווח`;
  };

  return (
    <div className="sale-item-row">
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.product.name}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{getBonusDesc()}</div>
      </div>
      <div>
        <label style={{ fontSize: '0.75rem' }}>כמות</label>
        <input type="number" min="1" value={item.quantity}
          onChange={e => onChange({ ...item, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
          style={{ width: '70px' }} />
      </div>
      <div>
        <label style={{ fontSize: '0.75rem' }}>מחיר מכירה (₪)</label>
        <input type="number" value={item.sell_price}
          onChange={e => onChange({ ...item, sell_price: e.target.value })}
          placeholder={item.product.sell_price || '0'} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span className="item-bonus">₪{(bonus * item.quantity).toFixed(2)}</span>
        <button className="btn btn-danger btn-sm btn-icon" onClick={onRemove}>🗑️</button>
      </div>
    </div>
  );
}

export default function NewSale() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/employees').then(r => setEmployees(r.data.filter(e => e.active)));
    }
  }, [user]);

  const addProduct = (product) => {
    setItems(prev => [...prev, {
      id: Date.now(), product, product_id: product.id,
      quantity: 1, sell_price: product.sell_price || ''
    }]);
  };

  const updateItem = (id, updated) => setItems(prev => prev.map(i => i.id === id ? updated : i));
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const totalBonus = items.reduce((sum, item) => {
    return sum + calcItemBonus(item.product, item.sell_price) * item.quantity;
  }, 0);

  const submit = async () => {
    setError(''); setSuccess('');
    if (!customerName.trim()) return setError('חובה להכניס שם לקוח');
    if (items.length === 0) return setError('חובה להוסיף לפחות מוצר אחד');
    setLoading(true);
    try {
      const payload = {
        customer_name: customerName, sale_date: saleDate, notes,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, sell_price: parseFloat(i.sell_price) || 0 })),
        ...(user?.role === 'admin' && employeeId ? { employee_id: employeeId } : {})
      };
      const res = await api.post('/sales', payload);
      setSuccess(`✅ מכירה נוספה! בונוס: ₪${res.data.total_bonus.toFixed(2)}`);
      setCustomerName(''); setItems([]); setNotes('');
      setTimeout(() => navigate(user?.role === 'admin' ? '/admin/sales' : '/employee/sales'), 1500);
    } catch (e) { setError(e.response?.data?.error || 'שגיאה'); }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h2>🛍️ הוספת מכירה חדשה</h2>
        <p>הזן פרטי מכירה ומוצרים</p>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 16 }}>📋 פרטי מכירה</h3>
            <div className="form-row">
              <div className="form-group">
                <label>שם לקוח *</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="ישראל ישראלי" />
              </div>
              <div className="form-group">
                <label>תאריך מכירה</label>
                <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
              </div>
            </div>
            {user?.role === 'admin' && (
              <div className="form-group">
                <label>עובד</label>
                <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                  <option value="">— בחר עובד —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>הערות</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות נוספות..." />
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>📱 מוצרים</h3>
            <div style={{ marginBottom: 16 }}>
              <ProductSearch onSelect={addProduct} />
            </div>
            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <div className="icon" style={{ fontSize: '2rem' }}>📦</div>
                <p>חפש מוצר להוספה למכירה</p>
              </div>
            ) : (
              items.map(item => (
                <SaleItem key={item.id} item={item} onChange={u => updateItem(item.id, u)} onRemove={() => removeItem(item.id)} />
              ))
            )}
          </div>
        </div>
        <div>
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <h3 style={{ marginBottom: 16 }}>💰 סיכום</h3>
            <div style={{ marginBottom: 8, color: 'var(--text2)', fontSize: '0.875rem' }}>פריטים: {items.length}</div>
            <div style={{ marginBottom: 8, color: 'var(--text2)', fontSize: '0.875rem' }}>
              הכנסה: ₪{items.reduce((s, i) => s + (parseFloat(i.sell_price) || 0) * i.quantity, 0).toFixed(0)}
            </div>
            <div style={{ margin: '16px 0', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: 4 }}>סה"כ בונוס</div>
              <div className="bonus-total" style={{ fontSize: '2rem' }}>₪{totalBonus.toFixed(2)}</div>
            </div>
            {items.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {items.map(item => {
                  const bonus = calcItemBonus(item.product, item.sell_price);
                  return (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 4 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{item.product.name}</span>
                      <span style={{ color: 'var(--accent)' }}>₪{(bonus * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%', padding: 12 }} onClick={submit} disabled={loading}>
              {loading ? '...' : '✅ שמור מכירה'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
