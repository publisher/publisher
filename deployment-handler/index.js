// @flow
"use strict";

const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const execFile = promisify(cp.execFile);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const Octokit = require("@octokit/rest");
const TOML = require("@iarna/toml");
const tarjan = require("@rtsao/scc");

const {
  RELEASES_DIRECTORY_PATH,
  RELEASE_MANIFEST_FILENAME,
} = require("@publisher/core/releases.js");
const {
  CanaryDeployment,
  StableDeployment,
} = require("@publisher/core/deployments.js");

const { getWorkspaces } = require("@publisher/yarn-helpers");
const { pack } = require("@publisher/npm-helpers");

/*::
type Packages = {
  [string]: {
    publish: boolean,
    dir: string,
    version: string,
    localDependencies: Array<string>,
    distTag: string,
  }
};

*/

module.exports = deploymentHandler;

async function deploymentHandler(
  token /*: string */,
  eventPayload /*: Webhooks$WebhookPayloadDeployment */,
) {
  const github = new Octokit({
    auth: `token ${token}`,
    previews: ["ant-man-preview", "flash-preview", "shadow-cat-preview"],
  });

  const { deployment } = eventPayload;

  if (deployment.task === CanaryDeployment.taskId) {
    await publishCanary(github, eventPayload);
  } else if (deployment.task === StableDeployment.taskId) {
    await publishStable(github, eventPayload);
  }
}

async function publishCanary(github, payload) {
  const { deployment } = payload;
  const { id, unchangedPackages } = CanaryDeployment.deserializePayload(
    deployment.payload,
  );
  const shorthash = deployment.sha.substr(0, 7);
  const version = `0.0.0-canary.${shorthash}.${id}`;
  const distTag = "canary";

  await publishDeployment(github, payload, async () => {
    const workspace = await getWorkspaces();
    const packages /*: Packages */ = {};

    for (const name of Object.keys(workspace)) {
      const { location, workspaceDependencies } = workspace[name];

      if (unchangedPackages[name]) {
        packages[name] = {
          dir: location,
          version: unchangedPackages[name],
          distTag,
          publish: false,
          localDependencies: workspaceDependencies,
        };
      } else {
        packages[name] = {
          dir: location,
          version,
          distTag,
          publish: true,
          localDependencies: workspaceDependencies,
        };
      }
    }
    return packages;
  });
}

async function publishStable(github, payload) {
  const { deployment } = payload;

  const { id } = StableDeployment.deserializePayload(deployment.payload);

  const tomlFile = await readFile(
    `${RELEASES_DIRECTORY_PATH}/${id}/${RELEASE_MANIFEST_FILENAME}`,
  );
  const packages = TOML.parse(tomlFile);

  await publishDeployment(github, payload, async () => {
    const workspace = await getWorkspaces();
    const packagesToPublish /*: Packages */ = {};

    for (const [pkg, { version, publish }] of Object.entries(packages)) {
      const { location, workspaceDependencies } = workspace[pkg];

      packagesToPublish[pkg] = {
        dir: location,
        localDependencies: workspaceDependencies,
        version,
        distTag: "latest", // TODO: handle backports
        publish: publish === false ? false : true,
      };
    }

    return packagesToPublish;
  });
}

async function publishDeployment(github, payload, getPackages) {
  const { deployment, repository } = payload;

  await github.repos.createDeploymentStatus({
    owner: repository.owner.login,
    repo: repository.name,
    deployment_id: deployment.id,
    state: "in_progress",
  });

  try {
    const packages = await getPackages();

    await writeVersions(packages);
    const { stdout } = await execFile("git", ["diff"]);
    console.log("=== Diff ===");
    console.log(stdout);
    console.log("=== Publish ===");
    await publishRelease(packages);
  } catch (err) {
    await github.repos.createDeploymentStatus({
      owner: repository.owner.login,
      repo: repository.name,
      deployment_id: deployment.id,
      state: "error",
    });
    throw err;
  }

  await github.repos.createDeploymentStatus({
    owner: repository.owner.login,
    repo: repository.name,
    deployment_id: deployment.id,
    state: "success",
  });
}

async function publishRelease(packages) {
  const sorted = getTopologicalOrder(packages);

  console.log("=== Topological order ===");
  console.log(
    sorted.map(pkg =>
      packages[pkg].publish === false ? `${pkg} (publish: false)` : pkg,
    ),
  );

  const artifacts /* Array<{tarPath: string, distTag: string}> */ = [];
  console.log("Packing tarballs...");
  for (const pkg of sorted) {
    const { dir, distTag, publish } = packages[pkg];
    if (publish === true) {
      const packed = await pack(dir);
      artifacts.push({
        tarPath: path.join(dir, packed.filename),
        distTag,
      });
    }
  }

  console.log("Publishing...");
  const published = [];
  try {
    for (const { tarPath, distTag } of artifacts) {
      const result = await publish(tarPath, distTag);
      const { id, shasum } = result;
      console.log(
        `${id} successfully published (dist-tag: ${distTag}, shasum: ${shasum})`,
      );
      published.push(result);
    }
  } catch (err) {
    console.error(err);
    console.log("Error ocurred. Unpublishing...");
    for (const pkg of published) {
      // TODO: unpublish
    }
  }
}

function getTopologicalOrder(packages) {
  const graph = new Map();
  for (const [pkg, { localDependencies }] of Object.entries(packages)) {
    // TODO: deal with peerDeps erroneously not in devDeps
    graph.set(pkg, new Set(localDependencies));
  }
  const scc = tarjan(graph);

  if (scc.length !== Object.keys(packages).length) {
    throw new Error("Package dependency graph contains cycles");
  }

  const sorted = [];
  for (const set of scc) {
    for (const pkg of set) {
      sorted.push(pkg);
    }
  }
  return sorted;
}

/*::

type PublishData = {
  id: string,
  name: string,
  version: string,
  from: string,
  size: number,
  unpackedSize: number,
  shasum: string,
  integrity: string,
  files: Array<{| path: string, size: number, mode: number |}>,
  entryCount: number,
  bundled: Array<any>
};

*/

async function publish(tar /*: string */, distTag /*: string*/) {
  const { stdout } = await execFile(
    "npm",
    ["publish", path.basename(tar), "--tag", distTag, "--json"],
    { cwd: path.dirname(tar) },
  );
  const publishData = JSON.parse(stdout);
  return (publishData /*: PublishData */);
}

/*::
type Versions = {
  +[string]: {
    dir: string,
    version: string,
  }
};
*/

async function writeVersions(packages /*: Versions */) {
  return await Promise.all(
    Object.keys(packages).map(async pkgId => {
      const { dir, version } = packages[pkgId];
      const jsonPath = path.join(dir, "package.json");

      const json = await readJson(jsonPath);
      json.version = version;

      // Write dependency versions
      for (const dep of Object.keys(packages)) {
        const depVersion = packages[dep].version;
        if (json.dependencies && json.dependencies[dep]) {
          json.dependencies[dep] = depVersion;
        }
        if (json.devDependencies && json.devDependencies[dep]) {
          json.devDependencies[dep] = depVersion;
        }
        if (json.peerDependencies && json.peerDependencies[dep]) {
          json.peerDependencies[dep] = depVersion;
        }
      }

      await writeJson(jsonPath, json);
    }),
  );
}

async function readJson(path) {
  const contents = await readFile(path);
  return JSON.parse(contents);
}

async function writeJson(path, json) {
  return writeFile(path, JSON.stringify(json, null, 2) + "\n");
}
