# Build v2 - 2026-03-19
FROM node:18-alpine

WORKDIR /app

# Instalar y compilar frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Instalar backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/

EXPOSE 3001

CMD ["node", "backend/server.js"]