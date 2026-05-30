# Stage 1: Build & install dependencies
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

# Stage 2: Production runtime image
FROM node:18-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy only production dependencies to keep the image slim
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code and migrations
COPY src ./src

# Create upload directory for event banners/charts
RUN mkdir -p uploads

EXPOSE 4000
CMD ["node", "src/server.js"]
