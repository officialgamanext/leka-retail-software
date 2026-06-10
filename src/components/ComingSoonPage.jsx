import React from 'react';
import { ArrowLeft, Rocket, Clock, Lock } from 'lucide-react';

/**
 * ComingSoonPage — Reusable full-page "Under Development" component
 * Security: Only rendered inside Dashboard, which requires active subscription.
 * 
 * Props:
 *  title       - Module name
 *  desc        - Short description
 *  icon        - Lucide icon element
 *  colorClass  - Card color class (blue, green, purple, etc.)
 *  features    - Array of { icon, label, desc } planned features
 *  business    - Active business object (for business-specific display)
 *  onBack      - Callback to return to home dashboard
 */
function ComingSoonPage({ title, desc, icon, colorClass, features = [], business, onBack }) {

  const colorMap = {
    blue:   { bg: '#eff6ff', solid: '#2563eb', light: '#dbeafe', text: '#1e40af' },
    green:  { bg: '#f0fdf4', solid: '#16a34a', light: '#dcfce7', text: '#15803d' },
    purple: { bg: '#f5f3ff', solid: '#7c3aed', light: '#ede9fe', text: '#6d28d9' },
    orange: { bg: '#fff7ed', solid: '#ea580c', light: '#fed7aa', text: '#c2410c' },
    yellow: { bg: '#fffbeb', solid: '#d97706', light: '#fde68a', text: '#b45309' },
    pink:   { bg: '#fff1f2', solid: '#e11d48', light: '#fecdd3', text: '#be123c' },
    red:    { bg: '#fef2f2', solid: '#dc2626', light: '#fecaca', text: '#b91c1c' },
    teal:   { bg: '#f0fdfa', solid: '#0d9488', light: '#99f6e4', text: '#0f766e' },
  };

  const colors = colorMap[colorClass] || colorMap.blue;

  return (
    <div className="light-dashboard-content" style={{ minHeight: 'calc(100vh - 70px)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>

        {/* Breadcrumb */}
        <div className="breadcrumb-bar" style={{ marginBottom: '32px' }}>
          <button className="breadcrumb-back-btn" onClick={onBack}>
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <span>/</span>
          <span style={{ fontWeight: 600, color: '#374151' }}>{title}</span>
        </div>

        {/* Hero Section */}
        <div style={{
          background: colors.bg,
          border: `1px solid ${colors.light}`,
          borderRadius: '20px',
          padding: '52px 40px',
          textAlign: 'center',
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '200px', height: '200px', borderRadius: '999px',
            background: colors.solid, opacity: 0.04
          }} />
          <div style={{
            position: 'absolute', bottom: '-30px', left: '-30px',
            width: '150px', height: '150px', borderRadius: '999px',
            background: colors.solid, opacity: 0.04
          }} />

          {/* Module Icon */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '999px',
            background: colors.solid, color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px auto',
            boxShadow: `0 8px 24px ${colors.solid}40`
          }}>
            {React.cloneElement(icon, { size: 30 })}
          </div>

          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#ffffff', border: `1px solid ${colors.light}`,
            borderRadius: '999px', padding: '4px 14px', marginBottom: '16px'
          }}>
            <Clock size={12} style={{ color: colors.solid }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: colors.solid, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Coming Soon
            </span>
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
            {title}
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#6b7280', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            {desc}
          </p>

          {/* Business tag */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: '8px', padding: '8px 16px'
          }}>
            <Lock size={13} style={{ color: '#9ca3af' }} />
            <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>
              Scoped to:&nbsp;<strong style={{ color: '#0f172a' }}>{business?.name}</strong>
            </span>
          </div>
        </div>

        {/* Planned Features Grid */}
        {features.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Rocket size={16} style={{ color: colors.solid }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                What's planned for this module
              </h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '16px'
            }}>
              {features.map((f, i) => (
                <div key={i} style={{
                  background: '#ffffff', border: '1px solid #f1f5f9',
                  borderRadius: '12px', padding: '18px 20px',
                  display: 'flex', gap: '14px', alignItems: 'flex-start',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  transition: 'box-shadow 0.2s ease'
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: colors.bg, color: colors.solid,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {React.cloneElement(f.icon, { size: 17 })}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1f2937', marginBottom: '3px' }}>
                      {f.label}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#9ca3af', lineHeight: 1.4 }}>
                      {f.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default ComingSoonPage;
