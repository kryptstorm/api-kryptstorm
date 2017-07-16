module.exports = {
  api: {
    info: {
      version: require("../package.json").version,
      name: require("../package.json").name,
      author: require("../package.json").author.name
    },
    isDebug: true,
    httpVerbs: ["get", "post", "put", "delete"],
    perPageLimit: 20
  },
  mongo: {
    name: process.env.MONGO_DATABASE,
    host: process.env.MONGO_HOST,
    port: process.env.MONGO_PORT,
    options: {},
  }
};
