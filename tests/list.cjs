const fs = require("fs");

const stuff = require("./perms.json");

const perms = [];
for (const idk of stuff) {
  perms.push(idk.resource);
}

fs.writeFileSync("dadd.json", JSON.stringify(perms));
