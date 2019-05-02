// @flow
"use strict";

/*::
type PackageStatus = {
  [string]: {|
    shasum: string,
    localDependencies: Array<string>
  |}
};
*/

const PackageHashes = {
  checkRunName: "Package tarball hashes",

  serializeCheckRunOutputText(
    packageStatus /*: PackageStatus */,
  ) /*: string */ {
    const json = { schema_version: 1, packages: packageStatus };
    return JSON.stringify(json, null, 2);
  },
  deserializeCheckRunOutputText(text /*: string*/) /*: PackageStatus */ {
    const json = JSON.parse(text);
    if (json.schema_version === 1) {
      return json.packages;
    }
    throw new Error("Invalid text");
  },
};

module.exports = {
  PackageHashes,
};
