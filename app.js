import React, { useState } from 'react';
import axios from 'axios';
import { Download, Link as LinkIcon, Loader2, CheckCircle } from 'lucide-react';

const VideoDownloader = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDownload = async () => {
    if (!url) return alert("Please paste a URL first!");
    
    setLoading(true);
    setMessage('');
    
    try {
      // Backend URL jo humne pehle set kiya tha (Port 4000)
      const response = await axios.get(`http://localhost:4000/download?url=${encodeURIComponent(url)}`);
      setMessage('Download started! Check the downloads folder.');
    } catch (error) {
      setMessage('Error starting download. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Video <span className="text-blue-500">Downloader</span></h1>
          <p className="text-slate-400">Paste your video link below to download in high quality</p>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <LinkIcon className="h-5 w-5 text-slate-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <button
          onClick={handleDownload}
          disabled={loading}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            loading 
            ? 'bg-slate-600 cursor-not-allowed text-slate-300' 
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/20'
          }`}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Download className="h-6 w-6" />
          )}
          {loading ? 'Processing...' : 'Download Now'}
        </button>

        {message && (
          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3 text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <p>{message}</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
          <div className="p-3 border border-slate-700 rounded-lg text-blue-400">MP4 Quality</div>
          <div className="p-3 border border-slate-700 rounded-lg text-purple-400">MP3 Option</div>
          <div className="p-3 border border-slate-700 rounded-lg text-orange-400">Fast Speed</div>
        </div>
      </div>
    </div>
  );
};

export default VideoDownloader;