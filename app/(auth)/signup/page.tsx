'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignupUserType } from '@/lib/types';

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [userType, setUserType] = useState<SignupUserType>('passenger');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role: SignupUserType) => {
    setUserType(role);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, fullName, userType);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'role') {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Join AweTravel</CardTitle>
          <CardDescription>Choose your account type to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            onClick={() => handleRoleSelect('passenger')}
            className="w-full p-4 border-2 border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-all text-left"
          >
            <h3 className="font-semibold text-foreground">Travel as a Passenger</h3>
            <p className="text-sm text-muted-foreground mt-1">Book tickets and travel with ease</p>
          </button>

          <button
            onClick={() => handleRoleSelect('transporter')}
            className="w-full p-4 border-2 border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-all text-left"
          >
            <h3 className="font-semibold text-foreground">Operate as a Transporter</h3>
            <p className="text-sm text-muted-foreground mt-1">Manage your fleet and routes</p>
          </button>

          <p className="text-xs text-muted-foreground text-center px-2">
            Platform admins are not created on this screen. Sign up as a passenger or transporter first; an operator can promote your account to admin in Supabase when needed.
          </p>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Create Your Account</CardTitle>
        <CardDescription>
          {userType === 'passenger' && 'Start booking trips'}
          {userType === 'transporter' && 'Register your transport company'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
          )}

          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium">
              Full Name
            </label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full bg-accent hover:bg-accent-dark" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => setStep('role')}
            className="text-sm text-muted-foreground hover:text-accent w-full text-center"
          >
            ← Change account type
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
