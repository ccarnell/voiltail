'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        // Get the intended destination from URL params or default to home
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect') || '/';
        router.push(redirectTo);
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0a0b0d',
      color: '#e4e4e7',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#111215',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid #2a2b2e',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Voiltail
          </h1>
          <p style={{ color: '#94969c', fontSize: '0.875rem' }}>
            Enter password to access beta
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label 
              htmlFor="password" 
              style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem',
                color: '#e4e4e7'
              }}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#1a1b1e',
                border: '1px solid #2a2b2e',
                borderRadius: '6px',
                color: '#e4e4e7',
                fontSize: '1rem',
                outline: 'none'
              }}
              placeholder="Enter password"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              color: '#ef4444',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading || !password.trim() ? '#374151' : '#06b6d4',
              color: loading || !password.trim() ? '#9ca3af' : '#0a0b0d',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Authenticating...' : 'Access App'}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#52525b'
        }}>
          Beta access only • Contact admin for access
        </div>
      </div>
    </div>
  );
}
