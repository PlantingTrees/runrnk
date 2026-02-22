#Build
FROM node:25.6.1-alpine AS build

#incase there is a new patch
RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


#Deploy
FROM nginx:alpine

RUN apk update && apk upgrade --no-cache
#vite uses dist not build 
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist/. /usr/share/nginx/html

# Copy your custom configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

