"use client";

import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <title>AI Tool News Agent</title>
        <meta name="description" content="Autonomous agent that turns AI tool news into ready-to-share videos." />
      </head>
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="emblem">🛰️</div>
            <div>
              <h1>AI Tool News Studio</h1>
              <p>Daily intel to polished video in minutes.</p>
            </div>
          </header>
          <main>{children}</main>
          <footer className="app-footer">Created autonomously — deployable on Vercel</footer>
        </div>
      </body>
    </html>
  );
}
