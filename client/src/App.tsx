import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import FundingComparison from './pages/FundingComparison';
import PriceComparison from './pages/PriceComparison';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/price-comparison" replace />} />
          <Route path="/price-comparison" element={<PriceComparison />} />
          <Route path="/funding" element={<FundingComparison />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
