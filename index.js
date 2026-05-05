require("dotenv").config();
const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const validator = require("validator");

const app = express();

// --- Security Middleware ---
// 1. Helmet for secure headers
app.use(helmet());

// 2. Rate Limiting (100 requests per 15 minutes)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: "Too many requests, please try again later." }
});
app.use("/info", limiter);
app.use("/download", limiter);

// 3. CORS Configuration
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({
    origin: "*",
    credentials: true
}));
// 4. Body size limit (prevent large payloads)
app.use(express.json({ limit: "10kb" }));

// Create downloads folder if not exists
const downloadDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

const ytDlpPath = path.join(__dirname, "yt-dlp.exe");
const ffmpegPath = path.join(__dirname, "ffmpeg.exe");

// Helper for URL validation
const isValidUrl = (url) => {
    return url && validator.isURL(url, { protocols: ["http", "https"], require_protocol: true });
};

app.post("/info", (req, res) => {
    const { url } = req.body;

    if (!isValidUrl(url)) {
        return res.status(400).json({ error: "Invalid or missing URL" });
    }

    const args = [
        "-j",
        "--no-playlist",
        url
    ];

    const ls = spawn(ytDlpPath, args);

    let stdoutOutput = "";
    let stderrOutput = "";

    ls.stdout.on("data", (data) => {
        stdoutOutput += data.toString();
    });

    ls.stderr.on("data", (data) => {
        stderrOutput += data.toString();
    });

    ls.on("close", (code) => {
        if (code === 0) {
            try {
                const info = JSON.parse(stdoutOutput);

                // Group by height to ensure we only have ONE option per resolution level (1080, 720, etc.)
                const resolutionGroups = {};

                info.formats.forEach(f => {
                    // Bucket height into standard values to prevent duplicates from slight variations
                    let height = f.height || (f.resolution ? parseInt(f.resolution.split('x')[1]) : 0) || (f.resolution ? parseInt(f.resolution.split('x')[0]) : 0);

                    // Normalize height to standard buckets
                    if (height > 1000) height = 1080;
                    else if (height > 600) height = 720;
                    else if (height > 400) height = 480;
                    else if (height > 300) height = 360;
                    else if (height > 200) height = 240;
                    else if (height > 100) height = 144;

                    if (f.vcodec !== 'none' && height > 0 && f.ext === 'mp4') {
                        // Keep the one with the highest quality (largest file size)
                        if (!resolutionGroups[height] || (f.filesize > (resolutionGroups[height].filesize || 0))) {
                            resolutionGroups[height] = f;
                        }
                    }
                });

                // Convert back to array and sort by resolution (height)
                const formats = Object.values(resolutionGroups)
                    .sort((a, b) => {
                        const hA = parseInt(a.resolution.split('x')[1]) || 0;
                        const hB = parseInt(b.resolution.split('x')[1]) || 0;
                        return hB - hA; // Descending order
                    })
                    .slice(0, 6) // Increased to show more resolutions (144p to 1080p)
                    .map(f => ({
                        format_id: f.format_id,
                        resolution: f.resolution,
                        height: f.height || (f.resolution ? parseInt(f.resolution.split('x')[1]) : 0),
                        ext: f.ext,
                        filesize: f.filesize,
                        note: f.format_note
                    }));

                res.json({
                    title: info.title,
                    thumbnail: info.thumbnail,
                    duration: info.duration,
                    formats: formats,
                    extractor_key: info.extractor_key,
                    uploader: info.uploader,
                    view_count: info.view_count,
                    upload_date: info.upload_date,
                    description: info.description
                });
            } catch (err) {
                res.status(500).json({ error: "Failed to parse video info" });
            }
        } else {
            res.status(500).json({ error: "Failed to fetch video info", details: stderrOutput });
        }
    });
});

app.post("/download", (req, res) => {
    const { url, quality, format_id } = req.body;

    if (!isValidUrl(url)) {
        return res.status(400).json({ error: "Valid URL is required" });
    }

    // Binary checks
    if (!fs.existsSync(ytDlpPath) || !fs.existsSync(ffmpegPath)) {
        return res.status(500).json({ error: "Missing yt-dlp.exe or ffmpeg.exe" });
    }

    // Format selection logic
    let format = "bestvideo+bestaudio/best";

    if (format_id) {
        format = `${format_id}+bestaudio/best`;
    } else if (quality) {
        switch (quality) {
            case "1080":
                format = "bestvideo[height<=1080]+bestaudio/best[height<=1080]";
                break;
            case "720":
                format = "bestvideo[height<=720]+bestaudio/best[height<=720]";
                break;
            case "480":
                format = "bestvideo[height<=480]+bestaudio/best[height<=480]";
                break;
            case "360":
                format = "bestvideo[height<=360]+bestaudio/best[height<=360]";
                break;
        }
    }

    console.log(`Starting download for: ${url} with format: ${format}`);

    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const outputTemplate = path.join(downloadDir, `${uniqueName}.%(ext)s`);

    const args = [
        url,
        "-f", format,
        "--merge-output-format", "mp4",
        "--ffmpeg-location", path.dirname(ffmpegPath),
        "--audio-quality", "0",
        "--add-metadata",
        "--no-playlist",
        "-o", outputTemplate
    ];

    const ls = spawn(ytDlpPath, args);

    ls.on("close", (code) => {
        console.log(`yt-dlp exited with code ${code}`);

        if (code === 0) {
            const files = fs.readdirSync(downloadDir);
            const downloadedFile = files.find(f => f.startsWith(uniqueName));

            if (!downloadedFile) {
                return res.status(500).json({ error: "Download finished but file not found" });
            }

            const finalPath = path.join(downloadDir, downloadedFile);

            res.download(finalPath, "video.mp4", (err) => {
                if (fs.existsSync(finalPath)) {
                    fs.unlinkSync(finalPath);
                }
            });
        } else {
            return res.status(500).json({ error: "Download failed" });
        }
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        ytDlp: fs.existsSync(ytDlpPath),
        ffmpeg: fs.existsSync(ffmpegPath)
    });
});

app.listen(PORT, () => {
    console.log(`✅ Backend Running on Port ${PORT}`);
});