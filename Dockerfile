FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY . .

RUN cd frontend && pnpm install && pnpm run build

RUN cd backend && pnpm install

EXPOSE 3001

CMD ["node", "backend/server.js"]