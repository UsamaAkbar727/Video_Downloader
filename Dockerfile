# 1. Node.js environment setup
FROM node:18

# 2. Linux dependencies install karna (ffmpeg aur python jo yt-dlp ko chahiye)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 3. yt-dlp ki latest Linux binary download karna
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# 4. App directory banana
WORKDIR /usr/src/app

# 5. Dependencies copy aur install karna
COPY package*.json ./
RUN npm install

# 6. Poora code copy karna
COPY . .

# 7. Port set karna (jo aapne code mein 4000 rakha hai)
EXPOSE 4000

# 8. Server start karne ki command
CMD [ "node", "index.js" ]