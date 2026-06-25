FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Dependencias completas: el server corre con tsx en runtime.
COPY package.json package-lock.json* ./
RUN npm install
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
COPY tsconfig.json ./
EXPOSE 3000
CMD ["npm", "run", "start"]
