# Playbook – Projektkontext für Claude

## Worum es geht

Eine Web-App für Basketball-Trainer und Spieler: Spielzüge auf einem Halbfeld zeichnen,
animiert abspielen und als Datei an die Mannschaft verteilen.

- **Trainer** erstellt Spielzüge im Editor und verschickt sie als `.json`-Datei (WhatsApp, E-Mail).
- **Spieler** importieren die Datei und schauen sich die Animation im Archiv an.
- **Alles bleibt lokal auf dem Gerät.** Kein Server, kein Login, keine Cloud-Datenbank.
  Die gehostete Seite (GitHub Pages) liefert nur das Programm aus, nicht die Daten.

Die Zielgruppe nutzt die App überwiegend auf dem **Handy** (Touch), der Trainer auch am PC.

## Befehle

```bash
npm install        # einmalig
npm run dev        # Entwicklungsserver (http://localhost:5173/playbook/, --host = auch im WLAN erreichbar)
npm test           # Vitest einmal ausführen
npm run test:watch # Vitest im Watch-Modus
npm run build      # Produktions-Build nach dist/
npm run preview    # dist/ lokal ansehen (http://localhost:4173/playbook/)
```

Nach jeder Änderung: `npm test` und `npm run build` müssen fehlerfrei durchlaufen.

## Technik

- **Vanilla JavaScript** mit ES-Modulen, **kein Framework** (bewusste Entscheidung, siehe unten).
- **Vite** als Entwicklungsserver und Build-Tool, **Vitest** für Tests.
- **Keine Laufzeit-Abhängigkeiten.** `dependencies` in `package.json` ist leer und soll es bleiben,
  außer es gibt einen sehr guten Grund.
- Grafik mit **SVG** (kein Canvas), Animation mit `requestAnimationFrame`.
- Speicherung in **localStorage** (Schlüssel `playbook.spielzuege.v1`).
- Deployment: **GitHub Pages** über `.github/workflows/deploy.yml` bei Push auf `main`.

## Struktur

```
index.html              HTML-Gerüst aller Ansichten (<section id="v-NAME" class="view">)
public/icon.svg         Favicon
src/
  main.js               Einstieg: Ansichten registrieren, Klicks, Import, Drag & Drop
  core/                 REINE Logik, kein DOM → testbar mit Vitest
    constants.js        Kategorien, Startaufstellung, Zeiten, Feldgrenzen
    model.js            newPlay, stateAt, positionsAt, stepBeats, passBeat, tidyStep, describeStep
    migrate.js          migratePlay: alte Spielzüge (Version 1) auf das aktuelle Modell bringen
    note.js             noteBlocks: Notizen in Absätze und Aufzählungen zerlegen
    geometry.js         polyD, smoothD (Catmull-Rom → Bézier), moveD
  io/
    exchange.js         REIN: Dateiformat, validatePlay, parsePlays, mergePlays, slug
    files.js            Browser: Download, Teilen-Menü (Web Share API), importFiles
  storage/store.js      localStorage-Zugriff (einzige Stelle, die den Speicher kennt)
  render/
    svg.js              el(), measurer() (Pfadlänge über getPointAtLength)
    court.js            Spielfeld, Spieler, Ball, Linienarten, renderScene
    animator.js         Klasse Animator: abspielen, pausieren, Schritt wählen
  ui/
    dom.js              $, esc, fmtDate, toast
    router.js           register/go/currentView
  views/
    dashboard.js        Übersicht
    archive.js          Archiv mit Suche/Filter, „Alle exportieren“
    viewer.js           Abspielen, Teilen, Bearbeiten, Löschen
    editor.js           Zeichnen: Werkzeuge, Schritte, Speichern
    playCard.js         Vorschaukarte (Übersicht + Archiv)
  styles/
    base.css            Farben (CSS-Variablen inkl. Dark Mode), Layout, Buttons
    court.css           Spielfeld und Figuren
tests/                  Vitest-Tests für core/ und io/exchange.js
```

### Regeln für die Abhängigkeiten

Abhängigkeiten zeigen nur **nach unten**:

```
views  →  render, io, storage, ui  →  core
```

