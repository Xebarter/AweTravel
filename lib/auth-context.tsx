'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthError, User } from '@supabase/supabase-js';
import { fetchUserProfileWithRetry } from './fetch-user-profile';
import { supabase } from './supabase';
import { SignupUserType, UserProfile, UserType } from './types';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Display name when auto-creating an account from the login form (no separate name collected). */
function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() ?? '';
  const spaced = local.replace(/[._-]+/g, ' ').trim();
  if (!spaced) return 'Traveler';
  return spaced.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function looksLikeInvalidCredentials(error: AuthError): boolean {
  const code = error.code?.toLowerCase() ?? '';
  const msg = error.message?.toLowerCase() ?? '';
  return (
    code === 'invalid_credentials' ||
    msg.includes('invalid login credentials') ||
    msg.includes('invalid email or password')
  );
}

function looksLikeUserAlreadyExists(error: AuthError): boolean {
  const msg = error.message?.toLowerCase() ?? '';
  return msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already');
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  userType: UserType | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign in, or create a passenger account with the same email/password if none exists. Returns loaded profile when available. */
  signInWithAutoRegister: (email: string, password: string) => Promise<UserProfile | null>;
  signUp: (email: string, password: string, fullName: string, userType: SignupUserType) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Load current user + `public.users` row into React state (used on boot, auth events, and right after sign-in). */
  const syncAuthFromSession = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const {
        data: { user: nextUser },
      } = await supabase.auth.getUser();
      setUser(nextUser ?? null);
      if (!nextUser) {
        setProfile(null);
        return null;
      }

      const { profile: profileData, errorMessage } = await fetchUserProfileWithRetry(supabase, nextUser.id);
      if (errorMessage) {
        console.error('Error loading profile:', errorMessage);
        setProfile(null);
        return null;
      }
      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.error('Error syncing auth session:', error);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await syncAuthFromSession();
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncAuthFromSession();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [syncAuthFromSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) throw error;
    await supabase.auth.refreshSession();
    await syncAuthFromSession();
  };

  const signInWithAutoRegister = async (email: string, password: string) => {
    const normalized = normalizeEmail(email);

    const signInResult = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });

    if (!signInResult.error) {
      await supabase.auth.refreshSession();
      return await syncAuthFromSession();
    }

    const signInErr = signInResult.error;
    const signInMsg = signInErr.message?.toLowerCase() ?? '';
    if (
      signInMsg.includes('email not confirmed') ||
      signInErr.code === 'email_not_confirmed' ||
      signInMsg.includes('not confirmed')
    ) {
      throw signInErr;
    }

    if (!looksLikeInvalidCredentials(signInErr)) {
      throw signInErr;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalized,
      password,
    });

    if (signUpError) {
      if (looksLikeUserAlreadyExists(signUpError)) {
        throw new Error('Invalid email or password.');
      }
      throw signUpError;
    }

    if (!signUpData.user) {
      throw new Error('Could not create your account. Please try again.');
    }

    const fullName = displayNameFromEmail(normalized);
    const { error: profileError } = await supabase.from('users').insert({
      id: signUpData.user.id,
      email: normalized,
      full_name: fullName,
      user_type: 'passenger' as const,
      kyc_verified: false,
    });

    if (profileError) {
      throw profileError;
    }

    if (signUpData.session) {
      await supabase.auth.refreshSession();
      setUser(signUpData.user);
      const { profile: profileData, errorMessage } = await fetchUserProfileWithRetry(supabase, signUpData.user.id);
      if (errorMessage) {
        console.error('Error loading profile after sign-up:', errorMessage);
        setProfile(null);
      } else {
        setProfile(profileData);
      }
      return profileData;
    }

    const retry = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });
    if (retry.error) {
      throw new Error(
        'Account created. Please confirm your email if required, then sign in again from the link we sent you.',
      );
    }
    await supabase.auth.refreshSession();
    return await syncAuthFromSession();
  };

  const signUp = async (email: string, password: string, fullName: string, userType: SignupUserType) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
    });

    if (authError) throw authError;

    if (authData.user) {
      const profileRow: Record<string, unknown> = {
        id: authData.user.id,
        email: normalizeEmail(email),
        full_name: fullName,
        user_type: userType,
        kyc_verified: false,
      };
      if (userType === 'transporter') {
        profileRow.transporter_approval_status = 'pending';
      }
      const { error: profileError } = await supabase.from('users').insert(profileRow);

      if (profileError) throw profileError;
    }

    if (authData.session) {
      // Pick up user_type / approval synced into JWT via DB trigger (006_auth_jwt_role_sync)
      await supabase.auth.refreshSession();
      await syncAuthFromSession();
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userType: profile?.user_type || null,
        isLoading,
        signIn,
        signInWithAutoRegister,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
