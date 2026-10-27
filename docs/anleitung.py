"""Erzeugt die Playbook-Anleitung als PDF.

Aufruf:  python3 docs/anleitung.py [ausgabe.pdf]
         ohne Angabe → docs/Playbook-Anleitung.pdf (neben diesem Skript)

Voraussetzungen: Python 3 mit reportlab (pip install reportlab) und die DejaVu-Schriften
unter /usr/share/fonts/truetype/dejavu/ (Linux: Paket fonts-dejavu-core).
Kein Teil der Web-App – nur zum Erstellen der Anleitung.
"""
import sys
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether, ListFlowable, ListItem, PageBreak, Paragraph, Preformatted,
    SimpleDocTemplate, Spacer, Table, TableStyle,
)

OUT = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).with_name('Playbook-Anleitung.pdf'))
FD = '/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('Sans', FD + 'DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('Sans-Bold', FD + 'DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Sans-Oblique', FD + 'DejaVuSans-Oblique.ttf'))
pdfmetrics.registerFont(TTFont('Mono', FD + 'DejaVuSansMono.ttf'))
pdfmetrics.registerFontFamily('Sans', normal='Sans', bold='Sans-Bold', italic='Sans-Oblique')

ACCENT = colors.HexColor('#e2531f')
INK = colors.HexColor('#1d1d1f')
MUTED = colors.HexColor('#6b6b70')
CHIP = colors.HexColor('#f3e3d6')
LINE = colors.HexColor('#e2ddd5')
SOFT = colors.HexColor('#f7f5f1')
OK = colors.HexColor('#2e7d32')
NO = colors.HexColor('#c0392b')
URL = 'https://bolo-titan.github.io/playbook/'

body = ParagraphStyle('body', fontName='Sans', fontSize=10, leading=14.5, textColor=INK, spaceAfter=6)
small = ParagraphStyle('small', parent=body, fontSize=8.5, leading=12, textColor=MUTED)
cell = ParagraphStyle('cell', parent=body, fontSize=9, leading=12.5, spaceAfter=0)
cellb = ParagraphStyle('cellb', parent=cell, fontName='Sans-Bold')
h1 = ParagraphStyle('h1', fontName='Sans-Bold', fontSize=16, leading=20, textColor=INK, spaceBefore=6, spaceAfter=8)
h2 = ParagraphStyle('h2', fontName='Sans-Bold', fontSize=11.5, leading=15, textColor=ACCENT, spaceBefore=10, spaceAfter=4)
title = ParagraphStyle('title', fontName='Sans-Bold', fontSize=30, leading=36, textColor=INK)
subtitle = ParagraphStyle('subtitle', fontName='Sans', fontSize=13, leading=18, textColor=MUTED)
box = ParagraphStyle('box', parent=body, fontSize=9.5, leading=13.5, spaceAfter=0)
code = ParagraphStyle('code', fontName='Mono', fontSize=8, leading=10.5, textColor=INK)

story = []
P = lambda t, s=body: story.append(Paragraph(t, s))


def bullets(items, style=body, numbered=False):
    story.append(ListFlowable(
        [ListItem(Paragraph(t, style), leftIndent=14) for t in items],
        bulletType='1' if numbered else 'bullet', start='1' if numbered else '•',
        bulletFontName='Sans-Bold' if numbered else 'Sans', bulletFontSize=9.5,
        bulletColor=ACCENT, leftIndent=14, spaceAfter=6,
    ))


def note(text, kind='tipp'):
    """Hinweisbox: tipp (orange) oder wichtig (rot)."""
    color = ACCENT if kind == 'tipp' else NO
    label = 'Tipp' if kind == 'tipp' else 'Wichtig'
    t = Table([[Paragraph(f'<b>{label}:</b> {text}', box)]], colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CHIP if kind == 'tipp' else colors.HexColor('#fbe3df')),
        ('LINEBEFORE', (0, 0), (0, -1), 3, color),
        ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(Spacer(1, 2))
    story.append(t)
    story.append(Spacer(1, 8))


