import { lazy, Suspense } from "react";
import { BookOpen, Mail, Sparkles } from "lucide-react";
import { Link, Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import AppPrompt from "./components/AppPrompt";
import AmbientUI from "./components/AmbientUI";
import FullPageLoader from "./components/FullPageLoader";
import Navbar from "./components/Navbar";
import PageEffects from "./components/PageEffects";
import ProtectedRoute from "./components/ProtectedRoute";
import RouteTransition from "./components/RouteTransition";

const Home = lazy(() => import("./pages/Home"));
const Explore = lazy(() => import("./pages/Explore"));
const Communities = lazy(() => import("./pages/Communities"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WritePost = lazy(() => import("./pages/WritePost"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const DataDeletion = lazy(() => import("./pages/DataDeletion"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));

function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoader message="Loading this page..." />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/communities" element={<Communities />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/post/:slug" element={<PostDetail />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/write" element={<ProtectedRoute><WritePost /></ProtectedRoute>} />
        <Route path="/write/:id" element={<ProtectedRoute><WritePost /></ProtectedRoute>} />
        <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
        <Route path="/settings/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="/admin" element={<ProtectedRoute roles={["ADMIN"]}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={["ADMIN"]}><AdminUsers /></ProtectedRoute>} />
        <Route path="*" element={
          <main className="page">
            <div className="empty-state route-empty-state interactive-surface">
              <span className="route-error-code">404</span>
              <h1>This story page wandered away.</h1>
              <p>The link may have changed, or the page may no longer be available.</p>
              <div className="route-error-actions">
                <Link className="button button-primary" to="/">Return home</Link>
                <Link className="button button-ghost" to="/explore">Explore stories</Link>
              </div>
            </div>
          </main>
        } />
      </Routes>
    </Suspense>
  );
}

function AppFooter() {
  return (
    <footer className="footer premium-footer">
      <div className="container footer-grid">
        <div className="footer-brand-block">
          <Link className="brand footer-brand" to="/">
            <span className="brand-icon"><BookOpen size={21} /></span>
            <span>BlogVerse</span>
          </Link>
          <p>A modern place to create meaningful stories, discover ideas and grow through community conversations.</p>
          <span className="footer-badge"><Sparkles size={15} /> Ideas worth sharing</span>
        </div>
        <div>
          <h4>Discover</h4>
          <Link to="/explore">Explore stories</Link>
          <Link to="/communities">Communities</Link>
          <Link to="/about">About us</Link>
          <Link to="/contact">Contact us</Link>
        </div>
        <div>
          <h4>Account</h4>
          <Link to="/login">Sign in</Link>
          <Link to="/register">Create account</Link>
          <Link to="/forgot-password">Forgot password</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/data-deletion">Data Deletion</Link>
        </div>
        <div className="footer-contact">
          <h4>Stay connected</h4>
          <p><Mail size={16} /> support@blogverse.com</p>
          <small>React · Express · MySQL · Prisma</small>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} BlogVerse</span>
        <span>Stories become stronger when communities share them.</span>
      </div>
    </footer>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AmbientUI />
      <RouteTransition />
      <PageEffects />
      <Navbar />
      <AppPrompt />
      <AppRoutes />
      <AppFooter />
    </ErrorBoundary>
  );
}

export default App;
