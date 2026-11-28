# Imagen oficial ligera de Node.js 22
FROM node:22-slim

WORKDIR /app

# Instalar dependencias primero para aprovechar la caché de Docker
COPY package*.json ./
RUN npm install

# Variables públicas de Vite requeridas en tiempo de compilación (frontend)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copiar el código fuente del proyecto
COPY . .

# Compilar el frontend React/Vite en la carpeta dist/
RUN npm run build

# Configuración de producción para Google Cloud Run
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Inicia server.ts (sirve dist/ y las rutas /api/*)
CMD ["npm", "start"]
