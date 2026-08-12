# Stage 1: Build front-end application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Vite bakes env vars into the bundle at build time. src/env.ts requires
# VITE_BASE_URL / VITE_POSTHOG_HOST / VITE_POSTHOG_KEY to be non-empty or the
# app throws before rendering (blank screen). Values come from CI build args;
# see .github/workflows/docker-ghcr.yml.
ARG VITE_BASE_URL
ARG VITE_V6_BASE_URL
ARG VITE_POSTHOG_HOST
ARG VITE_POSTHOG_KEY
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_MSAL_CLIENT_ID_DEFAULT
ENV VITE_BASE_URL=$VITE_BASE_URL \
    VITE_V6_BASE_URL=$VITE_V6_BASE_URL \
    VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST \
    VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_MSAL_CLIENT_ID_DEFAULT=$VITE_MSAL_CLIENT_ID_DEFAULT

RUN npm run build

# Stage 2: Serve with NGINX SPA server
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
