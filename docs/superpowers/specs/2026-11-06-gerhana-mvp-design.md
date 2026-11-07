# Gerhana — Game Design Document (MVP)

Tanggal: 2026-11-06
Status: draf untuk direview
Judul "Gerhana" masih judul kerja.

## 1. Tujuan dan batasan

| Aspek | Keputusan |
|---|---|
| Tujuan | Rilis publik dan dijual |
| Platform pertama | Web (itch.io). Steam menyusul setelah MVP. |
| Mode MVP | Co-op 2 pemain melawan bot, online, masing-masing di device sendiri |
| Setelah MVP | PvP, mode solo, karakter ke-3, act ke-2, event Misteri, akun, progres antar run |
| Tema | Folklor Nusantara, nuansa horor-komedi chibi |
| Durasi satu run | 15–20 menit |
| Engine client | Godot 4, GDScript, export Web, renderer Compatibility |
| Server | Bun + TypeScript, WebSocket, otoritatif |
| Art | Pixel art 32×32 (boss 64×64), palet terbatas |
| Bahasa | Indonesia dan Inggris sejak awal |

**Kriteria sukses MVP:**
- Dua orang asing bisa membuat room, saling bergabung lewat kode, dan menyelesaikan satu run penuh di browser.
- Satu run selesai dalam 15–20 menit.
- Pasangan pemain baru menang sekitar 30–40% di run-run awal. Angka ini divalidasi dulu dengan simulasi, lalu dengan playtest.
- Playtester tertutup ingin "main lagi" setelah run pertama. Ini diukur dari tombol "Main lagi" dan kuesioner singkat.

## 2. Konsep dan cerita

**Pitch:** Deckbuilder co-op 2 pemain bertema folklor Nusantara. Dua pendekar menembus alam gaib dalam satu malam untuk menghentikan gerhana. Satu run berlangsung 15 menit, dan kedua pemain memilih jurus secara bersamaan.

**Cerita:**
- Batara Kala mulai menelan bulan.
- Kalau gerhana sempurna sebelum fajar, gerbang alam gaib terbuka dan para makhluk halus menyerbu desa.
- Dua pendekar masuk ke alam gaib untuk melawan mereka.
- Satu run adalah satu malam.

Cerita disampaikan lewat teks pendek di tiga titik: awal run, sebelum boss, dan layar menang atau kalah. Tidak ada cutscene.

**Nuansa:** horor-komedi. Makhluknya seram tapi lucu. Contohnya, tuyul mencuri koin pemain lalu kabur.

**Act MVP: Hutan Larangan.** Boss-nya Banaspati. Batara Kala disimpan sebagai boss final setelah MVP.

**Sensitivitas budaya:** tokoh yang masih disakralkan (Rangda, Barong, dewa-dewa Hindu Bali dan Jawa) tidak dijadikan musuh. Batara Kala sebagai antagonis berasal dari mitos ruwatan. Sebelum rilis, minta review dari orang yang paham budaya terkait.

## 3. Karakter

| Karakter | Peran | HP | Mekanik khas |
|---|---|---|---|
| Pendekar Silat | Penyerang | 42 | **Jurus Berantai:** setiap giliran berturut-turut memainkan minimal satu kartu ber-tag Jurus menambah 1 stack. Setiap stack memberi +1 damage ke semua kartu Serang. Stack kembali ke 0 kalau satu giliran tidak memainkan kartu Jurus. |
| Dalang | Pendukung | 36 | **Wayang:** memanggil wayang untuk dirinya atau rekan. Wayang menyerap damage sebelum perisai dan HP, bertahan antar giliran, dan hancur kalau HP-nya habis. Satu pemain hanya bisa dilindungi satu wayang. Wayang baru menambah HP wayang yang sudah ada. |

Di MVP, kedua pemain harus memilih karakter yang berbeda.

**Deck awal Pendekar (10 kartu):**
- 5× Tebas: Serang 6
- 4× Tangkis: Tahan 5
- 1× Jurus Harimau: Serang 8, tag Jurus

