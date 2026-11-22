import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID ?? "prj_c3Y2TUIgKWa3Q7XspENgQzv4ZgUh";

if (!token) throw new Error("VERCEL_TOKEN is required");

const skipDirs = new Set(["node_modules", ".next", "data", ".git", ".vercel"]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(root).map((full) => ({
  file: relative(root, full),
  data: readFileSync(full).toString("base64"),
  encoding: "base64",
}));

console.log(`Uploading ${files.length} source files...`);

const create = await fetch(
  "https://api.vercel.com/v13/deployments?forceNew=1&skipAutoDetectionConfirmation=1",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "my-storefront",
      project: projectId,
      target: "production",
      projectSettings: {
        framework: "nextjs",
        installCommand: "npm install",
        buildCommand:
          "NODE_OPTIONS=--max-old-space-size=6144 npm run build",
        nodeVersion: "22.x",
      },
      files,
    }),
  },
);

const created = await create.json();
if (!create.ok) {
  console.error(JSON.stringify(created, null, 2));
  process.exit(1);
}

console.log(`Deployment created: ${created.id} (${created.readyState})`);

let state = created.readyState;
let deployment = created;
for (let i = 0; i < 90; i++) {
  if (state === "READY" || state === "ERROR" || state === "CANCELED") break;
  await new Promise((r) => setTimeout(r, 2000));
  const res = await fetch(
    `https://api.vercel.com/v13/deployments/${created.id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  deployment = await res.json();
  state = deployment.readyState ?? deployment.state;
  if (i % 5 === 0) console.log(`  ${state}`);
}

console.log(JSON.stringify({
  id: deployment.id,
  state,
  url: deployment.url,
  alias: deployment.alias,
  errorMessage: deployment.errorMessage,
  errorCode: deployment.errorCode,
}, null, 2));

if (state !== "READY") process.exit(1);
