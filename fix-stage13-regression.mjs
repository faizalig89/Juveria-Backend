import fs from "fs";

const file = "./stage13-final-regression.mjs";
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

const reasonIndex = lines.findIndex(
  line => line.trim() === "reasonAC:"
);

if (reasonIndex === -1) {
  throw new Error("reasonAC assertion not found");
}

console.log("\n===== BEFORE =====");
console.log(
  lines.slice(reasonIndex, reasonIndex + 4).join("\n")
);

lines.splice(
  reasonIndex,
  4,
  "  validReasonCode:",
  "    xml381.includes(",
  '      "<cbc:ResponseCode>DL8.61.1.A</cbc:ResponseCode>"',
  "    ),"
);

fs.writeFileSync(file, lines.join("\n"), "utf8");

const verify = fs.readFileSync(file, "utf8");

if (verify.includes("reasonAC:")) {
  throw new Error("reasonAC still exists after write");
}

if (
  !verify.includes(
    "<cbc:ResponseCode>DL8.61.1.A</cbc:ResponseCode>"
  )
) {
  throw new Error("New reason code assertion missing");
}

console.log("\n===== AFTER =====");

const updated = verify.split(/\r?\n/);
const newIndex = updated.findIndex(
  line => line.trim() === "validReasonCode:"
);

console.log(
  updated.slice(newIndex, newIndex + 4).join("\n")
);

console.log("\nREGRESSION_SCRIPT_REASON_ASSERTION_FIXED");
