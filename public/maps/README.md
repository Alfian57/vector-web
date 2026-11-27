# Data peta Karawang

- `karawang.pmtiles` berisi area Karawang dan sekitarnya dengan zoom maksimum 13. Sumbernya [Protomaps Basemap 25 November 2026](https://build.protomaps.com/20261125.pmtiles), turunan data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) yang tersedia dengan lisensi ODbL 1.0. Atribusi juga tampil pada peta.
- `karawang-districts.geojson` berisi 30 kecamatan Karawang dari [dataset Cahya DSN](https://github.com/cahyadsn/wilayah_boundaries/blob/d652492831fc746a3aaa899ab2f359099c2a69d1/db/kec/wilayah_boundaries_kec_32.sql). Koordinat dikonversi ke urutan GeoJSON bujur-lintang dan ID menggunakan kode kecamatan dengan tanda hubung. Lihat [lisensi MIT data kecamatan](DISTRICTS-LICENSE).

Untuk memperbarui basemap dengan arsip Protomaps versi 4 yang kompatibel, jalankan:

```sh
pmtiles extract https://build.protomaps.com/20261125.pmtiles public/maps/karawang.pmtiles \
  --bbox=106.96,-6.64,107.76,-5.85 --maxzoom=13
```

Pratinjau radar di beranda memakai tangkapan peta Karawang yang dirender dari kedua sumber data ini.
