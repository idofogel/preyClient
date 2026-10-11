FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
# Rendered to /etc/nginx/conf.d/default.conf by the image's envsubst entrypoint.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Public URL of the API server, as the browser reaches it. Set at `docker run`.
ENV API_URL=http://localhost:4000

EXPOSE 80
