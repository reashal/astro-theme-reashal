export const contractVersion = 1 as const;
export const contentContractPackageVersion = "1.0.0" as const;
export const supportedContractVersions = [contractVersion] as const;

export function supportsContractVersion(value: number): value is typeof contractVersion {
  return supportedContractVersions.includes(value as typeof contractVersion);
}
