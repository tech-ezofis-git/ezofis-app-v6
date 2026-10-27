import React, { useEffect, useRef } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { StoreProvider, useStore } from './store.jsx';
import { SESSION_EXPIRED } from './api.js';
import { BottomNav, Rail, Toast } from './ui.jsx';
import { Splash, Loader, Welcome, Login, Passcode } from './screens/Onboarding.jsx';
import Home from './screens/Home.jsx';
import { Inbox, EditRequest, Done } from './screens/Workflow.jsx';
import { Folders, FileView, Upload, Review, EditMeta } from './screens/Folders.jsx';
import { Notifications, Settings } from './screens/More.jsx';
import NewRequest from './screens/NewRequest.jsx';
import LiveWatcher from './LiveWatcher.jsx';

const ROOTS = ['/app/home', '/app/inbox', '/app/folders', '/app/settings'];

function Shell({ children }) {
  const loc = useLocation();
  const main = useRef(null);
  // Bottom tabs only on the four root screens (and the inbox list); detail screens are full-screen on phones.
  const isRoot = ROOTS.includes(loc.pathname);
  const nav = useNavigate();
  const { syncSession, showToast } = useStore();
  useEffect(() => { if (main.current) main.current.scrollTop = 0; }, [loc.pathname]);
  useEffect(() => { syncSession(); }, [syncSession]);
  // Token expired or revoked (any 401): back to sign-in.
  useEffect(() => {
    const onExpired = () => { syncSession(); showToast('Your session has ended. Sign in again.', { tone: 'bad' }); nav('/login', { replace: true }); };
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired);
  }, [nav, syncSession, showToast]);
  return (
    <div className="shell">
      <Rail />
      <main className="main" ref={main}>{children}</main>
      {isRoot ? <BottomNav /> : null}
      <Toast />
      <LiveWatcher />
    </div>
  );
}

function AppRoutes() {
  return (
    <Shell>
      <Routes>
        <Route path="home" element={<Home />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="inbox/:id" element={<Inbox />} />
        <Route path="inbox/:id/edit" element={<EditRequest />} />
        <Route path="done/:id" element={<Done />} />
        <Route path="new" element={<NewRequest />} />
        <Route path="new/:wfId" element={<NewRequest />} />
        <Route path="folders" element={<Folders />} />
        <Route path="folders/file/:id" element={<FileView />} />
        <Route path="upload" element={<Upload />} />
        <Route path="review" element={<Review />} />
        <Route path="review/edit" element={<EditMeta />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/loading" element={<Loader />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/passcode" element={<Passcode />} />
          <Route path="/app/*" element={<AppRoutes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}
