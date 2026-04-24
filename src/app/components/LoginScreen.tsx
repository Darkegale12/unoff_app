import { AlertCircle, Eye, EyeOff, Lock, Shield, User } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export function LoginScreen() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [passcode, setPasscode] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setTimeout(() => {
            const ok = login(username.trim(), passcode);
            if (!ok) setError('Invalid username or passcode. Please try again.');
            setLoading(false);
        }, 600);
    };

    return (
        <div
            className="h-screen w-screen flex items-center justify-center overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0d2e4a 70%, #0f172a 100%)',
            }}
        >
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }}
                />
                <div
                    className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #1d4ed8, transparent)' }}
                />
                <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5"
                    style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }}
                />
            </div>

            {/* Card */}
            <div
                className="relative z-10 w-full max-w-md mx-4"
                style={{
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '24px',
                    boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
                }}
            >
                {/* Header */}
                <div className="px-8 pt-10 pb-6 text-center">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                        style={{
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
                        }}
                    >
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">Vector Disease Control</h1>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        Secure access portal — sign in to continue
                    </p>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 32px' }} />

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
                    {/* Error */}
                    {error && (
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
                            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Username */}
                    <div>
                        <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                            Username
                        </label>
                        <div className="relative">
                            <User
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                style={{ color: 'rgba(255,255,255,0.4)' }}
                            />
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Enter your username"
                                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-opacity-40 outline-none transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: 'white',
                                }}
                                onFocus={e => (e.target.style.borderColor = 'rgba(96,165,250,0.6)')}
                                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                            />
                        </div>
                    </div>

                    {/* Passcode */}
                    <div>
                        <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                            Passcode
                        </label>
                        <div className="relative">
                            <Lock
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                style={{ color: 'rgba(255,255,255,0.4)' }}
                            />
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={passcode}
                                onChange={e => setPasscode(e.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="Enter your passcode"
                                className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: 'white',
                                }}
                                onFocus={e => (e.target.style.borderColor = 'rgba(96,165,250,0.6)')}
                                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
                                style={{ color: 'rgba(255,255,255,0.4)' }}
                            >
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
                        style={{
                            background: loading
                                ? 'rgba(37,99,235,0.5)'
                                : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            boxShadow: loading ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                {/* Footer */}
                <div className="px-8 pb-8 text-center">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        Vector Disease Control System • Secure Access
                    </p>
                </div>
            </div>
        </div>
    );
}
