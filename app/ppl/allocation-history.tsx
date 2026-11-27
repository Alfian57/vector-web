"use client";

import { useEffect, useState } from "react";
import { apiData, errorMessage } from "@/lib/client";
import { aidHistorySchema } from "@/lib/api-contracts";
import { formatDate, type AidAllocation, type AidHistory, type District } from "@/lib/domain";
import { AidForm } from "./aid-form";
import { AidCorrectionForm, AidCorrectionHistory, DeliveryFields, type AidEdit } from "./aid-corrections";
import { HistoryPages } from "./history";
import { tw } from "@/lib/tw";

const path = "ppl/aid-allocations";
const number = new Intl.NumberFormat("id-ID");

export function AllocationHistory({
  allocation,
  districts,
  revision,
  onDelivery,
}: {
  allocation: AidAllocation;
  districts: District[];
  revision: string;
  onDelivery: () => void;
}) {
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [history, setHistory] = useState<AidHistory>();
  const [issue, setIssue] = useState("");
  const [edit, setEdit] = useState<AidEdit>();
  const [message, setMessage] = useState("");
  const deliveryPath = `${path}/${allocation.id}`;
  const remaining = allocation.quantity - allocation.deliveredQuantity;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void apiData(`${deliveryPath}?page=${page}`, aidHistorySchema, { signal })
      .then((value) => {
        if (!signal.aborted) {
          setHistory(value);
          setIssue("");
        }
      })
      .catch((error) => {
        if (!signal.aborted) setIssue(errorMessage(error));
      });
    return () => controller.abort();
  }, [deliveryPath, page, revision, reload]);

  function changed() {
    setPage(0);
    setReload((value) => value + 1);
    onDelivery();
  }

  function startEdit(input: AidEdit) {
    setMessage("");
    setEdit(input);
  }

  return (
    <section className={tw("aid-detail")} id={`aid-${allocation.id}`} aria-label={`Penyaluran ${allocation.item}`}>
      <div className={tw("aid-row")}>
        <h4>Riwayat penyaluran</h4>
        <button
          className={tw("secondary")}
          disabled={!!edit}
          onClick={() => startEdit({ target: "allocation", allocation })}
        >
          Koreksi alokasi
        </button>
      </div>
      {message && (
        <p className={tw("inline-note")} role="status">
          {message}
        </p>
      )}
      {issue && (
        <p className={tw("error-text")} role="alert">
          {issue}{" "}
          <button className={tw("text-link")} onClick={() => setReload((value) => value + 1)}>
            Coba lagi
          </button>
        </p>
      )}
      {history ? (
        history.deliveries.length ? (
          <ul className={tw("list")}>
            {history.deliveries.map((delivery) => (
              <li key={delivery.id}>
                <div>
                  <strong>{delivery.recipient}</strong>
                  <p>{formatDate(delivery.recordedAt)} WIB</p>
                  {delivery.note && <p>{delivery.note}</p>}
                </div>
                <div className={tw("aid-controls")}>
                  <span>
                    {number.format(delivery.quantity)} {allocation.unit}
                  </span>
                  {delivery.voided ? (
                    <span className={tw("tag tag-rejected")}>Dibatalkan</span>
                  ) : (
                    <>
                      <button
                        className={tw("secondary")}
                        disabled={!!edit}
                        aria-label={`Koreksi penyaluran ${delivery.recipient}`}
                        onClick={() => startEdit({ target: "delivery", delivery })}
                      >
                        Koreksi
                      </button>
                      <button
                        className={tw("secondary")}
                        disabled={!!edit}
                        aria-label={`Batalkan penyaluran ${delivery.recipient}`}
                        onClick={() => startEdit({ target: "void-delivery", delivery })}
                      >
                        Batalkan
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Belum ada penyaluran.</p>
        )
      ) : (
        !issue && <p role="status">Memuat penyaluran…</p>
      )}
      <HistoryPages
        page={page}
        hasMore={history?.hasMore}
        onPage={(next) => {
          setPage(next);
          setHistory(undefined);
        }}
      />
      {edit ? (
        <AidCorrectionForm
          path={deliveryPath}
          edit={edit}
          allocation={allocation}
          districts={districts}
          onCancel={() => setEdit(undefined)}
          onSaved={() => {
            setMessage(edit.target === "void-delivery" ? "Penyaluran dibatalkan." : "Koreksi bantuan tersimpan.");
            setEdit(undefined);
            changed();
          }}
        />
      ) : (
        <div hidden={remaining === 0}>
          <AidForm path={deliveryPath} button="Simpan penyaluran" success="Penyaluran tersimpan." onSaved={changed}>
            <h4>Catat penyaluran</h4>
            <DeliveryFields max={remaining} />
          </AidForm>
        </div>
      )}
      {remaining === 0 && (
        <p className={tw("inline-note")} role="status">
          Seluruh alokasi sudah disalurkan.
        </p>
      )}
      <AidCorrectionHistory path={deliveryPath} revision={`${revision}-${reload}`} />
    </section>
  );
}
