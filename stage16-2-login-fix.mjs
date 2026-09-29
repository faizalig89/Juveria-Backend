import fs from "fs";

const path = "./src/auth/auth.controller.ts";
let source = fs.readFileSync(path, "utf8");

if (!source.includes("import { Throttle } from '@nestjs/throttler';")) {
  throw new Error("Throttle import missing. STOP.");
}

if (source.includes("@Throttle({")) {
  console.log("LOGIN_THROTTLE_ALREADY_PRESENT");
  process.exit(0);
}

const target = "  @Post('login')";

if (!source.includes(target)) {
  throw new Error("Login route not found. STOP.");
}

source = source.replace(
  target,
  `  @Post('login')
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })`,
);

fs.writeFileSync(path, source, "utf8");

console.log("LOGIN_THROTTLE_ADDED");
