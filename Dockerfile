# syntax=docker/dockerfile:1

# Use a small Node.js base image
ARG NODE_VERSION=20.12.1
FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /usr/src/app

# Install build tools for native addons (bcrypt, mysql2)
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    bash

# Enable pnpm via corepack and install production dependencies using the lockfile
# Copy only manifest files first to leverage Docker layer caching
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && \
    corepack prepare pnpm@10.12.4 --activate && \
    pnpm install --frozen-lockfile --prod

# Copy the rest of the application code
COPY . .

# Cloud Run expects the service to listen on $PORT (default 8080)
EXPOSE 8080

CMD ["node", "src/app.js"]