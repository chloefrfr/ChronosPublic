const all = require("./all.json");

const data = {};
for (const a of all) {
  if (a.TemplateId.includes("CosmeticVariantToken")) {
    const test = a.TemplateId.replace("CosmeticVariantToken:", "");

    Object.assign(data, { [a.TemplateId.replace("CosmeticVariantToken:", "")]: test });
  }
}
console.log(data);
