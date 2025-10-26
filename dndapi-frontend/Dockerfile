# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Serve static stage ---
FROM node:20-alpine
WORKDIR /app

# piccola dipendenza per servire statici
RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 5000

# Lancia "serve" sulla cartella di build
CMD ["serve", "-s", "dist", "-l", "5000"]