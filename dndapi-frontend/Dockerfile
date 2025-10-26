# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Installa dipendenze
COPY package*.json ./
# Se hai il lockfile, puoi usare `npm ci`
RUN npm install

# Copia il resto del codice e builda
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.27-alpine

# Config Nginx custom (SPA + proxy /api)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Statici Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# nginx image already has: CMD ["nginx", "-g", "daemon off;"]