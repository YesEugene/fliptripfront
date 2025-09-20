import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import FlipTripPreviewPage from './pages/FlipTripPreviewPage';
import PaymentPage from './pages/PaymentPage';
import SuccessPage from './pages/SuccessPage';
import ItineraryPage from './pages/ItineraryPage';
import ExampleTripPage from './pages/ExampleTripPage';
import './index.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/preview" element={<FlipTripPreviewPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/success.html" element={<SuccessPage />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
          <Route path="/example/:city" element={<ExampleTripPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;// FORCE REDEPLOY: Frontend restored to working commit 836ed64
// RESTORE: Back to working frontend
