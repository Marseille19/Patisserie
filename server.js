// Serveur MonCash - Délice de Jonathan. Aucune clé n'est exposée au navigateur.
const express = require('express'), fs = require('fs'), path = require('path');
try { fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach(l => { const m = l.match(/^\s*([A-Z_]+)\s*=\s*([^#\r\n]*)/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); }); } catch (e) {}
const { MONCASH_MODE = 'sandbox', MONCASH_CLIENT_ID, MONCASH_CLIENT_SECRET, SITE_URL = 'http://localhost:3000', PORT = 3000 } = process.env;
const HOST = MONCASH_MODE === 'live' ? 'moncashbutton.digicelgroup.com' : 'sandbox.moncashbutton.digicelgroup.com';
const API = `https://${HOST}/Api`, GATEWAY = `https://${HOST}/Moncash-middleware`;
const DB = path.join(__dirname, 'data', 'payments.json'), LOG = path.join(__dirname, 'data', 'transactions.log');
const load = () => { try { return JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) { return {}; } };
const save = d => fs.writeFileSync(DB, JSON.stringify(d, null, 2));
const log = (o, ev, extra = {}) => fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), order: o, ev, ...extra }) + '\n');
const STATUS = { PENDING: 'en_attente_paiement', PROGRESS: 'paiement_en_cours', OK: 'paiement_confirme', FAIL: 'paiement_echoue', MANUAL: 'attente_verification', CANCEL: 'annule' };

async function token() {
  if (!MONCASH_CLIENT_ID || !MONCASH_CLIENT_SECRET) throw new Error('Identifiants MonCash non configurés (.env)');
  const r = await fetch(`${API}/oauth/token`, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${MONCASH_CLIENT_ID}:${MONCASH_CLIENT_SECRET}`).toString('base64'), Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'scope=read,write&grant_type=client_credentials' });
  if (!r.ok) throw new Error('Authentification MonCash refusée (' + r.status + ')');
  return (await r.json()).access_token;
}
const call = async (ep, body) => { const r = await fetch(`${API}/v1/${ep}`, { method: 'POST', headers: { Authorization: 'Bearer ' + await token(), Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { ok: r.ok, data: await r.json().catch(() => ({})) }; };

const app = express();
app.use(express.json({ limit: '10kb' }));
if (process.env.ALLOWED_ORIGIN) app.use((req, res, next) => { res.set({ 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); if (req.method === 'OPTIONS') return res.sendStatus(204); next(); });

// Option A : création de la demande de paiement (le montant est celui envoyé par le panier, re-vérifié au retour)
app.post('/api/moncash/create', async (req, res) => {
  try {
    const { orderId, amount } = req.body || {}, amt = Math.round(Number(amount));
    if (!/^CMD-\d{8}-\d{4}$/.test(orderId || '') || !(amt >= 1 && amt <= 500000)) return res.status(400).json({ error: 'Commande ou montant invalide' });
    const db = load();
    if (db[orderId] && db[orderId].status === STATUS.OK) return res.status(409).json({ error: 'Cette commande est déjà payée' });
    const { ok, data } = await call('CreatePayment', { amount: amt, orderId });
    if (!ok || !data.payment_token) { log(orderId, 'create_failed', { data }); return res.status(502).json({ error: 'MonCash a refusé la demande de paiement' }); }
    db[orderId] = { orderId, amount: amt, status: STATUS.PROGRESS, history: [...(db[orderId]?.history || []), { at: new Date().toISOString(), action: STATUS.PROGRESS }] };
    save(db); log(orderId, 'created', { amount: amt });
    res.json({ redirectUrl: `${GATEWAY}/Payment/Redirect?token=${encodeURIComponent(data.payment_token.token)}` });
  } catch (e) { log('-', 'error', { msg: e.message }); res.status(500).json({ error: e.message }); }
});

// Retour depuis MonCash : vérification réelle côté serveur (jamais de confirmation sans réponse de l'API)
async function verify(orderId, transactionId) {
  const db = load(), o = db[orderId];
  if (!o) return { status: STATUS.FAIL, msg: 'Commande inconnue' };
  if (o.status === STATUS.OK) return { status: o.status, o };
  const { ok, data } = transactionId ? await call('RetrieveTransactionPayment', { transactionId }) : await call('RetrieveOrderPayment', { orderId });
  const p = data.payment;
  let st = STATUS.PROGRESS;
  if (ok && p) {
    const paid = String(p.message).toLowerCase() === 'successful' && Number(p.cost) === o.amount && p.reference === orderId;
    const dup = Object.values(db).some(x => x.orderId !== orderId && x.transactionId === p.transaction_id);
    if (paid && !dup) { st = STATUS.OK; o.transactionId = p.transaction_id; o.paidAt = new Date().toISOString(); }
    else if (paid) st = STATUS.MANUAL;
    else if (String(p.message).toLowerCase().includes('pending')) st = STATUS.PROGRESS;
    else st = STATUS.FAIL;
  } else if (ok === false) st = STATUS.FAIL;
  o.status = st; o.history.push({ at: new Date().toISOString(), action: st, tx: o.transactionId || null });
  save(db); log(orderId, 'verified', { st }); return { status: st, o };
}
const page = (st, o) => {
  const m = { [STATUS.OK]: ['✅', 'Paiement confirmé avec succès !', ''], [STATUS.PROGRESS]: ['⏳', 'Vérification de votre paiement en cours', '<p>Revenez sur cette page dans quelques minutes pour consulter le statut.</p>'], [STATUS.MANUAL]: ['⏳', 'Vérification manuelle en cours', ''], [STATUS.FAIL]: ['❌', 'Le paiement n\'a pas abouti', '<a class="b" href="/?retry=' + o.orderId + '">Réessayer le paiement</a>'] }[st] || ['❌', 'Erreur', ''];
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paiement - Délice de Jonathan</title><style>body{font-family:system-ui,sans-serif;background:#fdf6f0;display:grid;place-items:center;min-height:100vh;margin:0}.c{background:#fff;border-radius:16px;padding:36px;max-width:440px;box-shadow:0 10px 40px #0001;text-align:center}.i{font-size:3rem}.b{display:inline-block;margin-top:16px;padding:12px 26px;border-radius:30px;background:#d4577c;color:#fff;text-decoration:none}dl{text-align:left}dt{color:#888;font-size:.8rem;margin-top:8px}</style><div class="c"><div class="i">${m[0]}</div><h2>${m[1]}</h2>${m[2]}<dl><dt>Commande</dt><dd>${o.orderId}</dd><dt>Montant</dt><dd>${o.amount} HTG</dd>${o.transactionId ? `<dt>Référence de transaction</dt><dd>${o.transactionId}</dd>` : ''}</dl><a class="b" href="/">Retour à l'accueil</a></div>`;
};
// URL à enregistrer comme "Return URL" dans le portail MonCash Business : {SITE_URL}/api/moncash/return?orderId=CMD-...
app.get('/api/moncash/return', async (req, res) => {
  try {
    const orderId = String(req.query.orderId || ''), tx = req.query.transactionId ? String(req.query.transactionId).replace(/\D/g, '') : '';
    if (!orderId) return res.status(400).send('Commande manquante');
    const r = await verify(orderId, tx); res.send(page(r.status, r.o || { orderId, amount: 0 }));
  } catch (e) { res.status(500).send('Erreur de vérification : ' + e.message); }
});
app.get('/api/moncash/status/:orderId', (req, res) => { const o = load()[req.params.orderId]; res.json(o ? { status: o.status, amount: o.amount, transactionId: o.transactionId || null } : { status: null }); });
// Option B : le serveur enregistre la déclaration, sans jamais marquer "payé"
app.post('/api/moncash/manual', (req, res) => { const { orderId, amount } = req.body || {}; if (!orderId) return res.status(400).end(); const db = load(); db[orderId] = { ...(db[orderId] || { orderId, amount: Number(amount) || 0, history: [] }), status: STATUS.MANUAL }; db[orderId].history.push({ at: new Date().toISOString(), action: STATUS.MANUAL }); save(db); log(orderId, 'manual_declared'); res.json({ status: STATUS.MANUAL }); });

app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => console.log(`Délice de Jonathan : ${SITE_URL} (MonCash ${MONCASH_MODE})`));
