V12 – native iPhone date/time picker: date uses calendar control and time uses the native iOS time picker (wheel-style on iPhone).

CHICLANA FAHRPLAN – PROTOTYP V1

Enthalten:
- Bus M-120 und Tranvía T-1
- Von/Nach, Datum, Uhrzeit
- Bus gelb / Tranvía grün
- Suchergebnisse zeigen nur persönliche Einstieg -> Ziel
- Klick auf Verbindung zeigt die komplette Fahrt
- persönlicher Einstieg/Ziel: fett, normale Schriftgröße
- Anfangs- und Endhaltestelle: fett
- weitere Linien können später in data.json ergänzt werden

WICHTIG:
Dies ist V1/Prototyp. Die Fahrplandaten sollten vor einer endgültigen Veröffentlichung noch vollständig gegen die Originaltabellen geprüft und ergänzt werden.

Für eine echte iPhone-PWA muss der Ordner auf einer HTTPS-Webseite gehostet werden. Danach kann er in Safari geöffnet und über „Teilen -> Zum Home-Bildschirm“ installiert werden.


V4: Beim Öffnen werden Datum und Uhrzeit automatisch auf die aktuelle lokale iPhone-Zeit gesetzt. Die Suche zeigt direkte Verbindungen ab der gewählten Uhrzeit, also standardmäßig die nächsten Fahrten.


V6: Linie L-7 in beide Richtungen ergänzt (Castilla ↔ La Barrosa CR), gültig 20.06.2026–14.09.2026. Die veröffentlichten Abfahrtszeiten am jeweiligen Linienanfang sind enthalten. Nicht veröffentlichte Zwischenzeiten werden als „—“ dargestellt. Die App berücksichtigt nun das Gültigkeitsdatum einer Linie.


V11: Datum und Uhrzeit nutzen auf dem iPhone wieder die nativen Auswahlfelder. Beim Antippen öffnet sich der Kalender bzw. die Uhrzeit-Auswahl; die aktuelle lokale Uhrzeit bleibt beim Start vorausgefüllt.


V21: Die Verbindungssuche zeigt ab der gewählten Uhrzeit die nächste Verbindung plus fünf weitere (insgesamt 6). Über „Frühere Verbindungen“ und „Spätere Verbindungen“ kann man jeweils weitere Zeitfenster aufrufen.
