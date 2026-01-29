import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UserAnalytics from './pages/UserAnalytics';
import Activities from './pages/Activities';
import Computers from './pages/Computers';
import Stats from './pages/Stats';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/user-analytics" element={<UserAnalytics />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/computers" element={<Computers />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
