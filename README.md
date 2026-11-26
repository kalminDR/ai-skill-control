# AI Skill Control Center

A **Skill Control** a számítógépeden futó, magyarul és angolul használható felület a Codexhez. Megmutatja, milyen skillek vannak a gépeden, és segít a feladatodhoz illő munkafolyamatot választani. Összeállíthatsz benne például egy kódellenőrzési feladatot a saját projektedhez, átnézheted, majd bemásolhatod a Codexbe. Te döntöd el, mikor indítod el a munkát.

A béta Windowson, macOS-en és Linuxon használható. A böngésződben nyílik meg, az adataidat helyben tárolja. A letöltéshez és a helyi leltár használatához nincs szükség GitHub-fiókra.

[**Béta letöltése ZIP-ben**](https://github.com/kalminDR/ai-skill-control/archive/refs/heads/main.zip) · [English guide](README.en.md)

## Magyar gyorsindítás

**Amire szükséged lesz:** Python 3.11 vagy újabb és egy korszerű asztali böngésző. A csomag tartalmazza a szükséges Python-könyvtárakat. A Git a projekt kódtárállapotának lekérdezéséhez hasznos. A feladatleírás végrehajtásához a saját Codex-környezetedet használhatod.

1. Töltsd le a ZIP-et a fenti linkről, és csomagold ki a **teljes mappát**.
2. Nyisd meg azt a mappát, amelyikben a `server.py` található. Indítsd el az alkalmazást a rendszerednek megfelelő módon.

   | Rendszer | Indítás a kicsomagolt mappából |
   | --- | --- |
   | **Windows** | Kattints duplán a `Start Windows.cmd` fájlra. PowerShellből a `py -3 server.py --open` parancsot is használhatod. |
   | **macOS** | A mappában nyitott Terminálban futtasd a `python3 server.py --open` parancsot. A csomagban a `Start macOS.command` indító is megtalálható. |
   | **Linux** | A mappában nyitott terminálban futtasd a `sh start-linux.sh` vagy a `python3 server.py --open` parancsot. |

3. A megnyíló böngészőben a felső nyelvválasztón állítsd be a **Magyar** nyelvet. Az alkalmazás megjegyzi a választásodat.
4. Nyisd meg a **Skillkönyvtárat**. Itt azonnal rákereshetsz egy helyi skill nevére vagy leírására. Telepítés, törlés vagy engedélyezési beállítás módosítása után kattints a **Leltár frissítése** gombra.

Ha a böngésző nem nyílik meg, másold be a címsorába a terminálban kiírt teljes `127.0.0.1` címet. A cím az adott indításhoz tartozó hozzáférési kulcsot is tartalmazza, ezért tartsd meg magadnak. Használat közben hagyd nyitva a terminált. Ha végeztél, válaszd a **Beállítások → Kiszolgáló leállítása…** lehetőséget, vagy nyomj `Ctrl+C`-t a terminálban.

## Az első feladatod – egy kódváltozás ellenőrzése

Tegyük fel, hogy megváltoztattad a bejelentkezési űrlap hibakezelését, és szeretnéd átnézetni a módosítást a Codexszel.

1. A **Projektek → Projekt hozzáadása** alatt adj nevet a projektnek, például „Bemutató webalkalmazás”. A **Projektmappa (nem kötelező)** mezőbe a saját projekted teljes helyi elérési útját írd. Kattints a **Projekt mentése** gombra. Mappa megadásával a projekt saját skilljei és dokumentumai is bekerülhetnek a vizsgálatba.
2. A **Munkafolyamatok** nézetben keress rá a **Kódellenőrzés** sablonra. Ez a sablon a `code-review` skillt használja. Ha nálad hiányzik vagy le van tiltva, a felület megmutatja az akadályt. A működést egy nálad **Elérhető** állapotú másik sablonnal is kipróbálhatod.
3. A **Konkrét feladat** mezőbe írd például: „Nézd át a bejelentkezési űrlap módosítását. Ellenőrizd, megmarad-e a beírt e-mail-cím sikertelen bejelentkezés után.” Add meg az érintett fájlokat. Ennél a feladatnál hagyd a végrehajtási módot `AUDIT` értéken, ha csak megállapításokat kérsz.
4. Olvasd át a **Feladatleírás előnézete** részt. Ellenőrizd a projektet, a fájlokat és a kért eredményt, majd válaszd a **Feladatleírás másolása** gombot. A kész szöveget illeszd be a megfelelő projekt Codex-beszélgetésébe.
5. Ha később is használnád, válaszd a **Feladatleírás mentése** gombot. A mentést a **Kedvencek** között találod. A **Jelenlegi függőségek ellenőrzése** az általad elmentett, szerkesztett szöveget mutatja. A **Mentett szöveg másolása** ismét ellenőrzi a skillek elérhetőségét.

## Skill, munkafolyamat vagy forgatókönyv?

| Fogalom | Mire használhatod? |
| --- | --- |
| **Skill** | A Codexnek szóló, egy adott feladathoz készült útmutató. A **Skillkönyvtár** megmutatja a helyét, leírását, állapotát és az elérhető eredetadatokat. |
| **Munkafolyamat** | Egy körülhatárolt feladathoz ad sablont: mi a cél, melyik skill szükséges, mit kell átadni, és hogyan ellenőrizhető az eredmény. A bétában **56 munkafolyamat** van **11 kategóriában**. |
| **Forgatókönyv** | Több munkafolyamatot rendez sorrendbe egy nagyobb célhoz. A **7 forgatókönyv** egyike például **A felület teljes újratervezése**. Kiválaszthatsz egyetlen lépést, saját utasítást írhatsz hozzá, és külön másolhatod a feladatleírását. |
| **Bővítmény és MCP-szerver** | A bővítmény több képességet is csomagolhat. Az MCP-szerver olyan kapcsolat, amelyen keresztül a Codex eszközöket vagy adatokat érhet el. A **Bővítmények és MCP** nézet a helyi beállításokat mutatja. Egy itt felsorolt kapcsolat tényleges működését a Codexben ellenőrizheted. |

A **Projektfelügyelet** nézetben megnézheted a globális `AGENTS.md` állapotát, a kiválasztott projekt dokumentációját, Git-állapotát, utolsó igazolt ellenőrzőpontját és átadhatóságát. Ha a megfelelő Project Lifecycle skill telepítve van, életciklus-feladatot is előkészíthetsz, például projektátadást.

### Miért nem másolható egy feladat?

Másolás előtt az alkalmazás újra beolvassa a kiválasztott projekt leltárát. **Hiányzó kötelező skill** vagy **Letiltott függőség** esetén ellenőrizd a megnevezett skillt a Skillkönyvtárban. **Ellenőrzésre vár** állapotot okozhat például két azonos meghívású telepítés vagy a sablonhoz ellenőrzöttől eltérő skillverzió. Ha változtattál a helyi beállításokon, frissítsd a leltárt.

A hiányzó *opcionális* skill mellett a fő feladat még használható lehet. A **Kézi ellenőrzőpont** olyan lépés, amelyet te végzel el. A **Teljes forgatókönyv másolása** akkor válik elérhetővé, amikor minden kötelező lépés előfeltétele teljesül, és a forgatókönyvhöz van legalább egy használható skill.

## Új skillek keresése és telepítése

A **Skillkönyvtár** tetején a már telepített skilljeid között kereshetsz. Új skillhez ugyanitt válaszd a **Hivatalos katalógus betöltése** gombot. Ez az OpenAI nyilvános GitHub-gyűjteményének fájljegyzékét kéri le. A találatokat már a gépeden szűröd, és a kiválasztott fájlt a jegyzékhez tartozó konkrét verzióban nyithatod meg. [Hivatalos gyűjtemény](https://github.com/openai/plugins)

Egy már letöltött, önálló skill telepítéséhez:

1. Add meg annak a helyi mappának a teljes útvonalát, amelyben egyetlen `SKILL.md` fájl van.
2. Válaszd a **Fájlok előnézete** gombot. Olvasd el az utasításokat, különösen a kért fájl-, eszköz- és fiókhozzáféréseket. Ellenőrizd a célmappát. A megjelenő SHA-256 ellenőrzőösszeg az átnézett fájl tartalmát azonosítja.
3. Ha elfogadod a tartalmat, kattints az **Átnézett skill telepítése** gombra. Az app pontosan az előnézetben látott tartalmat írja a saját felhasználói mappád alatti `.agents/skills/<név>/SKILL.md` fájlba. Ezután a Codexben is ellenőrizd az elérhetőségét.

A jóváhagyás egyszer használható, és öt percig érvényes. Meglévő célmappánál, hivatkozásnál vagy többfájlos csomagnál az import megáll. A telepítő helyi, hard linket támogató fájlrendszert igényel. A művelet során az app nem futtatja a skillben szereplő parancsokat. Eltávolításhoz helyezd át az adott skill mappáját a felderítési mappán kívülre, majd frissítsd a leltárt.

## Hol vannak az adataim?

Minden felhasználó a **saját gépén** talált skilleket és a **saját maga** által felvett projekteket látja. A projektprofilokat, beállításokat, jegyzeteket és feladatleírási előzményeket a helyi `workspace.sqlite` adatbázis tárolja. Az alkalmazásban nincs telemetria vagy gépek közötti automatikus szinkronizálás.

| Rendszer | Az adatbázis alapértelmezett helye |
| --- | --- |
| Windows | `%LOCALAPPDATA%\Skill Control Beta\workspace.sqlite` |
| macOS | `~/Library/Application Support/Skill Control Beta/workspace.sqlite` |
| Linux | `~/.local/share/Skill Control Beta/workspace.sqlite`, vagy a beállított `$XDG_DATA_HOME` alatti `Skill Control Beta/workspace.sqlite` |

A pontos útvonalat a **Beállítások** nézet mutatja. Ha továbbadod az alkalmazást, a repó ZIP-jét oszd meg. A saját adatbázisod és a terminálban megjelenő privát indítási címed maradjon nálad.

## Hibaelhárítás és tesztek

- **A Python-parancs nem indul.** Windows alatt a `py -3 --version` vagy a `python --version`, macOS-en és Linuxon a `python3 --version` paranccsal ellenőrizd, hogy elérhető-e legalább a 3.11-es verzió.
- **Üres a skillkönyvtár.** Első indításkor a projektprofil üres. Ellenőrizd, hogy van-e helyi Codex-skilled. Ha az csak az adott projektben található, válaszd ki a megfelelő projektmappát, majd frissítsd a leltárt.
- **Régi böngészőlapot nyitottál meg.** Indítsd el újra az alkalmazást, és a most kiírt címet használd. A mentett munkaterület a következő indításkor is elérhető.
- **Fejlesztőként lefuttatnád a teszteket.** A kicsomagolt projekt gyökerében futtasd a `python3 -m unittest discover -s tests -v` parancsot (Windowson: `py -3 -m unittest discover -s tests -v`). A két JavaScript-ellenőrzéshez Node.js 22 vagy újabb szükséges: `node tests/availability.mjs` és `node tests/catalog.cjs`.

A közzétett bétaverzió automatizált tesztjei Windowson, macOS-en és Ubuntu Linuxon is lefutottak. A csomaghoz tartozó indítók a gépeden telepített Pythont használják. [Háromplatformos teszteredmény](https://github.com/kalminDR/ai-skill-control/actions/runs/45845478029) · [Külső összetevők és licencek](THIRD_PARTY.md)
