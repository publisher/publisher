// @flow
"use strict";

const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);

const { parse } = require("jju");

module.exports = {
  getMonorepoPackages,
  getProjects,
};

/*::
type Packages = {
  [string]: {
    location: string,
    localDependencies: Array<string>,
  }
};

type Project = {
  packageName: string,
  projectFolder: string,
};
*/

async function getMonorepoPackages() /*: Promise<Packages> */ {
  const projectList /*: Array<Project> */ = await getProjects();

  const packages = await Promise.all(
    projectList.map(async project => {
      const contents = await readFile(
        path.join(project.projectFolder, "package.json"),
        "utf8",
      );
      return JSON.parse(contents);
    }),
  );

  const localPackages = new Map();
  for (const pkg of packages) {
    localPackages.set(pkg.name, pkg);
  }

  const pkgs /*: Packages */ = {};

  for (const project of projectList) {
    const pkg = localPackages.get(project.packageName);
    if (!pkg) throw new Error(`No package.json for ${project.packageName}`);

    const localDependencies /*: Set<string> */ = new Set();
    if (pkg.dependencies) {
      for (const dep of Object.keys(pkg.dependencies)) {
        if (localPackages.has(dep)) {
          localDependencies.add(dep);
        }
      }
    }
    if (pkg.devDependencies) {
      for (const dep of Object.keys(pkg.devDependencies)) {
        if (localPackages.has(dep)) {
          localDependencies.add(dep);
        }
      }
    }
    if (pkg.peerDependencies) {
      for (const dep of Object.keys(pkg.peerDependencies)) {
        if (localPackages.has(dep)) {
          localDependencies.add(dep);
        }
      }
    }
    if (pkg.optionalDependencies) {
      for (const dep of Object.keys(pkg.optionalDependencies)) {
        if (localPackages.has(dep)) {
          localDependencies.add(dep);
        }
      }
    }

    pkgs[project.packageName] = {
      location: project.projectFolder,
      localDependencies: Array.from(localDependencies),
    };
  }

  return pkgs;
}

async function getProjects() /*: Promise<Array<Project>> */ {
  const contents = await readFile("rush.json", "utf8");
  const json5 = parse(contents);
  return (json5.projects /*: Array<Project> */);
}
