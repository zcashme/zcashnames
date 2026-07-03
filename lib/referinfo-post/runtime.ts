export function isEphemeralReferinfoFilesystemRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

export function getDefaultReferinfoOutputDir(): string {
  return isEphemeralReferinfoFilesystemRuntime() ? "/tmp/referinfo-post" : "output/referinfo-post";
}

export function getHostedReferinfoConfigMessage(): string {
  return "Hosted referinfo config editing is disabled on Vercel. Keep layout and caption-policy JSON checked into git, then redeploy.";
}
