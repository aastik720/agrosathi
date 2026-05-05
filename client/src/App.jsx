import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import BuyerDashboard from "./pages/BuyerDashboard.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Chatbot from "./pages/Chatbot.jsx";
import CreateListing from "./pages/CreateListing.jsx";
import DiseaseScanner from "./pages/DiseaseScanner.jsx";
import ListingDetails from "./pages/ListingDetails.jsx";
import MarketPrices from "./pages/MarketPrices.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import GovtSchemes from "./pages/GovtSchemes.jsx";
import SchemeDetails from "./pages/SchemeDetails.jsx";
import Weather from "./pages/Weather.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import ProfileSetup from "./pages/ProfileSetup.jsx";
import Register from "./pages/Register.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-agro-background text-slate-900">
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireComplete>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile-setup"
            element={
              <ProtectedRoute>
                <ProfileSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatbot"
            element={
              <ProtectedRoute requireComplete>
                <Chatbot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/disease-scanner"
            element={
              <ProtectedRoute requireComplete>
                <DiseaseScanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/market"
            element={
              <ProtectedRoute requireComplete>
                <MarketPrices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weather"
            element={
              <ProtectedRoute requireComplete>
                <Weather />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace"
            element={
              <ProtectedRoute requireComplete>
                <Marketplace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace/listings/new"
            element={
              <ProtectedRoute requireComplete>
                <CreateListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace/listings/:id"
            element={
              <ProtectedRoute requireComplete>
                <ListingDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer-dashboard"
            element={
              <ProtectedRoute requireComplete>
                <BuyerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schemes"
            element={
              <ProtectedRoute requireComplete>
                <GovtSchemes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schemes/:id"
            element={
              <ProtectedRoute requireComplete>
                <SchemeDetails />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
