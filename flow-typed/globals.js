// https://github.com/facebook/flow/issues/2174
declare class Object {
  static entries<T>({ [string]: T }): Array<[string, T]>;
  static entries<T>({ [number]: T }): Array<[string, T]>;
}
