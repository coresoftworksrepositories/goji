import React, { useState } from 'react';
import { authService } from '../services/auth';

const RegisterForm = ({ onRegister, onToggleForm }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (!formData.username.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    try {
      const result = await authService.register(
        formData.email,
        formData.username,
        formData.password,
        formData.firstName || null,
        formData.lastName || null
      );
      onRegister(result.user);
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Register</h2>
      <form className="form" onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email *"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="username"
          placeholder="Username *"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Password *"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password *"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>
        {error && <div className="error">{error}</div>}
        <p>
          Already have an account?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onToggleForm(); }}>
            Login here
          </a>
        </p>
      </form>
    </div>
  );
};

export default RegisterForm;