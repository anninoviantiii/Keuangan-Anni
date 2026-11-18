// ===== ISI 2 BARIS INI =====
const API = 'https://script.google.com/macros/s/AKfycbzIITI5i-5W7iYFFPLHSQZnUL9T-AhI6uye1H3D8izdF6mWTBI5MHaZ4AAjwg804wD-og/exec';
const CID = '1096810601489-i3tq2bkkbcapl43ojr9bl5eqc43ebhue.apps.googleusercontent.com';
// ===========================
const REK = ['Jago','BCA','BNI','Mandiri','GoPay','OVO','ShopeePay'];
const CAT = {out:['Makan','Transport','Belanja','Tagihan','Kesehatan','Hiburan','Pendidikan','Lainnya'], in:['Gaji','Hibah/Proyek','Freelance','Lainnya']};
const $ = s => document.querySelector(s);
const rp = n => (n < 0 ? '-' : '') + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID');
const iso = d => d.toLocaleDateString('sv');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let D, tok = localStorage.tok || '', per = 'bulan', tab = 'home', cs = iso(new Date()), ce = cs, F = {q:'', cat:'', d:''}, S, ed;

function toast(m, e) { const t = $('#toast'); t.textContent = m; t.className = 'show' + (e ? ' err' : ''); clearTimeout(t.h); t.h = setTimeout(() => t.className = '', 2800); }

async function api(b) {
  const r = await fetch(API, {method:'POST', body: JSON.stringify({token: tok, ...b})});
  const j = await r.json();
  if (j.error === 'auth') { logout(); throw new Error('Sesi habis, silakan masuk lagi'); }
  if (j.error) throw new Error(j.error);
  return j;
}
function initG() {
  if (!window.google) return setTimeout(initG, 200);
  google.accounts.id.initialize({client_id: CID, auto_select: true, callback: r => { tok = r.credential; localStorage.tok = tok; load(); }});
  google.accounts.id.renderButton($('#gbtn'), {theme:'outline', size:'large', shape:'pill'});
  google.accounts.id.prompt();
}
function logout() { tok = ''; delete localStorage.tok; $('#app').hidden = $('nav').hidden = true; $('#login').hidden = false; initG(); }
async function load() {
  $('#login').hidden = true; $('#app').hidden = $('nav').hidden = false;
  $('#app').classList.add('busy');
  try { D = await api({action:'list'}); render(); } catch (e) { toast(e.message, 1); }
  $('#app').classList.remove('busy');
}

