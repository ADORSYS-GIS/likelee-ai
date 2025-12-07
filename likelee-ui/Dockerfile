# syntax=docker/dockerfile:1

# ---- Build Stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Build-time environment for Vite
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL
ARG VITE_AWS_REGION
ARG VITE_COGNITO_IDENTITY_POOL_ID

ENV VITE_KEYCLOAK_URL=${VITE_KEYCLOAK_URL}
ENV VITE_KEYCLOAK_REALM=${VITE_KEYCLOAK_REALM}
ENV VITE_KEYCLOAK_CLIENT_ID=${VITE_KEYCLOAK_CLIENT_ID}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_AWS_REGION=${VITE_AWS_REGION}
ENV VITE_COGNITO_IDENTITY_POOL_ID=${VITE_COGNITO_IDENTITY_POOL_ID}

COPY likelee-ui/package*.json ./
COPY likelee-ui/vite.config.* likelee-ui/tsconfig*.json ./
RUN npm ci
COPY likelee-ui/ ./
RUN npm run build

# ---- Runtime Stage ----
FROM nginx:alpine AS runtime

# SPA-friendly nginx config
COPY likelee-ui/nginx.conf /etc/nginx/conf.d/default.conf

# Static assets
COPY --from=build /app/dist /usr/share/nginx/html
COPY likelee-ui/media /usr/share/nginx/html/media

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
