// @flow
"use strict";

const cp = require("child_process");
const { promisify } = require("util");
const execFile = promisify(cp.execFile);

module.exports = {
  getWorkspaces,
};

/*::

type Workspaces = {
  [string]: {|
    location: string,
    workspaceDependencies: Array<string>,
    mismatchedWorkspaceDependencies: Array<string>,
  |}
};

*/

async function getWorkspaces() /*: Promise<Workspaces> */ {
  const { stdout } = await execFile("yarn", ["workspaces", "info", "--json"]);
  const workspaces = JSON.parse(JSON.parse(stdout).data);
  return (workspaces /*: Workspaces */);
}
