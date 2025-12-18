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

export type AttributeDependencyRow = {
  componentType: number;
  componentTypeName: string;
  componentObjectId: string;
  componentName: string;
  componentDisplayName: string;
  dependencyTypeName: string;
  solutionName: string;
  solutionUniqueName: string;
  componentParentName: string;
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

  // We only care about "dependent is a Field (2)" for the selected OptionSet (9)
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

export async function getAttributeDependencies(
  clientUrl: string,
  attributeMetadataId: string,
  apiVersion = 'v9.2',
): Promise<AttributeDependencyRow[]> {
  const url =
    `${clientUrl}/api/data/${apiVersion}` +
    `/RetrieveDependenciesForDeleteWithMetadata(ObjectId=${attributeMetadataId},ComponentType=2)`;

  const res = await fetchJson(url) as RetrieveDependenciesWithMetadataResponse;

  const rows = res.DependencyMetadataCollection?.DependencyMetadataInfoCollection ?? [];

  // Component Type 24 = Form, 26 = Saved Query (View), 60 = System Form
  const formAndViewTypes = [24, 26, 60];

  const getComponentTypeName = (type: number): string => {
    switch (type) {
      case 24: return 'Form';
      case 26: return 'View';
      case 60: return 'System Form';
      default: return `Component Type ${type}`;
    }
  };

  return rows
    .filter((r) => r.requiredcomponenttype === 2 && formAndViewTypes.includes(r.dependentcomponenttype))
    .map((r) => ({
      componentType: r.dependentcomponenttype,
      componentTypeName: getComponentTypeName(r.dependentcomponenttype),
      componentObjectId: r.dependentcomponentobjectid,
      componentName: r.dependentcomponentname ?? '',
      componentDisplayName: r.dependentcomponentdisplayname ?? '(unknown)',
      componentParentName: r.dependentcomponentparentdisplayname ?? '',
      dependencyTypeName: r.dependencytypename ?? '',
      solutionName: r.dependentcomponentbasesolutionname ?? '',
      solutionUniqueName: r.dependentcomponentbasesolutionuniquename ?? '',
    }))
    .filter((r) => r.componentObjectId);
}
