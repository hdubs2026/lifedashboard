'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-[#111111] border border-[#1f1f1f] rounded-lg">
        <div className="mb-8">
          <h1 className="text-white text-xl font-semibold tracking-tight mb-1">
            Evergreen Dashboard
          </h1>
          <p className="text-[#666] text-sm">Sign in to your personal OS</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#00ff87]/10 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10l4 4 8-8"
                  stroke="#00ff87"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-white text-sm mb-1">Check your email</p>
            <p className="text-[#666] text-xs">
              Magic link sent to <span className="text-[#999]">{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#666] text-xs uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="hunter@example.com"
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded px-3 py-2 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#00ff87] transition-colors"
              />
            </div>

            {error && (
              <p className="text-[#ff6b35] text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00ff87] text-black font-semibold text-sm py-2 rounded hover:bg-[#00e87a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
