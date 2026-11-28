import { notFound } from "next/navigation";
import { uuid } from "@/lib/domain";
import {
  officerAidPath,
  officerAllocationPath,
} from "@/lib/routes";
import { findAidAllocation } from "@/lib/server/aid";
import { AllocationHistory } from "../allocation-history";
import { OfficerPageBoundary, recordOfficerPage } from "../protected-dashboard";

export function AllocationRouteBoundary({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <OfficerPageBoundary kind="allocation">
      <ResolvedAllocationRoute params={params} />
    </OfficerPageBoundary>
  );
}

async function ResolvedAllocationRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AllocationPageContent id={id} />;
}

export async function AllocationPageContent({ id }: { id: string }) {
  if (!uuid.safeParse(id).success) notFound();
  const path = officerAllocationPath(id);
  await recordOfficerPage(path, `${officerAidPath}/[id]`);
  const allocation = await findAidAllocation(id);
  if (!allocation) notFound();
  return <AllocationHistory allocation={allocation} />;
}
