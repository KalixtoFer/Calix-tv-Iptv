package com.ipvio.stream

// Translations part K: setup screen (compact), extra Stalker fields, update notice at startup
val DictK = """
# Add playlist (compact)
Weiter ohne Playlist¦Continue without playlist¦Oynatma listesi olmadan devam et¦Nastavi bez liste¦¦¦Continuar sin lista¦Continuer sans playlist¦Continua senza playlist¦Verder zonder afspeellijst
MAC-Adresse¦MAC address¦MAC adresi¦MAC adresa¦¦¦Dirección MAC¦Adresse MAC¦Indirizzo MAC¦MAC-adres
Seriennummer (optional)¦Serial number (optional)¦Seri numarası (isteğe bağlı)¦Serijski broj (opcionalno)¦¦¦Número de serie (opcional)¦Numéro de série (facultatif)¦Numero di serie (facoltativo)¦Serienummer (optioneel)
Device ID (optional)¦Device ID (optional)¦Device ID (isteğe bağlı)¦Device ID (opcionalno)¦¦¦Device ID (opcional)¦Device ID (facultatif)¦Device ID (facoltativo)¦Device ID (optioneel)
Device ID 2 (optional)¦Device ID 2 (optional)¦Device ID 2 (isteğe bağlı)¦Device ID 2 (opcionalno)¦¦¦Device ID 2 (opcional)¦Device ID 2 (facultatif)¦Device ID 2 (facoltativo)¦Device ID 2 (optioneel)
Seriennummer und Device IDs nur eintragen, wenn dein Anbieter sie verlangt (wie bei TiviMate oder STB Emu). Leer = die App erzeugt eigene Werte.¦Only enter the serial number and device IDs if your provider requires them (as with TiviMate or STB Emu). Empty = the app generates its own values.¦Seri numarasını ve cihaz kimliklerini yalnızca sağlayıcın istiyorsa gir (TiviMate veya STB Emu'daki gibi). Boş = uygulama kendi değerlerini üretir.¦Serijski broj i Device ID unesi samo ako ih tvoj provajder traži (kao kod TiviMate ili STB Emu). Prazno = aplikacija sama generira vrijednosti.¦¦¦Introduce el número de serie y los Device ID solo si tu proveedor los exige (como en TiviMate o STB Emu). Vacío = la app genera sus propios valores.¦Saisis le numéro de série et les Device ID uniquement si ton fournisseur les exige (comme dans TiviMate ou STB Emu). Vide = l'appli génère ses propres valeurs.¦Inserisci numero di serie e Device ID solo se il tuo fornitore li richiede (come in TiviMate o STB Emu). Vuoto = l'app genera valori propri.¦Vul serienummer en Device ID's alleen in als je aanbieder ze vereist (zoals bij TiviMate of STB Emu). Leeg = de app maakt eigen waarden.
# Update notice at startup
Update verfügbar¦Update available¦Güncelleme mevcut¦Dostupno ažuriranje¦¦¦Actualización disponible¦Mise à jour disponible¦Aggiornamento disponibile¦Update beschikbaar
Neue Version {0} (installiert: {1})¦New version {0} (installed: {1})¦Yeni sürüm {0} (yüklü: {1})¦Nova verzija {0} (instalirano: {1})¦¦¦Nueva versión {0} (instalada: {1})¦Nouvelle version {0} (installée : {1})¦Nuova versione {0} (installata: {1})¦Nieuwe versie {0} (geïnstalleerd: {1})
Deine Playlists und Einstellungen bleiben erhalten. Android fragt vor der Installation einmal nach.¦Your playlists and settings are kept. Android asks once before installing.¦Oynatma listelerin ve ayarların korunur. Android kurulumdan önce bir kez sorar.¦Tvoje liste i postavke ostaju sačuvane. Android te jednom pita prije instalacije.¦¦¦Tus listas y ajustes se conservan. Android pregunta una vez antes de instalar.¦Tes playlists et réglages sont conservés. Android demande une fois avant l'installation.¦Le tue playlist e impostazioni restano. Android chiede una volta prima dell'installazione.¦Je afspeellijsten en instellingen blijven behouden. Android vraagt één keer voor de installatie.
Jetzt aktualisieren¦Update now¦Şimdi güncelle¦Ažuriraj sada¦¦¦Actualizar ahora¦Mettre à jour maintenant¦Aggiorna ora¦Nu updaten
Später¦Later¦Sonra¦Kasnije¦¦¦Más tarde¦Plus tard¦Più tardi¦Later
# Watched mark, history, keyboard (English only; other languages fall back to English)
Staffel gesehen¦Season watched
Staffel zurücksetzen¦Reset season
Serie gesehen¦Series watched
Serie zurücksetzen¦Reset series
Als gesehen markieren¦Mark as watched
Als ungesehen markieren¦Mark as unwatched
Aus „Zuletzt geschaut“ entfernen¦Remove from “Recently watched”
OK lange drücken = als gesehen markieren¦Hold OK = mark as watched
OK lange drücken = als ungesehen markieren¦Hold OK = mark as unwatched
Tastatur des Geräts in der Suche¦Device keyboard in search
Aus: die eingebaute Tastatur der App. An: die Tastatur deines Geräts (z. B. Gboard) mit allen Sprachen, Sprachfunktion und Einfügen. Mit OK auf das Suchfeld wird sie geöffnet.¦Off: the app's built-in keyboard. On: your device's keyboard (e.g. Gboard) with all languages, voice input and paste. Press OK on the search field to open it.
# Device choice (first start)
Auf welchem Gerät nutzt du die App?¦Which device will you use the app on?¦Uygulamayı hangi cihazda kullanacaksın?¦Na kojem uređaju ćeš koristiti aplikaciju?¦¦¦¿En qué dispositivo vas a usar la app?¦Sur quel appareil vas-tu utiliser l'app ?¦Su quale dispositivo userai l'app?¦Op welk apparaat ga je de app gebruiken?
Handy / Tablet¦Phone / Tablet¦Telefon / Tablet¦Telefon / Tablet¦¦¦Teléfono / Tablet¦Téléphone / Tablette¦Telefono / Tablet¦Telefoon / Tablet
Fernseher / TV-Box¦TV / TV box¦TV / TV box¦TV / TV box¦¦¦TV / TV Box¦TV / box TV¦TV / TV box¦TV / tv-box
Bedienung mit dem Finger¦Touch control¦Dokunmatik kullanım¦Upravljanje dodirom¦¦¦Control táctil¦Commande tactile¦Controllo touch¦Bediening met aanraking
Bedienung mit der Fernbedienung¦Remote control¦Kumanda ile kullanım¦Upravljanje daljinskim¦¦¦Control con el mando¦Commande à distance¦Controllo con il telecomando¦Bediening met de afstandsbediening
Du kannst das später in den Einstellungen ändern.¦You can change this later in Settings.¦Bunu daha sonra Ayarlar'dan değiştirebilirsin.¦To možeš kasnije promijeniti u postavkama.¦¦¦Puedes cambiarlo después en Ajustes.¦Tu peux le modifier plus tard dans les Réglages.¦Puoi cambiarlo più tardi nelle Impostazioni.¦Je kunt dit later wijzigen in Instellingen.
Gerät¦Device¦Cihaz¦Uređaj¦¦¦Dispositivo¦Appareil¦Dispositivo¦Apparaat
Wähle, auf welchem Gerät du die App nutzt. Die Ansicht für das Handy wird Schritt für Schritt angepasst.¦Choose which device you use the app on. The phone layout is being adapted step by step.¦Uygulamayı hangi cihazda kullandığını seç. Telefon görünümü adım adım uyarlanıyor.¦Odaberi na kojem uređaju koristiš aplikaciju. Prikaz za telefon se prilagođava korak po korak.¦¦¦Elige en qué dispositivo usas la app. La vista para celular se va adaptando paso a paso.¦Choisis sur quel appareil tu utilises l'app. L'affichage pour téléphone est adapté étape par étape.¦Scegli su quale dispositivo usi l'app. La vista per telefono viene adattata passo dopo passo.¦Kies op welk apparaat je de app gebruikt. De weergave voor telefoon wordt stap voor stap aangepast.
Mehr¦More¦Daha fazla¦Više¦¦¦Más¦Plus¦Altro¦Meer
Alle Gruppen¦All groups¦Tüm gruplar¦Sve grupe¦¦¦Todos los grupos¦Tous les groupes¦Tutti i gruppi¦Alle groepen
Alles aus dem Sport an einem Ort¦All sports in one place¦Tüm spor tek yerde¦Sav sport na jednom mjestu¦¦¦Todo el deporte en un solo lugar¦Tout le sport en un seul endroit¦Tutto lo sport in un unico posto¦Alle sport op één plek
Nur Spiele in meinen Sendern¦Only games on my channels¦Yalnızca kanallarımdaki maçlar¦Samo utakmice na mojim kanalima¦¦¦Solo partidos en mis canales¦Seulement les matchs sur mes chaînes¦Solo partite sui miei canali¦Alleen wedstrijden op mijn zenders
Alle Spiele des Tages¦All games of the day¦Günün tüm maçları¦Sve utakmice dana¦¦¦Todos los partidos del día¦Tous les matchs du jour¦Tutte le partite del giorno¦Alle wedstrijden van de dag
Heute läuft in deinen Sendern nichts mehr. Schalte oben auf alle Spiele um.¦Nothing more on your channels today. Switch above to all games.¦Bugün kanallarında başka maç yok. Yukarıdan tüm maçlara geç.¦Danas nema više ničega na tvojim kanalima. Gore prebaci na sve utakmice.¦¦¦Hoy no hay más partidos en tus canales. Cambiá arriba a todos los partidos.¦Plus rien sur tes chaînes aujourd'hui. Passe ci-dessus à tous les matchs.¦Oggi non c'è altro sui tuoi canali. Passa sopra a tutte le partite.¦Vandaag niets meer op je zenders. Schakel hierboven naar alle wedstrijden.
Heute stehen keine weiteren Spiele an.¦No more games today.¦Bugün başka maç yok.¦Danas nema više utakmica.¦¦¦Hoy no hay más partidos.¦Plus de matchs aujourd'hui.¦Oggi non ci sono altre partite.¦Vandaag geen wedstrijden meer.
Sport live¦Live sports¦Canlı spor¦Sport uživo¦¦¦Deportes en vivo¦Sport en direct¦Sport in diretta¦Sport live
Sport heute¦Sports today¦Bugün spor¦Sport danas¦¦¦Deportes de hoy¦Sport aujourd'hui¦Sport di oggi¦Sport vandaag
Titel suchen¦Search titles¦Yapım ara¦Traži naslove¦¦¦Buscar títulos¦Rechercher des titres¦Cerca titoli¦Titels zoeken
Sender nach Nummer oder Name suchen¦Search channel by number or name¦Kanalı numara veya adla ara¦Traži kanal po broju ili imenu¦¦¦Buscar canal por número o nombre¦Rechercher une chaîne par numéro ou nom¦Cerca canale per numero o nome¦Zender zoeken op nummer of naam
Auto-Genres¦Auto genres¦Otomatik türler¦Auto žanrovi¦¦¦Auto géneros¦Genres auto¦Generi auto¦Auto-genres
Anbieter-Kategorien¦Provider categories¦Sağlayıcı kategorileri¦Kategorije davatelja¦¦¦Categorías del proveedor¦Catégories du fournisseur¦Categorie del fornitore¦Aanbiedercategorieën
Nach Nummer¦By number¦Numaraya göre¦Po broju¦¦¦Por número¦Par numéro¦Per numero¦Op nummer
Mosaik¦Mosaic¦Mozaik¦Mozaik¦¦¦Mosaico¦Mosaïque¦Mosaico¦Mozaïek
Suchergebnisse¦Search results¦Arama sonuçları¦Rezultati pretrage¦¦¦Resultados de búsqueda¦Résultats de recherche¦Risultati di ricerca¦Zoekresultaten
"""
