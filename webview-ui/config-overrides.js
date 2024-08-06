const path = require("path");

module.exports = function override(config, env) {
  config.resolve.alias["@backend"] = path.resolve(__dirname, "../src/backend");
  return config;
};
