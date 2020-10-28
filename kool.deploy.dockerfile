FROM kooldev/node

COPY . /app

RUN yarn install

CMD [ "yarn", "start" ]
