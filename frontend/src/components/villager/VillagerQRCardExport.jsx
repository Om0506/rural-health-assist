/**
 * Fixed-layout card used only for PNG download (html2canvas).
 * Kept off-screen with pixel-perfect styles — do not use responsive classes here.
 */
export default function VillagerQRCardExport({
  initials,
  name,
  gender,
  age,
  patientId,
  bloodGroup,
  allergies,
  chronic,
  qrImageSrc,
  brandTitle = 'Rural Health',
}) {
  return (
    <div
      id="villager-qr-export"
      style={{
        width: 420,
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#ffffff',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        boxSizing: 'border-box',
      }}
    >
      {/* Gradient header */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(105deg, #1d4ed8 0%, #2563eb 42%, #0d9488 100%)',
          padding: '24px 24px 36px',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            margin: '0 0 16px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          {brandTitle}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 12,
              }}
            >
              {initials}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.25,
              }}
            >
              {name}
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
              {gender} • {age} Years
            </p>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 12,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.8)',
                letterSpacing: '0.02em',
              }}
            >
              ID: {patientId}
            </p>
          </div>

          <div
            style={{
              flexShrink: 0,
              width: 132,
              height: 132,
              background: '#fff',
              borderRadius: 14,
              padding: 10,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
          >
            {qrImageSrc ? (
              <img
                src={qrImageSrc}
                alt=""
                width={112}
                height={112}
                style={{ display: 'block', width: 112, height: 112 }}
              />
            ) : (
              <span style={{ fontSize: 12, color: '#64748b' }}>QR</span>
            )}
          </div>
        </div>

        <svg
          viewBox="0 0 420 32"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 28,
            display: 'block',
          }}
        >
          <path d="M0,20 C70,4 140,28 210,14 C280,0 350,24 420,12 L420,32 L0,32 Z" fill="#ffffff" />
        </svg>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 0,
          padding: '20px 16px 22px',
          background: '#fff',
        }}
      >
        {[
          { label: 'Blood Group', value: bloodGroup, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Allergies', value: allergies, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Chronic Condition', value: chronic, color: '#0d9488', bg: '#f0fdfa' },
        ].map((item, i) => (
          <div
            key={item.label}
            style={{
              textAlign: 'center',
              padding: '0 8px',
              borderLeft: i > 0 ? '1px solid #f1f5f9' : 'none',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                margin: '0 auto 8px',
                borderRadius: 8,
                background: item.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 500,
                color: '#64748b',
                lineHeight: 1.3,
              }}
            >
              {item.label}
            </p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13,
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          padding: '12px 20px',
          textAlign: 'center',
          background: '#f8fafc',
        }}
      >
        <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
          Scan at any health center · {brandTitle} Assistance System
        </p>
      </div>
    </div>
  );
}
