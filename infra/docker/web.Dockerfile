FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json

RUN npm ci --workspace apps/web --include-workspace-root

COPY apps/web apps/web

RUN npm --workspace apps/web run build

FROM nginx:1.27-alpine AS runner

COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
