# ── Stage 1: Build React app ─────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Cache node_modules layer
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/solarpro.conf

# Copy built React app
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
