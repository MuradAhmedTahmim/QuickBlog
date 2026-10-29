# QuickBlog - React client
#
# Two stages: build the static bundle with Node, then serve it with Nginx.
# The runtime image carries no Node and no source, only the built files.

# ---------- build ----------
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines this at build time, so it is a build argument rather than an
# environment variable on the running container. Override it at build:
#   docker compose build --build-arg VITE_BASE_URL=https://api.example.com client
ARG VITE_BASE_URL=http://localhost:3000
ENV VITE_BASE_URL=$VITE_BASE_URL

RUN npm run build

# ---------- serve ----------
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
