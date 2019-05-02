/**
 * Flowtype definitions for index
 * Generated by Flowgen from a Typescript Definition
 * Flowgen v1.8.0
 * Author: [Joar Wilk](http://twitter.com/joarwilk)
 * Repo: http://github.com/joarwilk/flowgen
 */

import * as LRUCache from "lru-cache";
declare interface AppOptions {
  id: string;
  privateKey: string;
  baseUrl?: string;
  cache?: LRUCache<string, string>;
}
declare interface getInstallationAccessTokenOptions {
  installationId: number;
}
declare class App {
  constructor(options: AppOptions): this;
  getSignedJsonWebToken(): string;
  getInstallationAccessToken(
    options?: getInstallationAccessTokenOptions,
  ): Promise<string>;
}

declare module "@octokit/app" {
  declare module.exports: typeof App;
}
