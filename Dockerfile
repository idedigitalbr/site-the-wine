FROM nginx:alpine

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

COPY index.html ./
COPY style.css ./
COPY eventos-accordion-standalone.html ./
COPY assets ./assets

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