- `core/` und `io/exchange.js` importieren **nichts aus dem Browser** (kein `document`, `window`,
  `localStorage`). So bleiben sie in Node testbar. Neue Logik möglichst hier ansiedeln und testen.
- Nur `storage/store.js` greift auf `localStorage` zu.
- Ansichten rufen sich nicht direkt gegenseitig auf, sondern navigieren über `go(name, params)`.

### Router

Eine Ansicht ist ein Objekt mit optional `tab`, `init()`, `enter(params)`, `leave()`.
`main.js` ruft `init()` einmal auf und registriert sie. `go()` blendet die passende `<section>` ein,
markiert den Menüpunkt (`tab`) und ruft `leave()` der alten sowie `enter(params)` der neuen Ansicht auf.

- `go('viewer', { id })` öffnet einen Spielzug.
- `go('editor')` setzt einen ungespeicherten Entwurf fort oder beginnt einen neuen.
- `go('editor', { play, isEdit: true })` bearbeitet einen vorhandenen Spielzug.

## Datenmodell

Koordinaten: **FIBA-Halbfeld in Dezimetern**, 150 breit × 140 tief, Ursprung oben links an der
Grundlinie, Korbmitte bei (75 | 15,75). SVG-`viewBox` ist `-12 -12 174 156`: 12 dm Rand hinter der
Grundlinie und neben den Seitenlinien (Platz für Einwerfer), 4 dm an der Mittellinie. Koordinaten
außerhalb 0–150 / 0–140 sind also erlaubt; `COURT_LIMITS` begrenzt sie.

```js
{
  id: "m3x9k2abc123",            // eindeutig; gleiche id beim Import = Update
  name: "Pick and Roll",
  category: "Angriff gegen Mann", // eine aus CATEGORIES
  description: "",
  created: "ISO-Datum", updated: "ISO-Datum",
  initial: {
    players: { "1": {x, y}, ..., "5": {x, y} },  // Startaufstellung
    ball: "1"                                     // Ballbesitz zu Beginn
  },
  steps: [
    {
      actions: [                  // type: "cut" | "dribble" | "screen"
        { player: "4", type: "screen", points: [{x, y}, ...], smooth: true, beat: 0 },
        { player: "4", type: "cut",    points: [...],         smooth: true, beat: 1 }  // abrollen
      ],
      pass: { from: "1", to: "2", beat: 1 } | null,   // beat optional
      note: "Freitext, Zeilen mit „- “ oder „1. “ werden zur Aufzählung"
    }
  ]
}
```

Wichtige Prinzipien:
- **Gespeichert werden nur Startaufstellung und Aktionen.** Positionen in späteren Schritten
  berechnet `stateAt(play, k)` (Zustand zu *Beginn* von Schritt k; `k = steps.length` = Endposition).
- **Takte:** Ein Schritt läuft Takt für Takt (`beat` 0, 1, 2 …, je `TIMING.move`). Alle Aktionen
  eines Takts laufen gleichzeitig. Pro Spieler und Takt höchstens eine Aktion; mehrere Aktionen
  eines Spielers liegen in aufsteigenden Takten, eine Lücke = der Spieler wartet (Zeitversatz).
- `points` enthält **nicht** den Startpunkt; der ist die Position des Spielers zu Beginn des
  Takts (`positionsAt(play, k, beat)`), also das Ende seiner vorigen Aktion.
- Der Pass liegt in einem Takt wie eine Aktion und läuft **gleichzeitig** mit dessen Laufwegen
  („Pass und schneiden“), vom Passgeber zu Beginn des Takts zum Empfänger am Ende des Takts.
  Ohne `beat` (alte Dateien) bekommt er einen eigenen Takt nach allen Laufwegen.
  Höchstens ein Pass pro Schritt. Im Pass-Takt dribbelt niemand.
- Nach Löschen/Hinzufügen `tidyStep` anwenden: entfernt leere Takte, Aktionen und Pass rücken nach.
- Bewegung entlang des Pfads nach **zurückgelegter Strecke** (`measurer`), damit Spieler in Kurven
  nicht schneller oder langsamer werden.

### Dateiformat (Export/Import)

```json
{ "format": "playbook-spielzug", "version": 2, "exported": "ISO-Datum", "plays": [ ... ] }
```

