require("esbuild").buildSync({
  entryPoints: ["auth-client.js"],
  outfile: "auth.bundle.js",
  bundle: true,
  minify: true,
  platform: "browser",
  target: ["es2020"],
});
