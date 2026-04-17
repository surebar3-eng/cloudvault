import React, { useState } from 'react';
import { Cloud, Mail, Lock, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmail, signUpWithEmail, resendConfirmationEmail } from '../supabaseUtils';

interface AuthProps {
  onLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendConfirmationEmail(email);
      setMessage('A new confirmation link has been sent to your email.');
      setError(null);
    } catch (err: any) {
      setError('Failed to resend: ' + err.message);
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setShowResend(false);
    
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setMessage('Account created! Now you can sign in with your email and password.');
        setIsSignUp(false); // Automatically switch to sign-in
        setError(null);
      } else {
        await signInWithEmail(email, password);
        onLogin();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMsg = err.message || 'Authentication failed';
      
      if (errorMsg.includes('48 seconds') || errorMsg.includes('rate limit')) {
        errorMsg = '🛡️ Security Check: Please wait a minute before trying again.';
      } else if (errorMsg.includes('Email not confirmed')) {
        errorMsg = '📧 Email Not Verified: Please check your inbox (and spam) for a confirmation link.';
        setShowResend(true);
      } else if (errorMsg.includes('Email signups are disabled')) {
        errorMsg = '🚫 Sign-ups Disabled: Email registration is currently turned off in your Supabase settings. \n\nTo Fix: Go to Supabase Dashboard -> Authentication -> Providers -> Email -> Enable "Allow new users to sign up".';
      } else if (errorMsg.includes('User already registered')) {
        errorMsg = '👋 You already have an account with this email.';
        setIsSignUp(false); // Automatically switch to sign-in
      } else if (errorMsg.includes('Invalid login credentials')) {
        errorMsg = '❌ Invalid email or password. Please try again or create a new account.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-brand/5 border border-border p-8"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center mb-4">
            <Cloud className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">CloudVault</h1>
          <p className="text-sm text-text-secondary mt-1">
            {isSignUp ? 'Create your secure account' : 'Welcome back to your vault'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 font-medium"
          >
            <p>{error}</p>
            {showResend && (
              <button 
                onClick={handleResend}
                disabled={resending}
                className="mt-3 text-red-700 font-bold hover:underline flex items-center gap-1"
              >
                {resending ? 'Sending...' : '→ Resend confirmation email'}
              </button>
            )}
          </motion.div>
        )}

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 text-green-700 text-xs rounded-xl border border-green-100 font-medium"
          >
            {message}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2 ml-1 tracking-widest">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-bg border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2 ml-1 tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-bg border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all font-medium"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-brand/20 hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2 mt-6 active:translate-y-[1px]"
          >
            {loading ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-border flex flex-col items-center">
          <p className="text-xs text-text-secondary font-medium">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </p>
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="mt-2 text-brand font-bold text-xs hover:underline underline-offset-4 decoration-2"
          >
            {isSignUp ? 'Log in instead' : 'Create an account'}
          </button>
        </div>

        <p className="mt-8 text-center text-[9px] text-text-secondary leading-relaxed uppercase tracking-[0.2em] font-black opacity-20">
          Industrial Storage Protocol
        </p>
      </motion.div>
    </div>
  );
};
