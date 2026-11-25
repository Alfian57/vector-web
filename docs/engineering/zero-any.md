<!-- BEGIN my-skill-gweh -->
<!-- my-skill-gweh-sha256:d911bdc3ded30fcb01ea3eadc9fea34ff5fd7679b0bae53c29edc52fe4cf9042 -->
# zero-any

Gunakan unknown dan narrowing, bukan any atau penonaktifan pemeriksaan tipe TypeScript.

## TypeScript: data tidak tepercaya

- Gunakan `unknown` untuk JSON, response network, dan input dinamis; validasi lalu sempitkan tipe sebelum akses field.

- Hindari `any`, `as any`, `@ts-ignore`, dan nonaktifkan rule typecheck untuk melewati desain tipe.

- Pilih union yang diskriminatif untuk state sukses/error dan exhaustiveness check pada cabang penting.

- Bila library memang bertipe longgar, batasi cast pada satu adapter kecil dan dokumentasikan invariant yang diverifikasi.


## Tipe yang selaras dengan runtime

- Tipe compile-time tidak memvalidasi payload pada runtime; gunakan parser atau schema yang sudah dipakai proyek.

- Hindari duplikasi tipe yang bisa diimpor dari sumber pemiliknya.

- Jangan memperkenalkan TypeScript hanya demi menerapkan skill ini pada proyek yang tidak menggunakannya.


## Penerapan pada stack yang terdeteksi

- Belum ada catatan adaptasi khusus untuk stack ini. Ikuti aturan umum di panduan, periksa manifest, instruksi proyek, dan file sejenis, serta gunakan dokumentasi versi yang terpasang. Jangan menyalin konvensi dari framework lain.


## Pola narrowing

```ts
function readName(value: unknown): string | undefined {
  if (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string'
  ) {
    return value.name;
  }
  return undefined;
}
```


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