**Deck awal Dalang (10 kartu):**
- 4× Pukul Wayang: Serang 5
- 4× Tangkis: Tahan 5
- 1× Panggil Wayang: Bantu, memberi wayang 6 HP ke diri sendiri atau rekan
- 1× Restu: Bantu, kartu Serang target rekan di giliran ini mendapat +3 damage

**Pool hadiah:** 15 kartu per karakter. Setiap kartu punya versi upgrade dengan angka yang lebih besar. Daftar lengkapnya dirancang di M0 dan M1, dengan batasan berikut:
- Hanya memakai jenis kartu, status, dan kata kunci yang ada di dokumen ini.
- Minimal 3 kartu Serempak per karakter.
- Minimal 4 kartu Bantu Dalang yang bisa diarahkan ke rekan.

## 4. Aturan combat

### 4.1 Alur giliran

1. **Awal giliran:**
   - Setiap pemain menarik 4 kartu. Kalau tumpukan tarik habis, tumpukan buangan dikocok menjadi tumpukan tarik.
   - Setiap musuh menampilkan niatnya: jenis aksi, target, dan angka. Contoh: "Genderuwo → Dalang, Serang 12".
2. **Fase pilih (simultan):**
   - Setiap pemain memilih tepat 2 kartu dan target masing-masing. Pilihan ini rahasia.
   - Batas waktu 30 detik. Kalau kedua pemain sudah klik Siap, fase langsung berakhir.
   - Kalau waktu habis, pemain yang belum memilih otomatis memainkan 2 kartu pertama di tangannya. Target kartu Serang adalah musuh yang HP-nya paling rendah. Target kartu Bantu adalah diri sendiri.
3. **Eksekusi** dengan urutan tetap:
   1. Kartu Tahan dan Bantu, Pemain 1 lalu Pemain 2
   2. Kartu Serang, Pemain 1 lalu Pemain 2
   3. Musuh bertindak sesuai niat, dari kiri ke kanan
   4. Efek akhir giliran: Terbakar memberi damage, lalu semua status berkurang 1 stack
4. **Akhir giliran:**
   - Sisa kartu di tangan dibuang.
   - Perisai hilang. Wayang tetap ada.

Urutan eksekusi menjamin perisai dan buff selalu aktif sebelum musuh menyerang, berapa pun cepatnya pemain mengklik.

Kalau target sebuah kartu Serang sudah mati saat kartu itu dieksekusi, kartu itu pindah ke musuh hidup yang paling kiri.

### 4.2 Jenis kartu

- **Serang:** damage ke 1 musuh pilihan.
- **Tahan:** perisai untuk diri sendiri. Perisai menyerap damage dan hilang di akhir giliran.
- **Bantu:** efek ke diri sendiri atau rekan (wayang, buff, menghapus status).

### 4.3 Status

| Status | Efek | Durasi |
|---|---|---|
| Rentan | Menerima damage +50% | Berkurang 1 stack per giliran |
| Lemah | Memberi damage −25% | Berkurang 1 stack per giliran |
| Terbakar | Menerima damage sebesar jumlah stack di akhir giliran | Berkurang 1 stack setelah memberi damage |

Pembulatan damage selalu ke bawah, dengan minimal 0.

### 4.4 Kata kunci co-op

- **Serempak:** kartu Serang mendapat bonus (angkanya tertulis di kartu) kalau rekan juga memainkan kartu Serang ke musuh yang sama di giliran itu.
- **Ping:** klik musuh untuk menandai target di layar rekan. Ping tidak mengikat. Ini satu-satunya alat komunikasi di MVP.

### 4.5 Pingsan dan kalah

- Pemain dengan HP 0 menjadi pingsan. Pemain pingsan tidak menarik kartu dan tidak bermain sampai pertarungan berakhir.
- Musuh tidak menargetkan pemain yang pingsan.
- Setelah pertarungan dimenangkan, pemain yang pingsan bangkit dengan 25% HP maksimal.
- Run kalah kalau kedua pemain pingsan di pertarungan yang sama.

## 5. Musuh

