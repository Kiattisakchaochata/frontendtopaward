'use client';

import { useGoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useState } from 'react';

// ✅ ใช้ v3
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

function GoogleButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const login = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async ({ code }) => {
      try {
        setLoading(true);

        // ✅ v3: ขอ token พร้อม action
        const recaptchaToken = executeRecaptcha
          ? await executeRecaptcha('login')
          : undefined;
          console.log('recaptcha token:', recaptchaToken);

        // ส่ง token + code ไปตรวจฝั่ง server
        const r = await axios.post('/api/auth/google/callback', {
          code,
          recaptchaToken,
          action: 'login',
        });

        if (!r.data?.ok) throw new Error(r.data?.message || 'Login failed');

        const role = String(r.data?.role || 'user').toLowerCase();
        router.replace(role === 'admin' ? '/admin' : '/');
        router.refresh();
      } catch (e: any) {
        const serverMsg = e?.response?.data
          ? JSON.stringify(e.response.data)
          : (e?.message || 'Login failed');
        console.error('Google login error:', serverMsg);
        alert(serverMsg);
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setLoading(false);
      alert('Google login failed');
    },
  });

  return (
    <button
      type="button"
      aria-label="Sign in with Google"
      onClick={() => { if (!loading) login(); }}
      disabled={loading}
      className={[
        "w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-xl",
        "bg-white text-gray-800 font-medium border border-gray-200 shadow-sm",
        "hover:bg-gray-50 hover:shadow-md",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        "active:shadow-sm",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "dark:border-gray-300"
      ].join(" ")}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.8 0 7.3 1.3 10 3.9l6.7-6.7C35.9 2.7 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.2 13.4 17.6 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4H24v7.6h12.4c-.6 3.1-2.5 5.7-5.3 7.5l8.1 6.3c4.7-4.4 6.9-10.9 6.9-17.4z"/>
        <path fill="#FBBC05" d="M10.6 28.4c-.5-1.3-.7-2.8-.7-4.4s.3-3.1.7-4.4l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.7 10.5l7.9-6.1z"/>
        <path fill="#34A853" d="M24 48c6.4 0 11.9-2.1 15.8-5.8l-8.1-6.3c-2.2 1.5-5 2.3-7.7 2.3-6.4 0-11.8-3.9-13.4-9.5l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Signing in…
        </span>
      ) : (
        <span>Sign in with Google</span>
      )}
    </button>
  );
}

export default function LoginWithGoogle() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;
  console.log('reCAPTCHA site key:', siteKey);
  return (
    <GoogleReCaptchaProvider
  reCaptchaKey={siteKey}
  scriptProps={{ async: true, defer: true }}
>
      <GoogleButton />
    </GoogleReCaptchaProvider>
  );
}