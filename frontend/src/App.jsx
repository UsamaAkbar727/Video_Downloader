import React, { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import './App.css';

const App = () => {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [downloadCancelled, setDownloadCancelled] = useState(false);

  const handleCancelDownload = () => {
    setDownloadCancelled(true);
    setDownloading(false);
    setStatusMessage('Download cancelled!');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setVideoInfo(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch video info');
      }

      const data = await response.json();
      setVideoInfo(data);

      // Select best quality by default (last in list usually)
      if (data.formats && data.formats.length > 0) {
        setSelectedFormat(data.formats[0].format_id);
      }

      setStatusMessage('Video analysis complete!');
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (error) {
      setStatusMessage('Error: ' + error.message);
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url || !selectedFormat) return;

    setDownloadCancelled(false);
    setDownloading(true);
    setStatusMessage('Starting download...');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          format_id: selectedFormat
        }),
      });

      if (downloadCancelled) {
        setStatusMessage('Download cancelled!');
        setDownloading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      if (downloadCancelled) {
        setStatusMessage('Download cancelled!');
        setDownloading(false);
        return;
      }
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `video_${Date.now()}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setStatusMessage('Download complete!');
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (error) {
      if (!downloadCancelled) {
        setStatusMessage('Error: ' + error.message);
        setTimeout(() => setStatusMessage(''), 5000);
      }
    } finally {
      setDownloading(false);
    }
  };

  const getResolutionLabel = (f) => {
    const height = f.height || (f.resolution ? (parseInt(f.resolution.split('x')[1]) || parseInt(f.resolution.split('x')[0])) : 0);
    if (height >= 1080) return '1080p 2K';
    if (height >= 720) return '720p HD';
    if (height >= 480) return '480p SD';
    if (height >= 360) return '360p';
    if (height >= 240) return '240p';
    if (height >= 144) return '144p';
    return f.resolution || 'HD';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container" id="top">
      <div className="bg-base" />
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />
      <div className="bg-grid" />

      {/* --- Navbar --- */}
      <nav className="navbar">
        <div className="navbar-brand">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2.5" />
            <path d="M16 12V24C16 26.2091 17.7909 28 20 28H24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          SnapSave Pro
        </div>

        {statusMessage && (
          <div className={`header-status ${statusMessage.includes('complete') ? 'complete' : ''}`}>
            {!statusMessage.includes('complete') && <div className="pulse-dot" />}
            {statusMessage.includes('complete') && <span>✅</span>}
            {statusMessage}
          </div>
        )}

        <div className="navbar-links">
          <a href="#top" className="nav-link">Home</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-to" className="nav-link">How to Use</a>
        </div>
      </nav>

      {/* --- Hero & Downloader --- */}
      <section className="hero">
        <h1>Download Your Favorite <br /> <span className="hero-accent">Videos Instantly</span></h1>
        <p>Support for TikTok, YouTube, Instagram, Facebook and more. High quality, no watermarks, completely free.</p>

        <div className="main-card">
          <div className="input-container">
            <input
              type="text"
              className="url-input"
              placeholder="Paste video link here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              disabled={loading || downloading}
            />
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={loading || downloading}
            >
              {loading ? <div className="spinner" /> : 'Analyze'}
            </button>
          </div>

          {videoInfo && (
            <div className="video-info-wrapper">
              <div className="video-info-header">
                <div className="video-meta-top">
                  <div className="platform-tag-mini">
                    {videoInfo.extractor_key}
                  </div>
                  {videoInfo.uploader && (
                    <div className="uploader-info">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {videoInfo.uploader}
                    </div>
                  )}
                  {videoInfo.view_count && (
                    <div className="views-info">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      {Number(videoInfo.view_count).toLocaleString()} views
                    </div>
                  )}
                </div>
                <h3 className="video-title-compact" title={videoInfo.title}>{videoInfo.title}</h3>
                {videoInfo.description && (
                  <p className="video-description-snippet">
                    {videoInfo.description.length > 100 
                      ? videoInfo.description.substring(0, 100) + '...' 
                      : videoInfo.description}
                  </p>
                )}
              </div>

              <div className="video-content-body">
                <div className="thumbnail-container-premium">
                  <img src={videoInfo.thumbnail} alt={videoInfo.title} />
                  <div className="duration-pill">{formatDuration(videoInfo.duration)}</div>
                  <div className="play-overlay">
                    <div className="play-icon-inner">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                </div>

                <div className="selection-area">
                  <div className="quality-grid-premium">
                    {videoInfo.formats.map((f) => (
                      <div
                        key={f.format_id}
                        className={`quality-card-premium ${selectedFormat === f.format_id ? 'active' : ''}`}
                        onClick={() => setSelectedFormat(f.format_id)}
                      >
                        <div className="card-top">
                          <span className="resolution-text">{getResolutionLabel(f)}</span>
                          <div className="download-mini-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                          </div>
                        </div>
                        <div className="card-bottom">
                          <span className="size-text">
                            {f.filesize ? (f.filesize / (1024 * 1024)).toFixed(1) + ' MB' : ''}
                          </span>
                          <span className="download-label-text">Download</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!downloading && (
                    <button
                      className="premium-download-btn"
                      onClick={handleDownload}
                      disabled={downloading}
                    >
                      <>
                        <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        Download in {videoInfo.formats.find(f => f.format_id === selectedFormat)?.resolution || 'HD'}
                      </>
                    </button>
                  )}
                  {downloading && (
                    <div className="download-actions">
                      <button
                        className="premium-download-btn cancel-btn"
                        onClick={handleCancelDownload}
                      >
                        Cancel
                      </button>
                      <div className="download-progress">
                        <div className="spinner-white" /> Processing...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --- Why Choose Us --- */}
      <section id="features" className="info-section">
        <div className="section-title-wrapper">
          <span className="section-tag">Premium Features</span>
          <h2>Why Choose <span className="text-gradient">SnapSave Pro?</span></h2>
          <p className="section-subtitle">Experience the ultimate media downloading tool designed for speed, quality, and simplicity.</p>
        </div>

        <div className="section-grid">
          <div className="info-card-premium">
            <div className="info-icon-box blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h4>Crystal Clear Quality</h4>
            <p>Download your favorite content in stunning 4K, 1080p, and 720p resolutions. No compression, just pure quality.</p>
            <div className="card-shine" />
          </div>

          <div className="info-card-premium">
            <div className="info-icon-box purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <h4>Ultra-Fast Speeds</h4>
            <p>Our high-speed dedicated servers process your links in milliseconds, ensuring you spend less time waiting.</p>
            <div className="card-shine" />
          </div>

          <div className="info-card-premium">
            <div className="info-icon-box orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </div>
            <h4>Zero Watermarks</h4>
            <p>Enjoy your videos exactly as they were meant to be. We never add logos, watermarks, or overlays to your media.</p>
            <div className="card-shine" />
          </div>

          <div className="info-card-premium">
            <div className="info-icon-box green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <h4>Multiple Platforms</h4>
            <p>One tool for everything. Fully compatible with YouTube, TikTok, Instagram, Facebook, and 100+ other sites.</p>
            <div className="card-shine" />
          </div>

          <div className="info-card-premium">
            <div className="info-icon-box red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <h4>Unlimited Downloads</h4>
            <p>No daily limits, no hidden costs. Download as many videos as you want, whenever you want, absolutely free.</p>
            <div className="card-shine" />
          </div>

          <div className="info-card-premium">
            <div className="info-icon-box cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            </div>
            <h4>No Sign-Up Required</h4>
            <p>Start downloading instantly. No account, no email, and no installation needed — just paste your link and go.</p>
            <div className="card-shine" />
          </div>
        </div>
      </section>

      {/* --- How It Works --- */}
      <section id="how-to" className="info-section how-it-works-bg">
        <div className="section-title-wrapper">
          <span className="section-tag">Simple Process</span>
          <h2>How It <span className="text-gradient">Works?</span></h2>
          <p className="section-subtitle">Get your favorite videos in three easy steps. No registration or complex setup required.</p>
        </div>

        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">01</div>
            <div className="step-icon-wrapper">
              <div className="step-icon-bg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </div>
            </div>
            <h4>Copy Video URL</h4>
            <p>Find the video you want to download on any platform and copy its link from the address bar or share menu.</p>
          </div>

          <div className="step-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>

          <div className="step-card">
            <div className="step-number">02</div>
            <div className="step-icon-wrapper">
              <div className="step-icon-bg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
            </div>
            <h4>Paste & Analyze</h4>
            <p>Paste the link into the input field above and click "Analyze". Our system will instantly fetch the best quality options.</p>
          </div>

          <div className="step-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>

          <div className="step-card">
            <div className="step-number">03</div>
            <div className="step-icon-wrapper">
              <div className="step-icon-bg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
            </div>
            <h4>Download Instantly</h4>
            <p>Choose your preferred resolution and click "Download". Your video will be processed and saved to your device immediately.</p>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2.5" />
              <path d="M16 12V24C16 26.2091 17.7909 28 20 28H24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            SnapSave Pro
          </div>
          <p className="footer-tagline">Universal HD video downloader — fast, free, and watermark-free.</p>
        </div>

        <div className="footer-bottom">
          <p>© 2026 SnapSave Pro. All rights reserved.</p>
        </div>
      </footer>

      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#0f172a',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)',
            borderRadius: '12px',
            fontWeight: '500',
          },
        }}
      />
    </div>
  );
};

export default App;
