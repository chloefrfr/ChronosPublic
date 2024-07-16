const xp = require("./XP.json");
const data = [];
const fs = require("fs");
const path = require("path");

for (const test of xp) {
  const { Rows } = test;

  for (const key in Rows) {
    if (Rows.hasOwnProperty(key)) {
      const row = Rows[key];

      data.push({
        Level: row.Level,
        XpToNextLevel: row.XpToNextLevel,
        XpTotal: row.XpToNextLevel,
      });
    }
  }
}

fs.writeFileSync(path.join(__dirname, "SeasonXpCurve.json"), JSON.stringify(data, null, 2));
