import React, { useState } from 'react';
import { authService } from '../services/auth';

const LoginForm = ({ onLogin, onToggleForm }) => {
  const [formData, setFormData] = useState({
    login: '', // Can be email or username
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authService.login(formData.login, formData.password);
      onLogin(result.user);
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Login</h2>
      <form className="form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="login"
          placeholder="Email or Username"
          value={formData.login}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <div className="error">{error}</div>}
        <p>
          Don't have an account?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onToggleForm(); }}>
            Register here
          </a>
        </p>
      </form>
    </div>
  );
};

export default LoginForm;