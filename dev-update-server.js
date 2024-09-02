const express = require("express");
const app = express();

app.get("/latest-mac.yml", (req, res) => {
  res.send(`
    version: 2.0.0
    files:
      - url: MyApp-2.0.0-mac.zip
        sha512: XXXXXXXXXXXXXXXXXXXXXXXXXXX
        size: 65873494
  `);
});

app.listen(3000, () => console.log("Test update server running on port 3000"));
