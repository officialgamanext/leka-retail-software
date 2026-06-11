import React, { useState } from 'react';
import axios from 'axios';
import {
  ShoppingCart,
  ReceiptText,
  Package,
  BarChart3,
  Globe,
  Lock,
  ShieldCheck,
  Loader2,
  ArrowRight,
  EyeOff
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

function Login({ onLoginSuccess, securityMessage }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Normalize and validate mobile numbers
  const formatPhoneNumber = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `+91${cleaned.slice(1)}`;
    }
    return number.startsWith('+') ? number : `+${cleaned}`;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!phoneNumber) {
      setError('Please enter your mobile number');
      return;
    }

    const formatted = formatPhoneNumber(phoneNumber);
    const cleanedDigits = formatted.replace(/\D/g, '').slice(-10);

    if (cleanedDigits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/otp/send`, {
        phoneNumber: formatted
      });
      if (response.data.success) {
        setStep(2);
        setSuccess('OTP has been successfully sent to your device.');
      } else {
        setError(response.data.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Verify backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    const formatted = formatPhoneNumber(phoneNumber);

    try {
      const response = await axios.post(`${API_URL}/auth/otp/verify`, {
        phoneNumber: formatted,
        otp
      });

      if (response.data.success && response.data.token) {
        onLoginSuccess(response.data.token, response.data.user);
      } else {
        setError('Verification failed. Invalid code.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-canvas">
      <div className="auth-page-card">
        {/* Left Accent Panel */}
        <div className="auth-left-panel">
          <div className="auth-brand">
            <div className="brand-icon-box">
              <ShoppingCart size={24} strokeWidth={2.5} />
            </div>
            <h1 className="brand-title">LEKA RETAIL</h1>
            <p className="brand-subtitle">Smart Billing, Better Business</p>
            <div className="brand-divider"></div>
            <p className="brand-desc">
              Manage your store operations efficiently and grow your business with powerful tools.
            </p>
          </div>

          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon-box">
                <ReceiptText size={20} />
              </div>
              <div className="feature-text-box">
                <h4 className="feature-title">Fast & Easy Billing</h4>
                <p className="feature-desc">Create invoices in seconds and improve checkout efficiency.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-box">
                <Package size={20} />
              </div>
              <div className="feature-text-box">
                <h4 className="feature-title">Manage Everything</h4>
                <p className="feature-desc">Products, customers, stock, suppliers and expenses – all in one place.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-box">
                <BarChart3 size={20} />
              </div>
              <div className="feature-text-box">
                <h4 className="feature-title">Insightful Reports</h4>
                <p className="feature-desc">Get real-time insights and make smarter business decisions.</p>
              </div>
            </div>
          </div>

          {/* Detailed POS Vector Illustration (Inline SVG) */}
          <div className="auth-illustration-container">
            <svg width="320" height="200" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto' }}>
              {/* Grid Background Lines (Faint) */}
              <line x1="20" y1="160" x2="300" y2="160" stroke="#dbeafe" strokeWidth="1.5" />
              <line x1="20" y1="180" x2="300" y2="180" stroke="#dbeafe" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="270" cy="130" r="14" fill="#eff6ff" />
              <circle cx="280" cy="125" r="8" fill="#dbeafe" />

              {/* Box Stacks in Background */}
              <rect x="250" y="142" width="24" height="18" rx="2" fill="#dbeafe" opacity="0.6" />
              <rect x="254" y="128" width="16" height="14" rx="2" fill="#dbeafe" opacity="0.4" />
              <rect x="238" y="145" width="16" height="15" rx="2" fill="#dbeafe" opacity="0.5" />

              {/* Barcode Scanner on stand */}
              <g transform="translate(200, 100)">
                {/* Stand */}
                <path d="M22 60 L14 10 L28 10 Z" fill="#475569" />
                <rect x="8" y="55" width="26" height="6" rx="3" fill="#1e293b" />
                {/* Scanner Head */}
                <rect x="6" y="2" width="22" height="14" rx="4" fill="#0f172a" transform="rotate(-15 15 10)" />
                <path d="M10 4 L22 -2 L25 8 L14 14 Z" fill="#3b82f6" transform="rotate(-15 15 10)" />
                <rect x="18" y="2" width="4" height="12" rx="1" fill="#ef4444" transform="rotate(-15 15 10)" />
              </g>

              {/* Thermal Receipt Printer */}
              <g transform="translate(10, 115)">
                {/* Main Body */}
                <rect x="10" y="20" width="55" height="42" rx="6" fill="#1e293b" />
                <rect x="10" y="20" width="55" height="12" rx="2" fill="#0f172a" />
                {/* Paper Output Slot */}
                <rect x="20" y="24" width="35" height="3" rx="1.5" fill="#334155" />
                {/* White Receipt Paper */}
                <path d="M22 25 L22 5 L48 5 L48 25" fill="#ffffff" />
                <line x1="26" y1="10" x2="44" y2="10" stroke="#94a3b8" strokeWidth="1" />
                <line x1="26" y1="14" x2="38" y2="14" stroke="#94a3b8" strokeWidth="1" />
                {/* Print Detail Lines */}
                <path d="M22 5 L26 1 L30 5 L34 1 L38 5 L42 1 L46 5 L48 3" stroke="#e2e8f0" strokeWidth="1.5" fill="none" />
                {/* Power Indicators */}
                <circle cx="56" cy="45" r="2" fill="#10b981" />
                <circle cx="50" cy="45" r="2" fill="#f59e0b" />
              </g>

              {/* POS Monitor / Terminal */}
              <g transform="translate(85, 65)">
                {/* Stand */}
                <path d="M45 75 L30 110 L70 110 L55 75 Z" fill="#475569" />
                <ellipse cx="50" cy="108" rx="32" ry="6" fill="#1e293b" />
                {/* Outer Bezel */}
                <rect x="2" y="2" width="102" height="74" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
                {/* Screen Canvas */}
                <rect x="8" y="8" width="90" height="62" rx="4" fill="#ffffff" />
                {/* Software Topbar */}
                <rect x="8" y="8" width="90" height="10" fill="#eff6ff" />
                <circle cx="14" cy="13" r="2" fill="#3b82f6" />
                <rect x="20" y="11" width="18" height="4" rx="2" fill="#cbd5e1" />
                {/* Invoice Header details */}
                <rect x="14" y="24" width="30" height="5" rx="1.5" fill="#e2e8f0" />
                {/* Total label */}
                <rect x="36" y="34" width="28" height="4" rx="1.5" fill="#94a3b8" />
                <text x="50" y="48" fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">₹1,250.00</text>
                {/* PAY button */}
                <rect x="29" y="53" width="42" height="11" rx="3" fill="#2563eb" />
                <text x="50" y="61" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">PAY</text>
              </g>

              {/* Small plant in pot */}
              <g transform="translate(180, 145)">
                {/* Pot */}
                <path d="M2 15 L4 30 L16 30 L18 15 Z" fill="#d97706" />
                <rect x="0" y="13" width="20" height="3" rx="1" fill="#b45309" />
                {/* Soil */}
                <ellipse cx="10" cy="14" rx="8" ry="2" fill="#78350f" />
                {/* Leaves */}
                <path d="M10 14 C10 14 3 4 10 0 C17 4 10 14 10 14 Z" fill="#10b981" />
                <path d="M10 14 C10 14 15 8 18 4 C15 2 10 14 10 14 Z" fill="#059669" />
                <path d="M10 14 C10 14 5 8 2 4 C5 2 10 14 10 14 Z" fill="#059669" />
              </g>
            </svg>
          </div>
        </div>

        {/* Right Input Panel */}
        <div className="auth-right-panel">
          <div className="lang-selector-container">
            <button className="lang-selector" type="button">
              <Globe size={14} /> English ⌵
            </button>
          </div>

          <div className="login-form-wrapper">
            <h2 className="form-header-title">Welcome Back!</h2>
            <p className="form-header-subtitle">Login to access your account</p>

            {/* Stepper Progress Bar */}
            <div className="steps-indicator">
              <div className={`step-node ${step === 1 ? 'active' : 'inactive'}`}>
                <div className="step-circle">1</div>
                <span>Verify Mobile</span>
              </div>
              <div className="step-line"></div>
              <div className={`step-node ${step === 2 ? 'active' : 'inactive'}`}>
                <div className="step-circle">2</div>
                <span>Enter OTP</span>
              </div>
            </div>

            {/* Security kick-out banner (shown when auto-redirected) */}
            {securityMessage && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fee2e2',
                borderRadius: '8px', padding: '12px 14px',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                marginBottom: '16px'
              }}>
                <Lock size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.82rem', color: '#b91c1c', lineHeight: 1.5 }}>
                  {securityMessage}
                </span>
              </div>
            )}

            {error && (
              <div className="alert-banner error mb-4" style={{ margin: '0 0 16px 0' }}>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert-banner success mb-4" style={{ margin: '0 0 16px 0' }}>
                <span>{success}</span>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <div>
                  <label htmlFor="mobile" style={{ color: '#4b5563', fontSize: '0.82rem', fontWeight: 600 }}>
                    Enter your mobile number
                  </label>

                  {/* Custom Indian Mobile Format input wrapper */}
                  <div className="phone-input-container">
                    <div className="country-select-box">
                      <svg className="country-flag" viewBox="0 0 30 20" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                        <rect width="30" height="20" fill="#138808" />
                        <rect width="30" height="13.33" fill="#FFFFFF" />
                        <rect width="30" height="6.67" fill="#FF9933" />
                        <circle cx="15" cy="10" r="3" fill="#000080" />
                        <circle cx="15" cy="10" r="2.2" fill="#FFFFFF" />
                        <circle cx="15" cy="10" r="0.8" fill="#000080" />
                        <line x1="15" y1="7" x2="15" y2="13" stroke="#000080" strokeWidth="0.5" />
                        <line x1="12" y1="10" x2="18" y2="10" stroke="#000080" strokeWidth="0.5" />
                        <line x1="12.9" y1="7.9" x2="17.1" y2="12.1" stroke="#000080" strokeWidth="0.5" />
                        <line x1="12.9" y1="12.1" x2="17.1" y2="7.9" stroke="#000080" strokeWidth="0.5" />
                      </svg>
                      <span className="country-code" style={{ marginLeft: '6px' }}>+91</span>
                      <span className="country-arrow">⌵</span>
                    </div>
                    <input
                      id="mobile"
                      type="tel"
                      className="phone-text-input"
                      placeholder="98765 43210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-info-prompt">
                    <Lock size={12} />
                    <span>We'll send you a 6-digit OTP on this number</span>
                  </div>
                </div>

                <button type="submit" className="btn-blue-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Sending OTP...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </button>

                {/* <div className="or-divider">OR</div>

                <button type="button" className="btn-password-outline" disabled={loading}>
                  <Lock size={14} /> Continue with Password
                </button> */}
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <div>
                  <label htmlFor="verificationCode" style={{ color: '#4b5563', fontSize: '0.82rem', fontWeight: 600 }}>
                    Enter 6-digit verification code
                  </label>

                  <input
                    id="verificationCode"
                    type="text"
                    placeholder="Enter code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    maxLength={6}
                    style={{
                      marginTop: '8px',
                      padding: '12px',
                      fontSize: '1.2rem',
                      textAlign: 'center',
                      letterSpacing: '8px',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      background: '#ffffff',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px'
                    }}
                    required
                  />

                  <div className="form-info-prompt" style={{ justifyContent: 'center', marginTop: '14px' }}>
                    <span>Didn't receive code?</span>
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={loading}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem' }}
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-blue-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Verifying...
                    </>
                  ) : (
                    'Verify & Log In'
                  )}
                </button>

                <button
                  type="button"
                  className="btn-password-outline"
                  onClick={() => { setStep(1); setError(''); setSuccess(''); }}
                  disabled={loading}
                >
                  Change Mobile Number
                </button>
              </form>
            )}

            <div className="security-badge-footer">
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
              <span>Your data is 100% secure and encrypted</span>
            </div>
          </div>

          <div className="auth-footer-disclaimer">
            By continuing, you agree to our <a href="#terms">Terms & Conditions</a> and <a href="#privacy">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
