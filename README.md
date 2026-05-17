# AI Feed

PWA offline-first per leggere le ultime novità nel mondo AI.
Il PC processa gli articoli con Ollama; il telefono li legge anche offline via cache IndexedDB.

## Struttura

```
ai-feed/
├── backend/     FastAPI + pipeline RSS→Ollama→SQLite
└── frontend/    Next.js PWA con Service Worker + IndexedDB
```

## Setup Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

**Scegli il modello Ollama** in `pipeline.py` → variabile `OLLAMA_MODEL`.
Modelli consigliati per RX 7900 XTX (24GB):
- `qwen2.5:32b` — migliore qualità (~20GB)
- `qwen2.5:7b`  — più veloce (~5GB)
- `llama3.1:8b` — buon equilibrio

```powershell
ollama pull qwen2.5:7b   # o il modello scelto
```

**Prima esecuzione pipeline:**
```powershell
python pipeline.py
```

**Avvio server API:**
```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Pipeline automatica (ogni 6 ore) — Windows Task Scheduler:**
1. Apri Task Scheduler → Create Basic Task
2. Trigger: ogni 6 ore
3. Action: esegui `run_pipeline.bat`

## Setup Frontend

Installa Node.js da https://nodejs.org (LTS), poi:

```powershell
cd frontend
npm install
```

**Configura l'IP del tuo PC** in `.env.local`:
```
NEXT_PUBLIC_API_BASE=http://<IP-TAILSCALE>:8000
```

**Build e avvio:**
```powershell
npm run build
npm start        # oppure "npm run dev" per sviluppo
```

Accedi da telefono a `http://<IP-TAILSCALE>:3000` e usa
"Aggiungi a schermata Home" nel browser per installare la PWA.

## Tailscale (accesso da telefono fuori casa)

1. Installa Tailscale su PC e telefono (gratuito): https://tailscale.com
2. Entrambi entrano nella stessa rete virtuale
3. Usa l'IP Tailscale del PC (es. `100.x.x.x`) in `.env.local`

## Flusso offline

- App aperta + PC acceso → sync automatico nuovi articoli in IndexedDB
- App aperta + PC spento → leggi articoli già cachati, badge "offline"
- Torna online → sync automatico riprende
