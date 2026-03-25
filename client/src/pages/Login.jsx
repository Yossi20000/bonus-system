import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/employee/sales');
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <h1>💰 מערכת בונוסים</h1>
          <p>ניהול מכירות ובונוסים לעובדים</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>שם משתמש</label>
            <input
              type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="הכנס שם משתמש" autoFocus required
            />
          </div>
          <div className="form-group">
            <label>סיסמה</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="הכנס סיסמה" required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
            {loading ? '...' : '🔐 כניסה'}
          </button>
        </form>
        <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '0.78rem', marginTop: '20px' }}>
          מנהל ברירת מחדל: admin / admin123
        </p>
      </div>
    </div>
  );
}
