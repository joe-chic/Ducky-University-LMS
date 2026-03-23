FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY public ./public
COPY src ./src

ENV PORT=3000
ENV HOST=0.0.0.0
ENV CHOKIDAR_USEPOLLING=true

EXPOSE 3000

CMD ["npm", "start"]