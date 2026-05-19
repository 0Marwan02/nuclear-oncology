import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import '../App.css'; 

const Login = () => {
  const [hospitalId, setHospitalId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  const token = localStorage.getItem('auth_token');
  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, password })
      });

      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        navigate('/');
      } else {
        setError('Login failed without token');
      }
    } catch (err) {
      setError(err.message || 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="card">
        <div className="brand">
          <h1>Nuclear Oncology</h1>
          <p>Login to secure portal</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <label>
            Hospital ID
            <input
              type="text"
              value={hospitalId}
              onChange={(event) => setHospitalId(event.target.value)}
              placeholder="e.g. D1001"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="******"
              required
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default Login;
