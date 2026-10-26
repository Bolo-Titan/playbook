# Playbook

Basketball-Spielzüge zeichnen, animiert abspielen und als Datei an die Mannschaft verteilen.
Alle Daten bleiben lokal auf dem jeweiligen Gerät.

## Loslegen

Voraussetzung: [Node.js](https://nodejs.org) (LTS).

```bash
npm install
npm run dev
```

Dann im Browser `http://localhost:5173/playbook/` öffnen. Die Adresse unter „Network“ in der
Ausgabe funktioniert auch auf dem Handy im selben WLAN.

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver mit automatischem Neuladen |
| `npm test` | Tests ausführen |
| `npm run build` | Fertige Version nach `dist/` bauen |
| `npm run preview` | Gebaute Version lokal ansehen |

## Veröffentlichen auf GitHub Pages

1. Repository `playbook` auf GitHub anlegen. Heißt es anders, `base` in `vite.config.js` anpassen.
2. Im Repository: **Settings → Pages → Source: GitHub Actions**.
3. Code hochladen:
   ```bash
   git init
   git add .
   git commit -m "Erste Version"
   git branch -M main
   git remote add origin https://github.com/DEINNAME/playbook.git
   git push -u origin main
   ```
4. Unter **Actions** läuft der Build. Danach ist die App unter
   `https://DEINNAME.github.io/playbook/` erreichbar.

Jeder weitere `git push` auf `main` testet, baut und veröffentlicht automatisch.

## Für Spieler

1. Link öffnen und „Zum Home-Bildschirm“ hinzufügen.
2. Spielzug-Datei vom Trainer speichern.
3. In der App auf **Importieren** tippen und die Datei auswählen.

Mehr zum Aufbau des Codes steht in [`CLAUDE.md`](CLAUDE.md).
