import React, { useState } from 'react';
import { Cloud, Mail, Lock, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onSignUp: (email: string, pass: string, name: string) => Promise<void>;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onSignUp }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        await onSignUp(email, password, name);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      {/* Background Image Setup */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/cats-bg.jpg')" }}
      />
      {/* Dark overlay to ensure the login box remains legible */}
      <div className="absolute inset-0 z-0 bg-black/30 backdrop-blur-sm" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 z-10 relative"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center mb-4">
            <Cloud className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">CloudVault</h1>
          <p className="text-sm text-text-secondary mt-1">
            {isLogin ? 'Sign in to your account' : 'Create your secure vault'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input 
                type="text" 
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-bg border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input 
              type="email" 
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-bg border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-bg border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white py-3 rounded-lg font-semibold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 mt-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-sm text-text-secondary">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 text-brand font-semibold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
