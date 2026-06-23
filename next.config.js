const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We have a stray lockfile higher up the tree; pin the tracing root to this project.
  outputFileTracingRoot: path.join(__dirname),
};
module.exports = nextConfig;