const all = () => [...D.in, ...D.out, ...D.tf];
function range() {
  const t = new Date(), y = t.getFullYear(), m = t.getMonth(), d = t.getDate(), T = new Date(y, m, d);
  if (per === 'hari') return [T, T];
  if (per === 'minggu') return [new Date(y, m, d - (t.getDay() + 6) % 7), T];
  if (per === 'bulan') return [new Date(y, m, 1), T];
  return [new Date(cs + 'T00:00'), new Date(ce + 'T00:00')];
}
const sum = a => a.reduce((s, x) => s + x.nom, 0);
function saldoRek() {
  return D.saldo.map(s => { let v = s.saldo;
    D.in.forEach(x => { if (x.rek === s.rek && x.tgl >= s.tgl) v += x.nom; });
    D.out.forEach(x => { if (x.rek === s.rek && x.tgl >= s.tgl) v -= x.nom; });
    D.tf.forEach(x => { if (x.tgl >= s.tgl) { if (x.rek === s.rek) v -= x.nom; if (x.ke === s.rek) v += x.nom; } });
    return {rek: s.rek, v}; });
}
function render() {
  document.querySelectorAll('nav [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  tab === 'home' ? home() : hist();
}

function trend(s, e, days, inn, out) {
  const m = days > 31, key = t => m ? t.slice(0, 7) : t, B = {};
  for (let d = new Date(s); d <= e; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) B[key(iso(d))] ||= [0, 0];
  inn.forEach(x => B[key(x.tgl)][0] += x.nom); out.forEach(x => B[key(x.tgl)][1] += x.nom);
  const ks = Object.keys(B), mx = Math.max(1, ...ks.flatMap(k => B[k]));
  const lab = k => m ? k.slice(5) + '/' + k.slice(2, 4) : k.slice(8) + '/' + k.slice(5, 7);
  const pk = ks.reduce((a, k) => B[k][1] > B[a][1] ? k : a, ks[0]);
  return `<h2>Tren ${m ? 'bulanan' : 'harian'}</h2><div class="card"><div class="tr">${ks.map(k => `<div><i class="ti" style="height:${B[k][0] / mx * 100}%"></i><i class="to" style="height:${B[k][1] / mx * 100}%"></i></div>`).join('')}</div>
  <div class="tl"><span>${lab(ks[0])}</span><span>${lab(ks[ks.length - 1])}</span></div>
  <div class="tl"><span><u class="ti"></u> Pemasukan</span><span><u class="to"></u> Pengeluaran</span></div>
  ${B[pk][1] ? `<div class="mut" style="margin-top:6px">Pengeluaran tertinggi: <b>${lab(pk)}</b> (${rp(B[pk][1])})</div>` : ''}</div>`;
}

function home() {
  let [s, e] = range(); if (e < s) e = s;
  const days = Math.round((e - s) / 864e5) + 1, a = iso(s), b = iso(e);
  const ps = new Date(s - days * 864e5), pe = new Date(s - 864e5);
  const inn = D.in.filter(x => x.tgl >= a && x.tgl <= b), out = D.out.filter(x => x.tgl >= a && x.tgl <= b);
  const I = sum(inn), O = sum(out), prevO = sum(D.out.filter(x => x.tgl >= iso(ps) && x.tgl <= iso(pe)));
  const cats = {}; out.forEach(x => cats[x.cat] = (cats[x.cat] || 0) + x.nom);
  const cl = Object.entries(cats).sort((x, y) => y[1] - x[1]);
  const sr = saldoRek(), tot = sr.reduce((q, x) => q + x.v, 0);
  const pct = I + O ? I / (I + O) * 100 : 0;
  let ins = '';
  if (cl.length) {
    ins += `<p>Terbesar: <b>${esc(cl[0][0])}</b> ${rp(cl[0][1])} (${Math.round(cl[0][1] / O * 100)}% dari pengeluaran)</p>`;
    ins += `<p>Rata-rata pengeluaran harian: <b>${rp(O / days)}</b></p>`;
  }
  if (prevO) { const d = (O - prevO) / prevO * 100; ins += `<p>Pengeluaran <b class="${d > 0 ? 'out' : 'in'}">${d > 0 ? 'naik' : 'turun'} ${Math.abs(Math.round(d))}%</b> dibanding periode sebelumnya (${rp(prevO)})</p>`; }
  const rk = `<h2>Saldo rekening · ${rp(tot)}</h2>` + (sr.length ? `<div class="rek">${sr.map(x => `<div><small>${esc(x.rek)}</small><b class="num">${rp(x.v)}</b></div>`).join('')}</div>` : '<div class="card empty">Sheet "Saldo Awal" masih kosong. Jalankan fungsi setup() di Apps Script.</div>');
  $('#app').innerHTML = `
  <div class="hero"><small>Saldo bersih periode ini</small><div class="big num">${rp(I - O)}</div>
   <div class="row"><div><small>Pemasukan</small><b class="num">${rp(I)}</b></div><div><small>Pengeluaran</small><b class="num">${rp(O)}</b></div></div></div>
  ${rk}
  <div class="per">${[['hari','Hari ini'],['minggu','Minggu ini'],['bulan','Bulan ini'],['kustom','Kustom']].map(([k, l]) => `<button class="${per === k ? 'on' : ''}" data-p="${k}">${l}</button>`).join('')}</div>
  ${per === 'kustom' ? `<div class="flt" style="margin-top:8px"><input type="date" id="cs" value="${cs}"><input type="date" id="ce" value="${ce}"></div>` : ''}
  <h2>Pemasukan vs pengeluaran</h2>
  <div class="card">${I + O ? `<div class="cmp"><i style="width:${pct}%;background:var(--in)"></i><i style="width:${100 - pct}%;background:var(--out)"></i></div><div class="mut">${Math.round(pct)}% pemasukan, ${Math.round(100 - pct)}% pengeluaran</div>` : '<div class="empty">Belum ada transaksi di periode ini.<br>Ketuk + untuk mencatat.</div>'}</div>
  ${I + O ? trend(s, e, days, inn, out) : ''}
  ${cl.length ? `<h2>Pengeluaran per kategori</h2><div class="card">${cl.map(([k, v]) => `<div class="bar"><div class="t"><span>${esc(k)}</span><b class="num">${rp(v)}</b></div><div class="b"><i style="width:${v / cl[0][1] * 100}%"></i></div></div>`).join('')}</div><h2>Insight</h2><div class="card ins">${ins}</div>` : ''}
`;
}

function hist() {
  const cats = [...new Set([...CAT.out, ...CAT.in])];
  let l = all().sort((x, y) => y.tgl.localeCompare(x.tgl) || y.row - x.row);
  const q = F.q.toLowerCase();
  l = l.filter(x => (!q || [x.cat, x.note, x.rek, x.ke].join(' ').toLowerCase().includes(q)) && (!F.cat || x.cat === F.cat) && (!F.d || x.tgl === F.d));
  $('#app').innerHTML = `<h2 style="margin-top:0">Riwayat</h2>
  <div class="flt"><input id="q" placeholder="Cari catatan, kategori, rekening" value="${esc(F.q)}">
  <select id="fc"><option value="">Semua kategori</option>${cats.map(c => `<option ${F.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
  <input type="date" id="fd" value="${F.d}"></div>
  ${l.length ? l.slice(0, 100).map((x, i) => `<button class="it" data-i="${i}"><span><b>${x.sh === 'tf' ? esc(x.rek) + ' → ' + esc(x.ke) : esc(x.cat)}</b><small>${esc(x.note || '')} ${x.rek && x.sh !== 'tf' ? '· ' + esc(x.rek) : ''} · ${x.tgl}</small></span><b class="num ${x.sh}">${x.sh === 'out' ? '-' : x.sh === 'in' ? '+' : ''}${rp(x.nom)}</b></button>`).join('') : '<div class="empty">Tidak ada transaksi yang cocok.</div>'}`;
  hist.l = l;
}

function openSheet(x) {
  ed = x || null;
  S = {jenis: x ? x.sh : 'out', cat: x?.cat || '', rek: x?.rek || '', ke: x?.ke || '', tgl: x?.tgl || iso(new Date()), nom: x?.nom || '', note: x?.note || ''};
  drawSheet(); $('#sheet').hidden = false;
  setTimeout(() => $('#nom').focus(), 50);
}
const chips = (g, arr) => `<div class="chips">${arr.map(v => `<button type="button" class="chip ${S[g] === v ? 'on' : ''}" data-g="${g}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;
function sync() { S.nom = +($('#nom').value.replace(/\D/g, '')) || ''; S.tgl = $('#tg').value; S.note = $('#nt').value; }
function drawSheet() {
  const tf = S.jenis === 'tf';
  $('#sheet .panel').innerHTML = `
  <div class="seg">${[['out','Pengeluaran'],['in','Pemasukan'],['tf','Transfer']].filter(([k]) => !ed || k === S.jenis).map(([k, l]) => `<button type="button" class="chip ${S.jenis === k ? 'on' : ''}" data-j="${k}">${l}</button>`).join('')}</div>
  <input id="nom" class="amt" inputmode="numeric" placeholder="Rp 0" value="${S.nom ? S.nom.toLocaleString('id-ID') : ''}">
  ${tf ? '' : `<label>${S.jenis === 'in' ? 'Sumber' : 'Kategori'}</label>${chips('cat', CAT[S.jenis])}`}
  <label>${tf ? 'Dari rekening' : S.jenis === 'in' ? 'Masuk ke rekening' : 'Diambil dari rekening'}</label>${chips('rek', REK)}
  ${tf ? `<label>Ke rekening</label>${chips('ke', REK)}` : ''}
  <label>Tanggal</label><input type="date" id="tg" value="${S.tgl}">
  <label>Catatan (opsional)</label><input id="nt" value="${esc(S.note)}" maxlength="120">
  <button class="go" id="save">${ed ? 'Simpan perubahan' : 'Simpan'}</button>${ed ? '<button class="del" id="del">Hapus transaksi</button>' : ''}`;
}
async function save() {
  sync();
  const err = !(S.nom > 0) ? 'Isi nominal lebih dari 0' : S.jenis !== 'tf' && !S.cat ? 'Pilih kategori' : !S.rek ? 'Pilih rekening' : S.jenis === 'tf' && (!S.ke || S.ke === S.rek) ? 'Pilih rekening tujuan yang berbeda' : !S.tgl ? 'Isi tanggal' : '';
  if (err) return toast(err, 1);
  const btn = $('#save'); btn.disabled = true; btn.textContent = 'Menyimpan…';
  try {
    await api({action: ed ? 'update' : 'add', jenis: S.jenis, row: ed?.row, chk: ed?.nom, tgl: S.tgl, nom: S.nom, cat: S.cat, rek: S.rek, ke: S.ke, note: S.note});
    $('#sheet').hidden = true; toast('Tersimpan'); await refresh();
  } catch (e) { toast('Gagal menyimpan: ' + e.message, 1); btn.disabled = false; btn.textContent = 'Simpan'; }
}
async function del() {
  if (!confirm('Hapus transaksi ini? Barisnya juga hilang dari spreadsheet.')) return;
  try { await api({action: 'delete', jenis: ed.sh, row: ed.row, chk: ed.nom}); $('#sheet').hidden = true; toast('Terhapus'); await refresh(); }
  catch (e) { toast('Gagal menghapus: ' + e.message, 1); }
}
async function refresh() { try { D = await api({action: 'list'}); render(); } catch (e) { toast(e.message, 1); } }

document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) { if (e.target.id === 'sheet') e.target.hidden = true; return; }
  if (t.dataset.t) { tab = t.dataset.t; render(); }
  else if (t.id === 'fab') openSheet();
  else if (t.dataset.p) { per = t.dataset.p; home(); }
  else if (t.dataset.i != null) openSheet(hist.l[+t.dataset.i]);
  else if (t.dataset.j) { sync(); S.jenis = t.dataset.j; S.cat = ''; drawSheet(); $('#nom').focus(); }
  else if (t.dataset.g) { S[t.dataset.g] = t.dataset.v; t.parentNode.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === t)); }
  else if (t.id === 'save') save();
  else if (t.id === 'del') del();
});
document.addEventListener('input', e => {
  const i = e.target;
  if (i.id === 'nom') { const v = i.value.replace(/\D/g, ''); i.value = v ? (+v).toLocaleString('id-ID') : ''; }
  else if (i.id === 'q') { F.q = i.value; const p = i.selectionStart; hist(); $('#q').focus(); $('#q').setSelectionRange(p, p); }
  else if (i.id === 'fc') { F.cat = i.value; hist(); }
  else if (i.id === 'fd') { F.d = i.value; hist(); }
  else if (i.id === 'cs' || i.id === 'ce') { if (i.id === 'cs') cs = i.value; else ce = i.value; if (cs && ce) home(); }
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
if (tok) load(); else initG();
