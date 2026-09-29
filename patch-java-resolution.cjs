const fs = require("fs");

const path =
  "./src/compliance/schematron/uae-pint-ae-schematron.service.ts";

let s = fs.readFileSync(path, "utf8");

/* Add delimiter import */
s = s.replace(
  "import { join } from 'path';",
  "import { delimiter, join } from 'path';"
);

/* Replace Windows-only classpath separator */
s = s.replace(
  "const classPath = `${this.saxonJar};${this.xmlResolverJar}`;",
  "const classPath = [this.saxonJar, this.xmlResolverJar].join(delimiter);"
);

/* Add Java resolver before runSaxon */
if (!s.includes("private resolveJavaExecutable()")) {

  const anchor = "  private async runSaxon(";

  const index = s.indexOf(anchor);

  if (index < 0) {
    throw new Error("runSaxon method not found");
  }

  const resolver = `  private resolveJavaExecutable(): string {
    if (process.env.JAVA_EXECUTABLE?.trim()) {
      return process.env.JAVA_EXECUTABLE.trim();
    }

    if (process.env.JAVA_HOME?.trim()) {
      return join(
        process.env.JAVA_HOME.trim(),
        'bin',
        process.platform === 'win32' ? 'java.exe' : 'java',
      );
    }

    if (process.platform === 'win32') {
      const developmentJava =
        'C:\\\\Program Files\\\\Eclipse Adoptium\\\\jdk-21.0.12.101-hotspot\\\\bin\\\\java.exe';

      if (existsSync(developmentJava)) {
        return developmentJava;
      }
    }

    return process.platform === 'win32' ? 'java.exe' : 'java';
  }

`;

  s =
    s.slice(0, index) +
    resolver +
    s.slice(index);
}

/* Ensure existsSync is imported */
s = s.replace(
  "from 'fs';",
  "from 'fs';"
);

if (!s.includes("existsSync")) {
  throw new Error(
    "Patch requires inspection of fs import before continuing"
  );
}

/* Replace java executable used by execFile */
s = s.replace(
  "execFileAsync('java',",
  "execFileAsync(this.resolveJavaExecutable(),"
);

fs.writeFileSync(path, s, "utf8");

console.log("Java resolution patch applied.");
