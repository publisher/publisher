// @flow
"use strict";

const cp = require("child_process");
const { promisify } = require("util");
const execFile = promisify(cp.execFile);

module.exports = {
  pack,
};

/*::

type PackMetadata = {|
  id: string,
  name: string,
  version: string,
  size: number,
  unpackedSize: number,
  shasum: string,
  integrity: string,
  filename: string,
  files: Array<{| path: string, size: number, mode: number |}>,
  entryCount: number,
  bundled: Array<any>,
|};

*/

async function pack(dir /*: string */) {
  const { stdout } = await execFile("npm", ["pack", "--json"], {
    cwd: dir,
  });
  const [metadata] = JSON.parse(stdout);
  return (metadata /*: PackMetadata */);
}
