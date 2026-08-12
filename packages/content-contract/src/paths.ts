export const defaultContentPaths = {
  moments: "src/data/moments",
  essays: "src/pages/docs",
  showcase: "src/showcase.json",
  images: "public/images",
} as const;

export function canonicalContentUrl(siteOrigin: string | URL, pathname: string): string {
  return new URL(pathname, siteOrigin).href;
}
