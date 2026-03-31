const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

function normalizeProjectRoot(projectRoot) {
  if (process.platform !== "win32") {
    return projectRoot;
  }

  return projectRoot.replace(/^[a-z]:/, (drive) => drive.toUpperCase());
}

module.exports = getDefaultConfig(normalizeProjectRoot(path.resolve(__dirname)));