Angka di bawah adalah nilai awal. Nilai final ditentukan lewat simulasi balancing. Setiap musuh mengulang pola niatnya dari awal setelah pola habis.

Niat yang bersifat bertahan (Lompat, Ancang-ancang) berlaku sejak niat itu ditampilkan di awal giliran, jadi efeknya sudah aktif saat kartu Serang pemain dieksekusi.

| Musuh | Jenis | HP | Pola niat |
|---|---|---|---|
| Tuyul | Biasa | 12 | Curi (Serang 3 + mencuri 10 koin dari target) → Curi → Kabur (keluar dari pertarungan sambil membawa koin curian). Kalau dikalahkan sebelum kabur, koin dikembalikan. |
| Kuntilanak | Biasa | 20 | Jerit (Lemah 2 ke kedua pemain) → Cakar 7 → Cakar 7 |
| Pocong | Biasa | 18 | Lompat (Serang ke Pocong di giliran ini −50%) → Hantam 8 |
| Babi Ngepet | Biasa | 16 | Seruduk 5 → Curi 15 koin → Kabur |
| Jenglot | Biasa | 14 | Hisap (Serang 5 + pulih 5) → Hisap |
| Genderuwo | Elite | 60 | Raung (Rentan 2 ke kedua pemain) → Ancang-ancang (tanpa serangan) → Pukul Bumi 20 → Pukul 10 |
| Wewe Gombel | Elite | 50 | Culik (menghancurkan wayang target; kalau target tidak punya wayang, Lemah 2) → Cakar 9 → Cakar 9 |
| Banaspati | Boss | 140 | **Fase 1 (HP > 50%):** Bola Api (Serang 8 ke kedua pemain + Terbakar 2) → Pukul 12. **Fase 2 (HP ≤ 50%):** Lautan Api (Terbakar 3 ke kedua pemain) → Serang 14 ke pemain dengan HP terendah. |

Ada sekitar 8 komposisi pertarungan biasa, misalnya "2 Tuyul + Kuntilanak" atau "Pocong + Jenglot". Semua angka sudah dirancang untuk tepat 2 pemain.

## 6. Struktur run

### 6.1 Lobby

1. Pemain 1 membuat room dan mendapat kode 6 karakter serta link undangan.
2. Pemain 2 bergabung lewat kode atau link.
3. Masing-masing mengisi nama dan memilih karakter, lalu kedua pemain klik Siap.

Tidak ada akun. Identitas sesi berupa token acak yang disimpan di browser.

### 6.2 Peta

- Peta terdiri dari 7 langkah lalu boss. Setiap langkah menawarkan 2 node.
- Kedua pemain vote node. Kalau vote berbeda, pilihan ditentukan dengan lempar koin beranimasi.

**Aturan pembuatan peta:**
- Langkah 1 selalu Pertarungan.
- Langkah 7 selalu Istirahat.
- Elite muncul sebagai pilihan di 1–2 langkah, tidak pernah di langkah 1–2.
- Warung muncul sebagai pilihan minimal sekali di langkah 3–6.

**Jenis node:**

| Node | Isi |
|---|---|
| Pertarungan | Musuh biasa |
| Elite | Musuh elite, hadiah tambahan berupa 1 Pusaka |
| Istirahat | Setiap pemain memilih: pulihkan 30% HP maksimal, atau upgrade 1 kartu |
| Warung | Setiap pemain bisa membeli kartu (50 koin per kartu, 3 pilihan) dan menghapus 1 kartu (75 koin) |

### 6.3 Hadiah dan ekonomi

- **Setelah pertarungan:**
  - Setiap pemain memilih 1 dari 3 kartu dari pool karakternya, atau skip.
  - Setiap pemain mendapat 15–25 koin dari pertarungan biasa, atau 40 koin dari Elite.
