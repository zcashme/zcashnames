export function isEphemeralBlockinfoFilesystemRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

export function getDefaultBlockinfoOutputDir(): string | null {
  return isEphemeralBlockinfoFilesystemRuntime() ? "/tmp/blockinfo-post" : null;
}

export function getHostedConfigPersistenceMessage(): string {
  return "Hosted deterministic config editing is disabled on Vercel. Keep layout and caption-policy JSON checked into git, then redeploy.";
}
