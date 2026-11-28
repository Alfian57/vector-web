import { AllocationRouteBoundary } from "../allocation-route";

export default function AllocationDetailPage({ params }: PageProps<"/ppl/aid-allocations/[id]">) {
  return <AllocationRouteBoundary params={params} />;
}
