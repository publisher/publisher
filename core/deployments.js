// @flow
"use strict";

/*::
type CanaryPayload = {
  id: number,
  unchangedPackages: {
    [string]: string
  }
};
*/

const CanaryDeployment = {
  taskId: "publish:canary",

  serializePayload({ id, unchangedPackages } /*: CanaryPayload */) {
    const payload = {
      schema_version: 2,
      id,
      unchangedPackages,
    };
    return payload;
  },
  deserializePayload(deploymentPayload /*: Payload */) {
    const payload /*: any */ = deploymentPayload;
    if (payload.schema_version === 1) {
      return { id: payload.id, unchangedPackages: {} };
    } else if (payload.schema_version === 2) {
      return { id: payload.id, unchangedPackages: payload.unchangedPackages };
    }
    throw new Error("Invalid payload schema version");
  },
};

/*::
type StablePayload = {
  id: string,
};
*/

const StableDeployment = {
  taskId: "publish:stable_test",

  serializePayload({ id } /*: StablePayload */) /*: Payload */ {
    const payload = {
      schema_version: 1,
      id,
    };
    return payload;
  },
  deserializePayload(deploymentPayload /*: Payload */) /*: StablePayload */ {
    const payload /*: any */ = deploymentPayload;
    if (payload.schema_version === 1) {
      return {
        id: payload.id,
      };
    }
    throw new Error("Invalid payload schema version");
  },
};

/*::
type Payload = any;
*/

module.exports = {
  CanaryDeployment,
  StableDeployment,
};