- Koin milik masing-masing pemain dan tidak dibagi.
- **Pusaka:**
  - Ada 10 Pusaka di MVP, didapat dari Elite.
  - Pusaka memberi efek pasif. 4 di antaranya berlaku untuk kedua pemain, misalnya "Keris Kembar: kartu Serempak +2 damage".
  - Setelah Elite dikalahkan, muncul 3 Pusaka acak. Pemain yang memberi damage terbesar di pertarungan itu memilih 1 dan memilikinya. Pusaka yang berlaku untuk kedua pemain tetap aktif untuk rekannya.
  - Batasan desain 10 Pusaka: setiap Pusaka hanya memakai mekanik yang ada di dokumen ini, dan tidak ada Pusaka yang mengubah aturan "pilih 2 dari 4". Daftar lengkapnya dirancang di M1.

### 6.4 Koneksi putus

1. Saat seorang pemain putus, room menyimpan state selama 2 menit dan timer giliran ditahan.
2. Pemain yang masuk lagi dengan token yang sama langsung melanjutkan dari state terakhir.
3. Setelah 2 menit, bot mengambil alih pemain itu. Bot memakai aturan pilih otomatis yang sama dengan saat timer habis. Pemain yang tersisa bisa menyelesaikan run.
4. Room dihapus kalau kedua pemain putus lebih dari 2 menit.

### 6.5 Akhir run

Layar ringkasan menampilkan total damage per pemain, kartu yang paling sering dimainkan, dan langkah terakhir yang dicapai. Tombol "Main lagi" memulai run baru dengan rekan yang sama di room yang sama.

## 7. Konten dan aset MVP

| Konten | Jumlah |
|---|---|
| Karakter | 2 |
| Kartu unik | ~36 (18 per karakter), masing-masing dengan versi upgrade |
| Musuh | 5 biasa, 2 elite, 1 boss |
| Komposisi pertarungan | ~8 |
| Pusaka | 10 |

**Art:**
- 2 hero dengan animasi idle, attack, dan hit
- 8 musuh dengan animasi yang sama
- 1 boss 64×64
- Frame kartu per jenis kartu + ~36 ikon kartu
- 2 background (hutan, arena boss), ikon node peta, dan UI

Art dibuat dengan pipeline generator sprite yang sudah ada (`make_hero.py`), lalu dirapikan di Pixelorama.

**Audio:**
- 3 trek musik bernuansa gamelan: peta, combat, boss
- Paket SFX

Semua audio harus berlisensi komersial, dari asset store atau commission.

**Teks:** semua string disimpan di file data dengan kunci terjemahan, dalam bahasa Indonesia dan Inggris. Istilah folklor tetap memakai bahasa Indonesia, dengan tooltip penjelasan dalam bahasa Inggris.

## 8. Arsitektur teknis

### 8.1 Komponen

| Komponen | Tanggung jawab | Bergantung pada |
|---|---|---|
| `rules` | Library TypeScript murni, tanpa I/O. Berisi tipe state, `resolveTurn(state, picks, rng) → { state, events }`, logika peta, hadiah, warung, dan istirahat. Semua konten (kartu, musuh, Pusaka, komposisi pertarungan) berupa data. RNG memakai seed. | Tidak ada |
| `server` | Bun + WebSocket. Mengurus room, kode undangan, timer giliran, token reconnect, dan bot pengganti. Server memvalidasi semua aksi lalu meneruskannya ke `rules`. | `rules` |
| `sim` | CLI Bun. Menjalankan ribuan run bot vs bot dengan seed berbeda, lalu melaporkan win rate, durasi rata-rata, dan tingkat pick dan menang per kartu. | `rules` |
| `client` | Godot 4, GDScript, export Web. Berisi semua layar dan memutar `events` dari server sebagai animasi. Client tidak berisi aturan game. | Protokol server |

`rules` adalah satu-satunya sumber kebenaran untuk aturan game. Komponen lain tidak boleh menghitung damage atau efek sendiri.

### 8.2 Protokol

Format pesan: JSON lewat WebSocket. Setiap pesan memiliki `type` dan `version`.

**Client → server:**
- `create_room`
- `join_room {code, name, token?}`
- `pick_character`
- `ready`
- `vote_node`
- `play_cards {cards: [{cardId, target}] × 2}`
- `ping_target`
- `choose_reward`
- `shop_buy`
- `shop_remove`
- `rest_choice`
- `play_again`

