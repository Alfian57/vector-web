"use client";

import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { apiData, errorMessage } from "@/lib/client";
import { aidAllocationsSchema } from "@/lib/api-contracts";
import { type AidAllocations, type District } from "@/lib/domain";
import { AidForm } from "./aid-form";
import { AllocationFields } from "./aid-corrections";
import { AllocationHistory } from "./allocation-history";
import { HistoryPages } from "./history";
import { tw } from "@/lib/tw";

const path = "ppl/aid-allocations";
const number = new Intl.NumberFormat("id-ID");

export function AidPanel({ id, districts, revision }: { id: string; districts: District[]; revision: string }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AidAllocations>();
  const [issue, setIssue] = useState("");
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void apiData(`${path}?page=${page}`, aidAllocationsSchema, { signal })
      .then((value) => {
        if (!signal.aborted) {
          setData(value);
          setIssue("");
        }
      })
      .catch((error) => {
        if (!signal.aborted) setIssue(errorMessage(error));
      });
    return () => controller.abort();
  }, [page, revision, reload]);

  function refresh() {
    setReload((value) => value + 1);
  }

  return (
    <section id={id} className={tw("panel aid-panel")} aria-labelledby="aid-title">
      <div className={tw("panel-heading")}>
        <div className={tw("section-title")}>
          <Package size={21} />
          <h2 id="aid-title">Alokasi bantuan</h2>
        </div>
      </div>
      <div className={tw("aid-grid")}>
        <AidForm
          path={path}
          button="Simpan alokasi"
          success="Alokasi bantuan tersimpan."
          disabled={!districts.length}
          onSaved={() => {
            if (page) {
              setPage(0);
              setData(undefined);
            }
            refresh();
          }}
        >
          <h3>Buat alokasi</h3>
          <AllocationFields districts={districts} />
        </AidForm>
        <div className={tw("aid-allocations")}>
          <h3 className={tw("panel-note")}>Daftar alokasi</h3>
          {issue && (
            <p className={tw("panel-note error-text")} role="alert">
              {issue}{" "}
              <button className={tw("text-link")} onClick={refresh}>
                Coba lagi
              </button>
            </p>
          )}
          {data ? (
            data.allocations.length ? (
              <ul className={tw("list aid-list")}>
                {data.allocations.map((allocation) => {
                  const remaining = allocation.quantity - allocation.deliveredQuantity;
                  const expanded = selected === allocation.id;
                  const status =
                    remaining === 0
                      ? "Selesai"
                      : remaining === allocation.quantity
                        ? "Direncanakan"
                        : "Penyaluran sebagian";
                  return (
                    <li key={allocation.id}>
                      <div className={tw("aid-row")}>
                        <div>
                          <strong>{allocation.item}</strong>
                          <p>{allocation.districtName}</p>
                          <p>
                            {number.format(allocation.deliveredQuantity)} dari {number.format(allocation.quantity)}{" "}
                            {allocation.unit} disalurkan
                          </p>
                          <p>
                            Sisa {number.format(remaining)} {allocation.unit}
                          </p>
                          {allocation.note && <p>{allocation.note}</p>}
                        </div>
                        <div className={tw("aid-controls")}>
                          <span className={tw("tag")}>{status}</span>
                          <button
                            className={tw("secondary")}
                            aria-expanded={expanded}
                            aria-controls={expanded ? `aid-${allocation.id}` : undefined}
                            aria-label={`${expanded ? "Tutup" : "Lihat"} penyaluran ${allocation.item}`}
                            onClick={() => setSelected(expanded ? undefined : allocation.id)}
                          >
                            {expanded ? "Tutup" : "Lihat penyaluran"}
                          </button>
                        </div>
                      </div>
                      {expanded && (
                        <AllocationHistory
                          allocation={allocation}
                          districts={districts}
                          revision={revision}
                          onDelivery={refresh}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={tw("empty")}>Belum ada alokasi bantuan.</p>
            )
          ) : (
            !issue && (
              <p className={tw("empty")} role="status">
                Memuat alokasi…
              </p>
            )
          )}
          <HistoryPages
            page={page}
            hasMore={data?.hasMore}
            onPage={(next) => {
              setPage(next);
              setSelected(undefined);
              setData(undefined);
            }}
          />
        </div>
      </div>
    </section>
  );
}
