FROM node:22-bookworm-slim

# System libraries required by Chromium (used by Puppeteer for PNG export)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxrandr2 \
    libxss1 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Point Puppeteer to system Chromium (avoids downloading an extra ~300 MB)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install AI CLIs — Claude (default) and Codex (optional alternative)
RUN npm install -g @anthropic-ai/claude-code @openai/codex

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

COPY . .

# Seed data directories and discover the Claude CLI path (.env.local is written here)
ENV OC_SETUP_NO_DEV=1
RUN node scripts/setup.mjs

# Build the Next.js production bundle
RUN npm run build

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
