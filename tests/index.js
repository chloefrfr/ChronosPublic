const xp = require("./xp.json");
const fs = require("node:fs");

const bp = require("./bp.json");

const Push = [];

for (const test of bp.catalogEntries) {
  console.log(test.offerId);
}
