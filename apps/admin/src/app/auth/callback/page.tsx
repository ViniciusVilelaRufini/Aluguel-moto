'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeCode } from '@/lib/cognito';
import { useAuth } from '@/lib/auth';
import { errorText } from '@/lib/api';

function Callback() {
  const params = useSearchParams();
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const code = params.get('code');
    if (!code) {
      setError('Código de login ausente.');
      return;
    }
    exchangeCode(code)
      .then(loginWithToken)
      .then(() => router.replace('/'))
      .catch((e) => setError(errorText(e)));
  }, [params, router, loginWithToken]);

  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      {error ?? 'Concluindo o login...'}
      {error && (
        <div style={{ marginTop: 16 }}>
          <a href="/login/">Voltar para o login</a>
        </div>
      )}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={null}>
      <Callback />
    </Suspense>
  );
}
