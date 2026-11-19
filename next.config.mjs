const pages = process.env.GITHUB_PAGES === "true";
const repo = (process.env.GITHUB_REPOSITORY || "").split("/")[1] || "";
const basePath = pages && repo && !repo.endsWith(".github.io") ? `/${repo}` : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(pages
    ? {
        output: "export",
        images: { unoptimized: true },
        trailingSlash: true,
        ...(basePath ? { basePath } : {}),
      }
    : {}),
};

export default nextConfig;
