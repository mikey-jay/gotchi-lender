FROM node:17
WORKDIR /usr/src/app
RUN npm install pm2 -g
COPY package*.json ./
RUN npm install
COPY . .
CMD ["pm2-runtime","--no-auto-exit", "ecosystem.config.js"]