def table(rows, widths, head=True):
    data = [[Paragraph(c, cellb if (head and i == 0) else cell) for c in r] for i, r in enumerate(rows)]
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1 if head else 0)
    style = [
        ('GRID', (0, 0), (-1, -1), 0.5, LINE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    if head:
        style.append(('BACKGROUND', (0, 0), (-1, 0), CHIP))
    t.setStyle(TableStyle(style))
    story.append(t)
    story.append(Spacer(1, 8))


# ---------- Titelseite ----------
story.append(Spacer(1, 55 * mm))
P('Playbook', title)
story.append(Spacer(1, 4))
P('Spielzüge zeichnen, abspielen und an die Mannschaft verteilen', subtitle)
story.append(Spacer(1, 10 * mm))
P('Anleitung für Trainer und Spieler', ParagraphStyle('t2', parent=subtitle, textColor=ACCENT, fontName='Sans-Bold'))
story.append(Spacer(1, 30 * mm))
table([
    ['Die App', f'<font name="Mono">{URL}</font>'],
    ['Kosten, Konto', 'Keine. Kein Login, keine Anmeldung.'],
    ['Deine Daten', 'Bleiben auf deinem Gerät. Es gibt keinen Server, der Spielzüge speichert.'],
], [35, 135], head=False)
story.append(PageBreak())

# ---------- 1. Überblick ----------
P('1. So funktioniert Playbook', h1)
P('Playbook ist eine Web-App: Sie läuft im Browser, du musst nichts aus einem App-Store installieren. '
  'Der Ablauf in der Mannschaft ist immer gleich:')
bullets([
    '<b>Der Trainer</b> zeichnet Spielzüge im Editor: Aufstellung, Laufwege, Blöcke, Dribblings, Pässe und Notizen.',
    '<b>Er verschickt sie als Datei</b> (z. B. per WhatsApp oder E-Mail) – einzeln oder alle auf einmal. '
    'Zusätzlich kann er einen Spielzug als <b>Video</b> verschicken.',
    '<b>Die Spieler</b> importieren die Datei in ihre App und schauen sich die Spielzüge animiert an – '
    'komplett oder Schritt für Schritt.',
], numbered=True)
note('Alles bleibt auf dem jeweiligen Gerät. Wer die App am Handy und am PC nutzt, hat dort '
     '<b>getrennte</b> Spielzüge. Zum Übertragen dient immer die Datei.', 'wichtig')

P('2. Welches Gerät wofür?', h1)
table([
    ['Aufgabe', 'Empfohlen', 'Warum'],
    ['<b>Spielzüge erstellen</b> (Trainer)', '<b>PC / Laptop</b> mit Maus oder <b>Tablet</b> (gern mit Stift)',
     'Großes Spielfeld, Punkte lassen sich genau setzen, Notizen schreiben sich mit Tastatur leichter. '
     'Am Handy geht es auch, ist aber fummelig.'],
    ['<b>Spielzüge anschauen</b> (Spieler)', 'Handy, Tablet oder PC', 'Abspielen und Schritte durchgehen funktioniert überall gut.'],
    ['<b>Video erstellen</b>', 'Chrome, Edge oder Safari (auch am Handy)', 'Hängt vom Browser ab, siehe Kapitel 8.'],
], [42, 50, 78])

P('3. App öffnen und einrichten', h1)
P(f'Öffne <font name="Mono">{URL}</font> im Browser. Wer möchte, kann die App wie eine normale App '
  'auf den Startbildschirm legen:')
table([
    ['Gerät', 'So geht’s'],
    ['iPhone / iPad (Safari)', 'Teilen-Symbol (Quadrat mit Pfeil) → „Zum Home-Bildschirm“ → „Hinzufügen“'],
    ['Android (Chrome)', 'Menü ⋮ → „Zum Startbildschirm hinzufügen“ bzw. „App installieren“'],
    ['PC', 'Einfach ein Lesezeichen setzen.'],
], [42, 128])
note('Auf dem <b>iPhone</b> löscht Safari die Daten einer Webseite, wenn sie etwa <b>7 Tage</b> nicht geöffnet '
     'wurde. Über den Home-Bildschirm gestartet, passiert das nicht.',
     'wichtig')
story.append(PageBreak())

# ---------- 4. Editor ----------
P('4. Einen Spielzug erstellen (Trainer)', h1)
P('Tippe oben auf <b>„Neuer Spielzug“</b>. Ein Spielzug besteht aus <b>Schritten</b>. '
  'Jeder Schritt zeigt, was ab einer bestimmten Aufstellung passiert. Links oben wählst du das Werkzeug:')
table([
    ['Werkzeug', 'So geht’s'],
    ['Aufstellung', 'Spieler an ihre Startpositionen ziehen (nur in Schritt 1). '
                    'Spieler dürfen auch <b>außerhalb des Felds</b> stehen – z. B. der Einwerfer hinter der '
                    'Grundlinie oder neben der Seitenlinie.'],
    ['Ballbesitz', 'Spieler antippen, der zu Beginn den Ball hat (nur in Schritt 1).'],
    ['Laufweg', 'Spieler antippen, dann die Punkte seines Wegs. Mit „✓ Fertig“ abschließen '
                'oder den letzten Punkt nochmal antippen.'],
    ['Dribbling', 'Wie Laufweg, aber nur für den Spieler mit Ball. Wird als Zickzack-Linie gezeichnet.'],
    ['Block', 'Weg zur Blockposition zeichnen. Die Linie endet mit einem Querstrich.'],
    ['Pass', 'Ballbesitzer antippen, Takt wählen, dann den Empfänger antippen.'],
    ['Aktion löschen', 'Spieler antippen – seine <b>letzte</b> Aktion in diesem Schritt wird entfernt.'],
], [30, 140])
P('„Laufwege runden“ (Häkchen rechts) macht aus den Punkten eine glatte Kurve.', small)

P('Mehrere Aktionen und Takte', h2)
P('Innerhalb eines Schritts laufen die Aktionen in <b>Takten</b> ab: erst alles in Takt 1, dann alles in '
  'Takt 2 usw. Damit lassen sich auch längere Abläufe in einem Schritt darstellen:')
bullets([
    '<b>Block stellen und abrollen:</b> Block für Spieler 4 zeichnen, dann mit „Laufweg“ nochmal Spieler 4 '
    'antippen – der neue Weg wird <b>angehängt</b> und läuft automatisch im nächsten Takt.',
    '<b>Später starten:</b> Beim Zeichnen zeigt die Leiste unter dem Feld „Start ◀ Takt 1 ▶“. '
    'Mit ▶ startet der Spieler erst in einem späteren Takt.',
    '<b>Pass im Ablauf:</b> Auch der Pass hat einen Takt. Beispiel: Dribbling 1 in Takt 1, '
    'Pass 1 → 2 in Takt 2, Laufweg 3 in Takt 3. Läuft ein Spieler im selben Takt wie der Pass, '
    'passiert beides gleichzeitig („Pass und schneiden“).',
])
P('Weicht ein Schritt vom einfachen Ablauf ab, stehen kleine Takt-Nummern auf den Linien.', small)

P('Schritte, Notizen, Vorschau', h2)
bullets([
    '<b>„+ Schritt“</b> fügt einen neuen Schritt an. Er beginnt dort, wo der vorige aufgehört hat. '
    'Mit ◀ ▶ wechselst du zwischen den Schritten.',
    '<b>Notiz zu diesem Schritt:</b> Zeilenumbrüche bleiben erhalten. Zeilen, die mit „- “ beginnen, werden '
    'zur Aufzählung, mit „1. “ zur nummerierten Liste – ideal für die Optionen eines Spielers.',
    '<b>„▶ Vorschau“</b> spielt den ganzen Spielzug ab, <b>„▶ Nur dieser Schritt“</b> nur den aktuellen. '
    'Danach bleibt das letzte Bild stehen; ein Tipp aufs Feld führt zurück zum Bearbeiten.',
    '<b>Name, Kategorie, Beschreibung</b> eintragen und <b>„Speichern“</b> tippen.',
])
story.append(KeepTogether([
    Paragraph('Beispiel für eine Notiz:', small),
    Table([[Preformatted('4 stellt Block für 1.\nOptionen für 1:\n- Zum Korb ziehen\n- Pass auf abrollende 4\n'
                         '- Wurf, wenn der Verteidiger unten durchgeht', code)]],
          colWidths=[170 * mm], style=[('BACKGROUND', (0, 0), (-1, -1), SOFT),
                                       ('BOX', (0, 0), (-1, -1), 0.5, LINE),
                                       ('LEFTPADDING', (0, 0), (-1, -1), 9), ('TOPPADDING', (0, 0), (-1, -1), 6),
                                       ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]),
]))
story.append(Spacer(1, 6))

P('5. Einen Spielzug ansehen', h1)
P('Im <b>Archiv</b> stehen alle Spielzüge, mit Suche und Filter nach Kategorie. Ein Tipp öffnet den Spielzug:')
bullets([
    '<b>„▶ Abspielen“</b> zeigt den ganzen Spielzug. <b>Geschwindigkeit</b> lässt sich von 0,5× bis 2× einstellen.',
    '<b>▶ (rechts daneben)</b> spielt nur den nächsten Schritt und hält dann an – gut zum Erklären.',
    '<b>◀</b> geht einen Schritt zurück, ein Tipp auf einen Schritt in der Liste springt direkt dorthin.',
    'Unter jedem Schritt steht seine Notiz.',
])
story.append(PageBreak())

# ---------- 6. JSON ----------
P('6. Die Spielzug-Datei (.json) – einfach erklärt', h1)
P('Wenn du Spielzüge verschickst, entsteht eine Datei mit der Endung <b>.json</b>, z. B. '
  '<font name="Mono">spielzug-horns-flare.json</font>. JSON ist einfach <b>Text in einer festen Ordnung</b> – '
  'eine Art Bauplan, aus dem die App den Spielzug wieder aufbaut. Das Wichtigste:')
table([
    ['Frage', 'Antwort'],
    ['Was steht drin?', 'Nur die Spielzüge: Name, Kategorie, Startaufstellung, die Aktionen jedes Schritts und die Notizen. '
                        'Keine Bilder, kein Video, nicht die App selbst.'],
    ['Wie groß ist sie?', 'Sehr klein, meist nur wenige Kilobyte – auch mit vielen Spielzügen.'],
    ['Ein oder mehrere Spielzüge?', '„Als Datei speichern“ im Spielzug = <b>ein</b> Spielzug. '
                                    '„Alle exportieren“ im Archiv = <b>alle</b> Spielzüge in einer Datei.'],
    ['Was passiert bei einem Update?', 'Jeder Spielzug hat eine eindeutige Kennung (id). Schickt der Trainer eine '
                                       'geänderte Version, wird der Spielzug beim Import <b>ersetzt</b>, nicht doppelt angelegt.'],
    ['Alte Dateien?', 'Funktionieren weiter. Die App wandelt ältere Dateien beim Import automatisch um.'],
    ['Kann ich sie öffnen?', 'Ja, mit jedem Texteditor. Aber <b>nicht von Hand ändern</b> – ein falsches Zeichen, '
                             'und die App lehnt die Datei ab. Ändern immer in der App.'],
    ['Wozu noch?', 'Als <b>Sicherung</b>: Ab und zu „Alle exportieren“ und die Datei aufheben '
                   '(z. B. in der Cloud oder per Mail an dich selbst).'],
], [42, 128])

P('So sieht die Datei aus (gekürzt)', h2)
json_example = '''{
  "format": "playbook-spielzug",      ← Kennzeichen: eine Playbook-Datei
  "version": 2,                       ← Version des Dateiformats
  "exported": "2026-10-27T18:00:00Z", ← wann exportiert
  "plays": [                          ← Liste der Spielzüge
    {
      "id": "m3x9k2abc123",           ← eindeutige Kennung
      "name": "Horns Flare",
      "category": "Angriff gegen Mann",
      "initial": {                    ← Startaufstellung
        "players": { "1": { "x": 75, "y": 84 }, "2": { "x": 126, "y": 52 }, ... },
        "ball": "1"                   ← wer zu Beginn den Ball hat
      },
      "steps": [                      ← die Schritte
        {
          "actions": [                ← Laufwege, Dribblings, Blöcke
            { "player": "4", "type": "screen", "points": [ { "x": 82, "y": 74 } ], "beat": 0 },
            { "player": "4", "type": "cut",    "points": [ { "x": 70, "y": 30 } ], "beat": 1 }
          ],
          "pass": { "from": "1", "to": "2", "beat": 2 },
          "note": "4 stellt Block für 1 und rollt ab"
        }
      ]
    }
  ]
}'''
t = Table([[Preformatted(json_example, code)]], colWidths=[170 * mm])
t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), SOFT), ('BOX', (0, 0), (-1, -1), 0.5, LINE),
                       ('LEFTPADDING', (0, 0), (-1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 7),
                       ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
story.append(t)
story.append(Spacer(1, 6))
P('<b>Koordinaten:</b> x und y sind Positionen auf dem Halbfeld in Dezimetern (x = 0 bis 150 von links nach rechts, '
  'y = 0 bis 140 von der Grundlinie zur Mittellinie). Werte außerhalb sind Positionen neben dem Feld. '
  '<b>type:</b> cut = Laufweg, dribble = Dribbling, screen = Block. '
  '<b>beat:</b> der Takt, beginnend bei 0 (in der App „Takt 1“).', small)
story.append(PageBreak())

# ---------- 7. Teilen, Import ----------
P('7. Spielzüge verschicken und importieren', h1)
P('Verschicken (Trainer)', h2)
bullets([
    '<b>Ein Spielzug:</b> Spielzug öffnen → <b>„Teilen“</b>. Am Handy öffnet sich das Teilen-Menü '
    '(WhatsApp, Mail …). Am PC wird die Datei heruntergeladen – dann wie gewohnt anhängen.',
    '<b>Alle Spielzüge:</b> Archiv → <b>„Alle exportieren“</b>, die Datei verschicken.',
])
P('Importieren (Spieler)', h2)
P('Eine Web-App kann eine Datei nicht direkt per Antippen öffnen – der Import läuft deshalb immer über den '
  'Button <b>„Spielzug importieren“</b> auf der Übersicht bzw. <b>„Importieren“</b> im Archiv.')
table([
    ['Gerät', 'So geht’s'],
    ['<b>iPhone</b>', '1. In WhatsApp die Datei antippen → Teilen-Symbol → <b>„In Dateien sichern“</b>.<br/>'
                      '2. Playbook öffnen → <b>„Importieren“</b> → die Datei in „Dateien“ auswählen.'],
    ['<b>Android</b>', '1. In WhatsApp die Datei herunterladen.<br/>'
                       '2. Playbook öffnen → <b>„Importieren“</b> → Datei unter „Downloads“ auswählen.'],
    ['<b>PC</b>', 'Datei speichern und auf „Importieren“ klicken – oder die Datei einfach ins Browserfenster ziehen.'],
], [25, 145])
P('Die App meldet danach, wie viele Spielzüge neu und wie viele aktualisiert wurden.', small)

P('8. Als Video teilen', h1)
P('Für alle, die die App nicht nutzen (oder für einen schnellen Blick in WhatsApp), lässt sich ein Spielzug als '
  '<b>Video (MP4)</b> verschicken. Das Video zeigt Name, Schritt, das Spielfeld und darunter die Notiz.')
bullets([
    'Spielzug öffnen → <b>„Als Video teilen“</b>. Das Video wird jetzt erstellt – das dauert so lange wie das '
    'Video selbst (je nach Spielzug ca. 15–40 Sekunden). In der Zeit die Seite offen lassen.',
    'Ist es fertig, heißt der Button <b>„Video teilen“</b>. Noch einmal tippen → Teilen-Menü (Handy) '
    'bzw. Download (PC). Der zweite Tipp ist nötig, weil Browser das Teilen-Menü nur direkt nach einem Tippen öffnen.',
    'Im Editor erstellt <b>„Speichern + Video“</b> das Video direkt nach dem Speichern.',
], numbered=True)
P('Welcher Browser kann das?', h2)
P('Das Video entsteht direkt im Browser. Ob das klappt, hängt vom Browser ab:')
yes, no = '<font color="#2e7d32"><b>✓ ja</b></font>', '<font color="#c0392b"><b>✗ nein</b></font>'
table([
    ['Browser', 'Video', 'Bemerkung'],
    ['Safari (iPhone, iPad, Mac)', yes, ''],
    ['Chrome (Android, Windows, Mac)', yes, 'aktuelle Version'],
    ['Microsoft Edge', yes, 'aktuelle Version'],
    ['Firefox', no, 'kann kein MP4 aufnehmen – die App zeigt einen Hinweis'],
    ['Chromium unter Linux', no, 'ohne MP4-Unterstützung; Google Chrome verwenden'],
], [60, 22, 88])
note('Geht es im eigenen Browser nicht, einfach am <b>Handy</b> oder in <b>Chrome/Edge</b> öffnen. '
     'Achtung: Spielzüge sind pro Browser getrennt gespeichert – vorher ggf. per Datei übertragen.')

P('9. Häufige Fragen', h1)
table([
    ['Problem', 'Lösung'],
    ['Meine Spielzüge sind weg.', 'Gleicher Browser, gleiches Gerät? Spielzüge sind pro Browser gespeichert. '
                                  'Auf dem iPhone hilft es, die App über den Home-Bildschirm zu starten (siehe Kapitel 3). '
                                  'Eine Sicherung per „Alle exportieren“ schützt vor Datenverlust.'],
    ['Die Datei lässt sich nicht importieren.', 'Wurde sie von Hand bearbeitet oder beim Versand umbenannt/verändert? '
                                                'Den Trainer bitten, sie neu zu schicken.'],
    ['Ein Spielzug ist doppelt.', 'Kommt nur vor, wenn er als neuer Spielzug angelegt statt bearbeitet wurde. '
                                  'Den alten im Spielzug über „Löschen“ entfernen.'],
    ['„Video teilen“ fehlt / Hinweis erscheint.', 'Der Browser kann kein MP4 – siehe Tabelle in Kapitel 8.'],
    ['Ich habe eine neue Version bekommen.', 'Einfach importieren – der vorhandene Spielzug wird aktualisiert.'],
], [55, 115])


def page_deco(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setFont('Sans', 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(20 * mm, 12 * mm, 'Playbook – Anleitung')
        canvas.drawRightString(190 * mm, 12 * mm, f'Seite {doc.page}')
        canvas.setStrokeColor(ACCENT)
        canvas.setLineWidth(2)
        canvas.line(20 * mm, 285 * mm, 40 * mm, 285 * mm)
    else:
        canvas.setFillColor(ACCENT)
        canvas.rect(0, 287 * mm, 210 * mm, 10 * mm, stroke=0, fill=1)
    canvas.restoreState()


doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm,
                        bottomMargin=20 * mm, title='Playbook – Anleitung', author='Playbook',
                        subject='Anleitung für Trainer und Spieler')
doc.build(story, onFirstPage=page_deco, onLaterPages=page_deco)
print('OK', OUT)
