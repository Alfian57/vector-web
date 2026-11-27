"use client";

import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatDate, type AidAllocation, type AidAllocations, type AidHistory, type District } from "@/lib/domain";
import { AidForm } from "./aid-form";
import { AidCorrectionForm, AidCorrectionHistory, AllocationFields, DeliveryFields, type AidEdit } from "./aid-corrections";
import { HistoryPages } from "./history";

const path = "ppl/aid-allocations";
const number = new Intl.NumberFormat("id-ID");

function AllocationHistory({ allocation, districts, revision, onDelivery }: {
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
    void api<AidHistory>(`${deliveryPath}?page=${page}`, { signal }).then((value) => {
      if (!signal.aborted) { setHistory(value); setIssue(""); }
    }).catch((error) => { if (!signal.aborted) setIssue(errorMessage(error)); });
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

  return <section className="aid-detail" id={`aid-${allocation.id}`} aria-label={`Penyaluran ${allocation.item}`}>
    <div className="aid-row"><h4>Riwayat penyaluran</h4>
      <button className="secondary" disabled={!!edit} onClick={() => startEdit({ target: "allocation", allocation })}>Koreksi alokasi</button></div>
    {message && <p className="inline-note" role="status">{message}</p>}
    {issue && <p className="error-text" role="alert">{issue} <button className="text-link" onClick={() => setReload((value) => value + 1)}>Coba lagi</button></p>}
    {history ? (history.deliveries.length ? <ul className="list">{history.deliveries.map((delivery) => <li key={delivery.id}>
      <div><strong>{delivery.recipient}</strong><p>{formatDate(delivery.recordedAt)} WIB</p>{delivery.note && <p>{delivery.note}</p>}</div>
      <div className="aid-controls"><span>{number.format(delivery.quantity)} {allocation.unit}</span>
        {delivery.voided ? <span className="tag tag-rejected">Dibatalkan</span> : <>
          <button className="secondary" disabled={!!edit} aria-label={`Koreksi penyaluran ${delivery.recipient}`} onClick={() => startEdit({ target: "delivery", delivery })}>Koreksi</button>
          <button className="secondary" disabled={!!edit} aria-label={`Batalkan penyaluran ${delivery.recipient}`} onClick={() => startEdit({ target: "void-delivery", delivery })}>Batalkan</button>
        </>}
      </div>
    </li>)}</ul> : <p>Belum ada penyaluran.</p>) : !issue && <p role="status">Memuat penyaluran…</p>}
    <HistoryPages page={page} hasMore={history?.hasMore} onPage={(next) => { setPage(next); setHistory(undefined); }} />
    {edit ? <AidCorrectionForm path={deliveryPath} edit={edit} allocation={allocation} districts={districts}
      onCancel={() => setEdit(undefined)} onSaved={() => {
        setMessage(edit.target === "void-delivery" ? "Penyaluran dibatalkan." : "Koreksi bantuan tersimpan.");
        setEdit(undefined);
        changed();
      }} /> : <div hidden={remaining === 0}>
      <AidForm path={deliveryPath} button="Simpan penyaluran" success="Penyaluran tersimpan." onSaved={changed}>
        <h4>Catat penyaluran</h4>
        <DeliveryFields max={remaining} />
      </AidForm>
    </div>}
    {remaining === 0 && <p className="inline-note" role="status">Seluruh alokasi sudah disalurkan.</p>}
    <AidCorrectionHistory path={deliveryPath} revision={`${revision}-${reload}`} />
  </section>;
}

export function AidPanel({ districts, revision }: { districts: District[]; revision: string }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AidAllocations>();
  const [issue, setIssue] = useState("");
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void api<AidAllocations>(`${path}?page=${page}`, { signal }).then((value) => {
      if (!signal.aborted) { setData(value); setIssue(""); }
    }).catch((error) => { if (!signal.aborted) setIssue(errorMessage(error)); });
    return () => controller.abort();
  }, [page, revision, reload]);

  function refresh() { setReload((value) => value + 1); }

  return <section className="panel aid-panel" aria-labelledby="aid-title">
    <div className="panel-heading"><div className="section-title"><Package size={21} /><h2 id="aid-title">Alokasi bantuan</h2></div></div>
    <div className="aid-grid">
      <AidForm path={path} button="Simpan alokasi" success="Alokasi bantuan tersimpan." disabled={!districts.length} onSaved={() => {
        if (page) { setPage(0); setData(undefined); }
        refresh();
      }}>
        <h3>Buat alokasi</h3>
        <AllocationFields districts={districts} />
      </AidForm>
      <div className="aid-allocations">
        <h3 className="panel-note">Daftar alokasi</h3>
        {issue && <p className="panel-note error-text" role="alert">{issue} <button className="text-link" onClick={refresh}>Coba lagi</button></p>}
        {data ? (data.allocations.length ? <ul className="list aid-list">{data.allocations.map((allocation) => {
          const remaining = allocation.quantity - allocation.deliveredQuantity;
          const expanded = selected === allocation.id;
          const status = remaining === 0 ? "Selesai" : remaining === allocation.quantity ? "Direncanakan" : "Penyaluran sebagian";
          return <li key={allocation.id}>
            <div className="aid-row">
              <div>
                <strong>{allocation.item}</strong><p>{allocation.districtName}</p>
                <p>{number.format(allocation.deliveredQuantity)} dari {number.format(allocation.quantity)} {allocation.unit} disalurkan</p>
                <p>Sisa {number.format(remaining)} {allocation.unit}</p>
                {allocation.note && <p>{allocation.note}</p>}
              </div>
              <div className="aid-controls"><span className="tag">{status}</span>
                <button className="secondary" aria-expanded={expanded} aria-controls={expanded ? `aid-${allocation.id}` : undefined}
                  aria-label={`${expanded ? "Tutup" : "Lihat"} penyaluran ${allocation.item}`}
                  onClick={() => setSelected(expanded ? undefined : allocation.id)}>{expanded ? "Tutup" : "Lihat penyaluran"}</button>
              </div>
            </div>
            {expanded && <AllocationHistory allocation={allocation} districts={districts} revision={revision} onDelivery={refresh} />}
          </li>;
        })}</ul> : <p className="empty">Belum ada alokasi bantuan.</p>) : !issue && <p className="empty" role="status">Memuat alokasi…</p>}
        <HistoryPages page={page} hasMore={data?.hasMore} onPage={(next) => { setPage(next); setSelected(undefined); setData(undefined); }} />
      </div>
    </div>
  </section>;
}
