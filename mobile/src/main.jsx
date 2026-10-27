import { Buffer } from 'buffer';

if (!globalThis.Buffer) globalThis.Buffer = Buffer; // for the Outlook .msg viewer
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import './styles.css';
import App from './App.jsx';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

// Native glue for the official Capacitor builds (no-ops in the browser and in the test APK shell).
if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  if (Capacitor.getPlatform() === 'android') StatusBar.setBackgroundColor({ color: '#643094' }).catch(() => {});
  CapApp.addListener('backButton', ({ canGoBack }) => {
    const root = ['#/app/home', '#/welcome'].includes(window.location.hash);
    if (canGoBack && !root) window.history.back(); else CapApp.exitApp();
  });
}

createRoot(document.getElementById('root')).render(<App />);
