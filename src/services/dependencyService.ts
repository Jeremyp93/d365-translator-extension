import { fetchJson } from "./d365Api";

export type OptionSetUsageRow = {
  entityMetadataId: string;
  entityDisplayName: string;
  fieldMetadataId: string;
  fieldLogicalName: string;
  fieldDisplayName: string;
  dependencyTypeName: string;
  solutionName: string;
  solutionUniqueName: string;
};

type RetrieveDependenciesWithMetadataResponse = {
  DependencyMetadataCollection?: {
    DependencyMetadataInfoCollection?: Array<{
      requiredcomponentobjectid: string;
      requiredcomponenttype: number;

      dependentcomponenttype: number;
      dependentcomponentobjectid: string;
      dependentcomponentdisplayname: string | null;
      dependentcomponentname: string | null;

      dependentcomponentparentid: string | null;
      dependentcomponentparentdisplayname: string | null;

      dependencytypename: string | null;

      dependentcomponentbasesolutionname: string | null;
      dependentcomponentbasesolutionuniquename: string | null;
    }>;
  };
};

export async function getGlobalOptionSetUsage(
  clientUrl: string,
  optionSetId: string,
  apiVersion = 'v9.2',
): Promise<OptionSetUsageRow[]> {
  const url =
    `${clientUrl}/api/data/${apiVersion}` +
    `/RetrieveDependenciesForDeleteWithMetadata(ObjectId=${optionSetId},ComponentType=9)`;

  const res = await fetchJson(url) as RetrieveDependenciesWithMetadataResponse;

  const rows = res.DependencyMetadataCollection?.DependencyMetadataInfoCollection ?? [];

  // We only care about “dependent is a Field (2)” for the selected OptionSet (9)
  return rows
    .filter((r) => r.requiredcomponenttype === 9 && r.dependentcomponenttype === 2)
    .map((r) => ({
      entityMetadataId: r.dependentcomponentparentid ?? '',
      entityDisplayName: r.dependentcomponentparentdisplayname ?? '(unknown entity)',
      fieldMetadataId: r.dependentcomponentobjectid,
      fieldLogicalName: r.dependentcomponentname ?? '',
      fieldDisplayName: r.dependentcomponentdisplayname ?? '(unknown field)',
      dependencyTypeName: r.dependencytypename ?? '',
      solutionName: r.dependentcomponentbasesolutionname ?? '',
      solutionUniqueName: r.dependentcomponentbasesolutionuniquename ?? '',
    }))
    .filter((r) => r.entityMetadataId && r.fieldMetadataId);
}
