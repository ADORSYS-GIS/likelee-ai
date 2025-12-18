export function createPageUrl(pageName: string): string {
  return "/" + pageName.toLowerCase().replace(/ /g, "-");
}

export { getUserFriendlyError } from "./error-utils";
