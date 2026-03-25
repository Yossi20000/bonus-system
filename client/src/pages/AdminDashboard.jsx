import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AdminDashboard() {
  const [summary, setSummary] = useState([]);
  const [stats, setStats] = useState({ total_bonus: 0, sale_count: 0, employee_count: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  useEffect(() => { load(); }, [period]);

  const load = async () => {
    setLoading(true);
    try {
      const [sumRes, empRes] = await Promise.all([
        api.get('/sales/summary', { params: { group_by: 'employee', month: period.month, year: period.year } }),
        api.get('/employees'),
      ]);
      setSummary(sumRes.data);
      const totals = sumRes.data.reduce((a, e) => ({ total_bonus: a.total_bonus + (e.total_bonus || 0), sale_count: a.sale_count + (e.sale_count || 0) }), { total_bonus: 0, sale_count: 0 });
      setStats({ ...totals, employee_count: empRes.data.filter(e => e.active && e.role === 'employee').length });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const years = [2023, 2024, 2025, 2026];

  return (
    <div>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>📊 דשבורד ניהול</h2>
            <p>סקירה כללית של מכירות ובונוסים</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={period.month} onChange={e => setPeriod(p => ({ ...p, month: +e.target.value }))} style={{ width: 120 }}>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={period.year} onChange={e => setPeriod(p => ({ ...p, year: +e.target.value }))} style={{ width: 90 }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">סה"כ בונוסים החודש</div>
          <div className="stat-value green">₪{stats.total_bonus.toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">מכירות החודש</div>
          <div className="stat-value blue">{stats.sale_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">עובדים פעילים</div>
          <div className="stat-value">{stats.employee_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ממוצע בונוס לעובד</div>
          <div className="stat-value gold">₪{summary.length ? (stats.total_bonus / summary.length).toFixed(0) : 0}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>💼 סיכום לפי עובד — {months[period.month - 1]} {period.year}</h3>
        {loading ? <div className="loader"><div className="spinner" /></div> : summary.length === 0 ? (
          <div className="empty-state"><div className="icon">📭</div><p>אין נתונים לתקופה זו</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>עובד</th><th>מכירות</th><th>הכנסות</th><th>בונוס</th></tr></thead>
              <tbody>
                {summary.map((e, i) => (
                  <tr key={e.employee_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${i * 60}, 60%, 40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                          {e.employee_name?.slice(0, 2)}
                        </div>
                        {e.employee_name}
                        {i === 0 && <span className="badge badge-gold">🏆</span>}
                      </div>
                    </td>
                    <td>{e.sale_count}</td>
                    <td>₪{(e.total_revenue || 0).toFixed(0)}</td>
                    <td><span className="bonus-total" style={{ fontSize: '1.1rem' }}>₪{(e.total_bonus || 0).toFixed(2)}</span></td>
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
