// @flow
"use strict";

const os = require("os");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const writeFile = promisify(fs.writeFile);

/*::
type Opts = {
  registryUrl?: string,
  sslStrict?: boolean,
  configPath?: string,
};
*/

module.exports = writeAuthCredentials;

async function writeAuthCredentials(
  token /*: string */,
  {
    registryUrl = "registry.npmjs.org",
    sslStrict = true,
    configPath = path.join(os.homedir(), ".npmrc"),
  } /*: Opts */ = {},
) {
  const registryScheme = sslStrict ? "https" : "http";
  const lines = [
    `//${registryUrl}/:_authToken = ${token}`,
    `registry = ${registryScheme}://${registryUrl}`,
    "access = public",
    `strict-ssl = ${String(sslStrict)}`,
  ];
  const contents = lines.join("\n") + "\n";
  await writeFile(configPath, contents, { mode: 0o0600 });
}