Import akzeptiert auch einen einzelnen Spielzug ohne Hülle. Jede Datei wird mit `migratePlay`
umgewandelt und dann mit `validatePlay` geprüft; `loadAll` migriert auch die localStorage-Daten.
**Bei Änderungen am Modell:** `FILE_VERSION` erhöhen und die Migration in `core/migrate.js`
erweitern. Spieler haben eventuell noch alte Dateien.

- Version 1: `step.moves = { "4": {type, points, smooth} }`, eine Aktion pro Spieler, alle
  gleichzeitig → wird zu `actions` mit `beat: 0`.
- Version 2: `step.actions` mit Takten (aktuell). Ältere App-Versionen können sie nicht lesen.

## Konventionen

- **Oberfläche, Kommentare und Commit-Nachrichten auf Deutsch.** Code-Bezeichner auf Englisch.
- Basketball-Begriffe wie im deutschen Vereinsalltag: Laufweg, Block, Dribbling, Pass, Einwurf,
  Schnellangriff; englische Namen für Spielzüge (Horns, Flare, Pick and Roll) sind üblich.
- Benutzertexte immer mit `esc()` escapen, wenn sie in `innerHTML` landen (Dateien kommen von außen).
- Farben nur über CSS-Variablen in `base.css`; Dark Mode über `prefers-color-scheme`.
- Muss am Handy funktionieren: Pointer Events (nicht nur Maus), große Tippziele, kein Hover-Zwang.
- Kein Framework einführen, ohne das vorher mit mir abzusprechen.

## Bekannte Stolpersteine

- **`file://` funktioniert nicht** (ES-Module brauchen einen Server) → immer `npm run dev`.
- **`base: '/playbook/'`** in `vite.config.js` muss zum Namen des GitHub-Repositorys passen.
- **localStorage ist pro Herkunft getrennt:** `localhost:5173`, `localhost:4173` und die
  GitHub-Pages-Adresse haben jeweils eigene Daten.
- **Safari/iOS** löscht Daten von Webseiten nach ca. 7 Tagen ohne Besuch, außer die App wurde
  über „Zum Home-Bildschirm“ installiert.
- **iOS kann `.json`-Dateien nicht direkt mit einer Web-App öffnen** → Spieler müssen in der App
  „Importieren“ tippen und die Datei auswählen.
- Die Web Share API mit Dateien gibt es nur auf Mobilgeräten und in einigen Desktop-Browsern;
  sonst fällt `sharePlay` auf Download zurück.

## Manueller Testablauf

Vor größeren Änderungen im Browser prüfen (`npm run dev`):
1. Neuer Spielzug → Aufstellung ziehen → Block für 4 → Laufweg 4 anhängen (Abrollen, Takt 2)
   → „+ Schritt“ → Dribbling 1 (Takt 1) → Pass 1 → 2 (Takt 2) → Laufweg 3 (Takt 3)
2. Vorschau abspielen, Namen vergeben, speichern
3. Im Viewer abspielen, Geschwindigkeit ändern, Schritt in der Liste anklicken
4. „Als Datei speichern“, Spielzug löschen, Datei wieder importieren
5. Bearbeiten, umbenennen, speichern → Übersicht zeigt neuen Namen
6. Handy-Ansicht (DevTools, 390 px Breite) prüfen

## Mögliche nächste Schritte

1. **PWA / Offline:** `vite-plugin-pwa` einbinden (Manifest, Service Worker, App-Icons 192/512 px),
   Hinweis „Neue Version verfügbar – neu laden?“.
2. **Speicher absichern:** `navigator.storage.persist()` beim Start anfragen.
3. **Verteidigung:** optionale Spieler X1–X5 (eigene Farbe), gleiche Aktionen.
4. **Mehrere Pässe pro Schritt** (`passes: []` mit Takt), z. B. Hand-off oder Swing.
5. **Ganzfeld** für Schnellangriff und Presse.
6. **Video-Export** der Animation (MediaRecorder) zum Verschicken.
7. **IndexedDB** statt localStorage, falls Bilder/Videos an Spielzüge angehängt werden sollen.
8. **Capacitor**, falls eine echte App für iOS/Android nötig wird (Dateien direkt öffnen).
