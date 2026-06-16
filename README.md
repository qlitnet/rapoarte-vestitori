# Rapoarte Vestitori

Aplicatie web pentru centralizarea rapoartelor lunare.

## Deploy pe Railway

### Pasul 1 — GitHub
1. Creaza un repo nou pe [github.com](https://github.com) (ex. `rapoarte-vestitori`)
2. Urca toate fisierele din acest folder

```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/USERNAME/rapoarte-vestitori.git
git push -u origin main
```

### Pasul 2 — Railway
1. Mergi la [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo** → selecteaza repo-ul
3. Railway detecteaza automat Node.js si porneste aplicatia

### Pasul 3 — Variabile de mediu (obligatoriu!)
In Railway → proiect → **Variables**, adauga:

| Variabila | Valoare |
|-----------|---------|
| `JWT_SECRET` | un sir lung random (ex. `xK9mP2qL8nR5vT3wA7jY1cH6`) |
| `NODE_ENV` | `production` |

### Pasul 4 — Volume pentru baza de date
In Railway → proiect → **Settings** → **Volumes**:
- Mount path: `/app/data`

Fara volume, baza de date se reseteaza la fiecare deploy!

### Pasul 5 — Domeniu
In Railway → **Settings** → **Networking** → **Generate Domain**

## Credentiale default
- **Username:** `admin`
- **Parola:** `admin123`

⚠️ Schimba parola admin imediat dupa primul login!

## Roluri
- **admin** — acces complet (persoane, grupe, useri, editare date)
- **editor** — poate edita doar ORE, ST.B., ROL, OBSERVATII

## Stack
- Node.js + Express
- SQLite (better-sqlite3)
- JWT + cookie httpOnly
- Frontend vanilla HTML/CSS/JS
