FROM node:20-alpine

RUN apk add --no-cache tzdata

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./entrypoint.sh"]
