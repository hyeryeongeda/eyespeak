# Build stage
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# 빌드 시 API URL 주입 (docker-compose dev/prod 에서 build.args 로 전달)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Run stage — 정적 파일만 nginx로 서빙
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

RUN apk add --no-cache wget
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
