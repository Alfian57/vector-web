import type { AidAllocation, AidDelivery } from "@/lib/domain";

export type AidEdit =
  | { target: "allocation"; allocation: AidAllocation }
  | {
      target: "delivery" | "void-delivery";
      delivery: AidDelivery;
    };
