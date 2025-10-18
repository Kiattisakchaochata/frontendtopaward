// app/auth/opener/page.tsx
"use client";

import React from "react";
import Head from "next/head";

export default function Opener() {
  React.useEffect(() => {
    // ทำ handshake/postMessage ถ้าจำเป็น แล้วปิด popup
    try { window.close(); } catch {}
  }, []);

  return (
    <>
      <Head>
        <meta httpEquiv="Cross-Origin-Opener-Policy" content="unsafe-none" />
      </Head>
      <p>Closing…</p>
    </>
  );
}