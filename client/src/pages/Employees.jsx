import { useState, useEffect } from 'react';
import api from '../utils/api';

function EmployeeModal({ employee, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'employee', active: 1, ...employee });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      if (employee?.id) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/employees/${employee.id}`, payload);
      } else {
        await api.post('/employees', form);
      }
      onSave();
    } catch (e) { setError(e.response?.data?.error || 'שגיאה'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{employee?.id ? '✏️ עריכת עובד' : '➕ הוספת עובד'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-row">
          <div className="form-group">
            <label>שם מלא *</label>
            <input name="name" value={form.name} onChange={handle} placeholder="ישראל ישראלי" required />
          </div>
          <div className="form-group">
            <label>שם משתמש *</label>
            <input name="username" value={form.username} onChange={handle} placeholder="israel" required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{employee?.id ? 'סיסמה חדשה (ריק = ללא שינוי)' : 'סיסמה *'}</label>
            <input name="password" type="password" value={form.password} onChange={handle} placeholder="לפחות 4 תווים" />
          </div>
          <div className="form-group">
            <label>תפקיד</label>
            <select name="role" value={form.role} onChange={handle}>
              <option value="employee">עובד</option>
              <option value="admin">מנהל</option>
            </select>
          </div>
        </div>
        {employee?.id && (
          <div className="form-group">
            <label>סטטוס</label>
            <select name="active" value={form.active} onChange={handle}>
              <option value={1}>פעיל</option>
              <option value={0}>לא פעיל</option>
            </select>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>ביטול</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? '...' : employee?.id ? 'שמור' : 'הוסף עובד'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | employee
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.get('/employees');
    setEmployees(res.data);
    setLoading(false);
  };

  const deleteEmployee = async (emp) => {
    if (!confirm(`למחוק את ${emp.name}? הם לא יוכלו להתחבר יותר.`)) return;
    await api.delete(`/employees/${emp.id}`);
    load();
  };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>👥 ניהול עובדים</h2>
            <p>הוספה, עריכה ומחיקת עובדים</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('add')}>➕ הוסף עובד</button>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input placeholder="חיפוש עובד..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? <div className="loader"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>שם</th><th>שם משתמש</th><th>תפקיד</th><th>סטטוס</th><th>נוצר</th><th>פעולות</th></tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                          {emp.name.slice(0, 2)}
                        </div>
                        <strong>{emp.name}</strong>
                      </div>
                    </td>
                    <td><code style={{ background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4, fontSize: '0.85rem' }}>{emp.username}</code></td>
                    <td>
                      <span className={`badge ${emp.role === 'admin' ? 'badge-gold' : 'badge-blue'}`}>
                        {emp.role === 'admin' ? '👑 מנהל' : '👤 עובד'}
                      </span>
                    </td>
                    <td><span className={`badge ${emp.active ? 'badge-green' : 'badge-red'}`}>{emp.active ? 'פעיל' : 'לא פעיל'}</span></td>
                    <td style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>{emp.created_at?.split('T')[0]}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal(emp)}>✏️ עריכה</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteEmployee(emp)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty-state"><div className="icon">👥</div><p>לא נמצאו עובדים</p></div>}
          </div>
        )}
      </div>

      {modal && (
        <EmployeeModal
          employee={modal === 'add' ? null : modal}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
