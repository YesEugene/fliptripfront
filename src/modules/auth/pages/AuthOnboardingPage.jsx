import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';
import { login, requestRegistrationCode, verifyRegistrationCode } from '../services/authService';
import './AuthOnboardingPage.css';

const GUIDE_COPY = {
  headline: 'SHARE YOUR CITY, YOUR WAY',
  subheadline: 'Curate a perfect day trip using your favorite spots and get rewarded.',
  body: `We all have our own "secret" version of the city. It's the one we show close friends when they visit, the tiny window serving the best espresso, or the quietest spot to watch the city lights come on.

We are looking for people who are passionate about what they do and where they live. If you're an architect, show us the city through its facades and hidden courtyards. If you're a food enthusiast, lead us to the tables where eating is an art form.

Create a guide for your ideal day. Let others see the city through your eyes and experience the places you'd actually recommend to a friend.`,
  cta: 'I want to become an author',
};

const TRAVELER_COPY = {
  headline: "SEE THE CITY THROUGH A LOCAL'S EYES",
  subheadline: 'Skip the tourist traps. Discover curated day trips created by people who actually live and breathe the city.',
  body: `Stop scrolling through endless "top 10" lists. We've gathered architects, chefs, and artists to show you their version of the city.

Whether it's a morning route through hidden courtyards or a late-night tour of the best vinyl bars, these are the places locals actually recommend to their friends. Just pick a mood, follow the map, and enjoy your ideal day.`,
  cta: 'Start exploring',
};

const LOGIN_COPY = {
  headline: "SEE THE CITY THROUGH A LOCAL'S EYES",
  subheadline: 'Welcome back! Your personal dashboard is waiting.',
  body: `In your dashboard you can access all the tours you've purchased, revisit your favorite routes anytime, and keep track of new tours from your favorite locals.

Soon we'll add email notifications for new tours in your favorite cities, wishlists, and personal travel notes. Stay tuned — your best trips are ahead.`,
};

function getRedirectByRole(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'guide') return '/guide/dashboard';
  return '/user/dashboard';
}

export default function AuthOnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const requestedTab = searchParams.get('tab');
  const requestedMode = searchParams.get('mode'); // 'login' or null
  const defaultGuideTab = location.pathname === '/become-local' || requestedTab === 'guide';

  const [activeTab, setActiveTab] = useState(defaultGuideTab ? 'guide' : 'traveler');
  const [authMode, setAuthMode] = useState(requestedMode === 'login' ? 'login' : 'register'); // register | login
  const [step, setStep] = useState('form'); // form | verify
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [code, setCode] = useState('');

  const activeCopy = useMemo(() => {
    if (activeTab === 'guide') return GUIDE_COPY;
    if (authMode === 'login') return LOGIN_COPY;
    return TRAVELER_COPY;
  }, [activeTab, authMode]);

  const role = activeTab === 'guide' ? 'guide' : 'user';

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setAuthMode('register');
    setStep('form');
    setError('');
    setSuccess('');
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await requestRegistrationCode({
        ...registerForm,
        role
      });
      setStep('verify');
      setSuccess(`We sent a verification code to ${registerForm.email}`);
    } catch (err) {
      setError(err.message || 'Unable to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await verifyRegistrationCode({
        email: registerForm.email,
        code
      });
      navigate(getRedirectByRole(data?.user?.role));
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(loginForm.email, loginForm.password);
      navigate(getRedirectByRole(data?.user?.role));
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-onboarding-page">
      <div className="auth-onboarding-card">
        <img src={FlipTripLogo} alt="FlipTrip" className="auth-onboarding-logo" />

        <div className="auth-onboarding-grid">
          <div className="auth-onboarding-left">
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${activeTab === 'traveler' ? 'active' : ''}`}
                onClick={() => handleTabChange('traveler')}
              >
                Traveler
              </button>
              <button
                type="button"
                className={`auth-tab ${activeTab === 'guide' ? 'active' : ''}`}
                onClick={() => handleTabChange('guide')}
              >
                Become a local
              </button>
            </div>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            {authMode === 'register' && step === 'form' && (
              <form className="auth-form" onSubmit={handleRequestCode}>
                <input
                  type="text"
                  placeholder="Name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
                <input
                  type="email"
                  placeholder="Your email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                  minLength={6}
                  required
                />
                <button type="submit" className="auth-primary-button" disabled={loading}>
                  {loading ? 'Sending code...' : activeCopy.cta}
                </button>
              </form>
            )}

            {authMode === 'register' && step === 'verify' && (
              <form className="auth-form" onSubmit={handleVerifyCode}>
                <input
                  type="text"
                  placeholder="Verification code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
                <button type="submit" className="auth-primary-button" disabled={loading}>
                  {loading ? 'Verifying...' : 'Complete registration'}
                </button>
                <button
                  type="button"
                  className="auth-secondary-button"
                  onClick={handleRequestCode}
                  disabled={loading}
                >
                  Resend code
                </button>
              </form>
            )}

            {authMode === 'login' && (
              <form className="auth-form" onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Your email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
                <button type="submit" className="auth-primary-button" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            )}

            <div className="auth-switch-row">
              {authMode === 'register' ? (
                <>
                  <span>Already have an account?</span>{' '}
                  <button type="button" onClick={() => { setAuthMode('login'); setStep('form'); setError(''); }} className="auth-link-button">
                    Login
                  </button>
                </>
              ) : (
                <>
                  <span>No account yet?</span>{' '}
                  <button type="button" onClick={() => { setAuthMode('register'); setError(''); }} className="auth-link-button">
                    Create account
                  </button>
                </>
              )}
            </div>

            {authMode === 'login' && requestedMode !== 'login' && (
              <div className="auth-switch-row auth-switch-back">
                <Link to={activeTab === 'guide' ? '/become-local' : '/join?tab=traveler'} className="auth-back-link">
                  Back to onboarding
                </Link>
              </div>
            )}
          </div>

          <div className="auth-onboarding-right">
            <h1>{activeCopy.headline}</h1>
            <h2>{activeCopy.subheadline}</h2>
            <p>{activeCopy.body}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