**Server → client:**
- `room_state`
- `run_state`
- `turn_start {hand, intents, deadline}`
- `partner_ready`
- `turn_resolved {events[]}`
- `reward_offer`
- `run_end`
- `error {code}`

Server hanya mengirim isi tangan milik pemain itu sendiri. Pilihan rekan baru terlihat lewat `turn_resolved`.

### 8.3 Penyimpanan dan hosting

- **State room disimpan di memori satu instance server.** Tidak ada database di MVP. Konsekuensinya, room yang sedang berjalan hilang kalau server restart. Deploy dilakukan di jam sepi. Database baru dibutuhkan saat akun atau leaderboard ditambahkan.
- **Hosting:** VPS + Docker, mengikuti pola portfolio-v3-api.
- **Wajib `wss://` (TLS).** itch.io memakai HTTPS, dan browser memblok `ws://` dari halaman HTTPS.

### 8.4 Keamanan

- Server memvalidasi setiap aksi: kartu memang ada di tangan pemain, jumlahnya tepat 2, targetnya valid, dan aksi sesuai fase saat ini. Aksi yang tidak valid ditolak dengan `error`, dan state tidak berubah.
- Origin allowlist: domain itch.io (`*.itch.zone`) dan localhost untuk development.
- Rate limit pesan per koneksi, dan rate limit `join_room` per IP untuk mencegah kode room ditebak dengan brute force.
- Batas ukuran pesan.
- Nama pemain dibatasi 16 karakter dan disaring dari karakter kontrol.

## 9. Testing

| Jenis | Isi | Alat |
|---|---|---|
| Unit | Setiap kartu, status, pola niat musuh, aturan pembuatan peta | `bun test` di `rules` |
| Replay | Seed + urutan pilihan yang sama selalu menghasilkan state akhir yang sama. Replay juga dipakai untuk mereproduksi bug dari laporan pemain. | `bun test` |
| Simulasi | Win rate bot vs bot 30–40%, durasi rata-rata setara 15–20 menit, tidak ada kartu dengan pick rate di atas 60% | `sim` |
| Integrasi | Dua client WebSocket palsu menyelesaikan satu run penuh, termasuk kasus putus lalu masuk lagi | `bun test` di `server` |
| Playtest | Build web di halaman itch.io yang di-restrict dengan password | Manual |

## 10. Milestone

| # | Milestone | Hasil | Perkiraan |
|---|---|---|---|
| M0 | Paper prototype | Kartu dicetak dan dimainkan berdua. Keputusan: lanjut, atau ubah loop "pilih 2 dari 4". | 1–2 akhir pekan |
| M1 | Rules engine + sim | `rules` dan `sim` lengkap dengan test. Win rate simulasi sesuai target. | 3–4 minggu |
| M2 | Server | Room, giliran, reconnect, bot pengganti. Integration test lulus. | 2 minggu |
| M3 | Client combat | Lobby + layar combat di Godot dengan art placeholder, terhubung ke server | 4–6 minggu |
| M4 | Client run | Peta, hadiah, warung, istirahat, ringkasan | 3 minggu |
| M5 | Konten final | Art, audio, terjemahan | 4–6 minggu |
| M6 | Playtest tertutup | Build di itch.io, kuesioner, perbaikan | 2 minggu |

Total sekitar 5–6 bulan, dikerjakan solo part-time. Angka ini perkiraan, bukan komitmen.

## 11. Risiko

| Risiko | Mitigasi |
|---|---|
| Loop "pilih 2 dari 4 secara simultan" ternyata tidak seru | Diuji di M0 sebelum ada kode |
| Co-op online sulit mendapat pemain | Link undangan yang mudah dibagikan. Mode solo adalah prioritas pertama setelah MVP. |
| Room hilang saat server restart | Deploy di jam sepi. Persistensi room dikerjakan setelah MVP. |
| Konten folklor dianggap tidak sensitif | Review budaya sebelum rilis. Tokoh sakral tidak dijadikan musuh. |
| Belajar Godot memperlambat M3 | Aturan game sudah selesai di TS, jadi client hanya mengurus tampilan |
