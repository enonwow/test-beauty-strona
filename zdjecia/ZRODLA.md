# Źródła zdjęć dłoni (przykładowe dłonie w kreatorze paznokci)

Pobrane 2026-10-19. Zdjęcia przeskalowane do maks. 1600 px na dłuższym boku i skompresowane (JPEG), poza tym bez zmian.
Miniatury `*-mini.jpg` (200 px) są zrobione z tych samych zdjęć. Na zdjęciach są tylko dłonie, bez twarzy i bez znaków towarowych
(na dlon-1 jest cienki pierścionek bez logo, na dlon-2 rozmyty zegarek w tle bez widocznego napisu).

| Plik | Źródło | Autor | Licencja |
|---|---|---|---|
| dlon-1.jpg | https://unsplash.com/photos/persons-hand-with-white-manicure-DtoWpHt2_d8 | Ellie Eshaghi (@eliiesh) | Unsplash License, https://unsplash.com/license |
| dlon-2.jpg | https://unsplash.com/photos/persons-hand-on-white-textile-SyCC0GQi5S4 | Chelson Tamares (@jd_chon) | Unsplash License, https://unsplash.com/license |
| dlon-3.jpg | https://www.pexels.com/photo/a-close-up-shot-of-a-hand-of-a-person-7298896/ | Kindel Media | Pexels License, https://www.pexels.com/license/ |
| dlon-4.jpg | https://www.pexels.com/photo/hand-on-a-black-background-20694109/ | John Thon | Pexels License, https://www.pexels.com/license/ |
| oczy-1.jpg (kreator rzęs; pobrane 2026-10-19; wycięte samo oko i fragment brwi, tak że osoby nie da się rozpoznać) | https://unsplash.com/photos/selective-focus-of-blue-eyed-person-UbJMy92p8wk | Amanda Dalbjörn (@amandadalbjorn) | Unsplash License, https://unsplash.com/license |

Obie licencje pozwalają na użycie komercyjne i modyfikację bez zgody autora i bez obowiązku podania autorstwa (podajemy je dobrowolnie).
Nie wolno sugerować poparcia przez autora ani osoby ze zdjęcia, nie wolno sprzedawać zdjęć jako takich.
Przed wersją produkcyjną sprawdź, czy licencje nadal obowiązują w tym brzmieniu (stan na dzień pobrania).

`dlonie.json` to ręcznie sprawdzona kalibracja: dla każdego zdjęcia linia skórek, środek wolnego brzegu i szerokość płytki każdego widocznego
paznokcia (współrzędne w pikselach zapisanego pliku), a dla dlon-4 dodatkowo kontur płytki (stary lakier jest zakrywany).

## Miniatury kreatorów na stronie głównej (`k-*.jpg`, 480×360)

Pobrane 2026-10-19. `k-paznokcie.jpg` to kadr z dlon-1.jpg, `k-brwi.jpg` kadr z oczy-1.jpg, `k-rzesy.jpg` to oczy-1.jpg z rzęsami narysowanymi przez kreator (styl kocie oko, 3D). Dwa nowe zdjęcia, na których nie widać twarzy w całości:

| Plik | Źródło | Autor | Licencja |
|---|---|---|---|
| k-fryzjer.jpg | https://unsplash.com/photos/two-women-with-long-wavy-blonde-and-brunette-hair-RpFQdgJ9gQw | Yovanka Loria Salon (@yovankaloriasalon) | Unsplash License, https://unsplash.com/license |
| k-kosmetyka.jpg | https://unsplash.com/photos/facial-treatment-with-brush-applying-white-cream-to-face-Xxs9WvkUPLo | kimia kazemi (@kimick) | Unsplash License, https://unsplash.com/license |

## Przykładowe włosy w kreatorze fryzjera (`wlosy-*.jpg`, `wlosy-*-mini.jpg`, `wlosy-*-maska.png`)

Pobrane 2026-10-19 z Unsplash (zdjęcia z darmową licencją, nie Unsplash+). Wycięte w kwadrat 1000×1000 px i skompresowane (JPEG), poza tym bez zmian.
Na zdjęciach nie ma twarzy (ujęcia od tyłu). Miniatury `*-mini.jpg` mają 200 px. `wlosy-*-maska.png` to maska włosów (ile piksela to włosy, w skali szarości)
policzona raz modelem MediaPipe hair_segmenter z tego samego zdjęcia; dzięki niej kreator nie pobiera MediaPipe, dopóki klientka nie wybierze własnego zdjęcia.

| Plik | Źródło | Autor | Licencja |
|---|---|---|---|
| wlosy-1.jpg (ciemny brąz, długie, fale) | https://unsplash.com/photos/the-back-of-a-womans-head-with-long-dark-hair-6bqsO6F636w | Thalia Ruiz (@thalia_s_ruiz) | Unsplash License, https://unsplash.com/license |
| wlosy-2.jpg (średni brąz, długie, proste) | https://unsplash.com/photos/woman-in-white-dress-shirt-rXQTWJFPDn4 | Liubov Ilchuk (@liubovilchuk) | Unsplash License, https://unsplash.com/license |
| wlosy-3.jpg (jasny blond, do łopatek, proste) | https://unsplash.com/photos/woman-wearing-gray-top-ORCPTrkkezw | Alexander Grey (@sharonmccutcheon) | Unsplash License, https://unsplash.com/license |
| wlosy-4.jpg (złoty brąz z jasnymi pasmami, do ramion, fale) | https://unsplash.com/photos/woman-near-wall-SxPISzSxJrQ | Tim Mossholder (@timmossholder) | Unsplash License, https://unsplash.com/license |

## Brwi (kreator brwi, zdjęcie bazowe bez selfie)

Pobrane 2026-10-19. Wycinek ze zdjęcia 2400 × 1600: brew i górna część oka, przeskalowany do 1600 × 968, bez reszty twarzy, tak że osoby nie da się rozpoznać.
Krawędzie brwi (`DEMO.top` i `DEMO.bottom` w `brwi.html`) zaznaczone ręcznie na tym pliku; po zmianie kadru trzeba je poprawić.

| Plik | Źródło | Autor | Licencja |
|---|---|---|---|
| brwi-1.jpg | https://unsplash.com/photos/close-up-of-a-persons-eye-YCMkMQevCIE | Gabrielle Wright (@gabrielle_wright) | Unsplash License, https://unsplash.com/license |

## Zdjęcie do wyboru długości włosów (`wlosy-dlugosc.jpg`)

Pobrane 2026-10-22 z Unsplash (darmowa licencja, nie Unsplash+). Rozmiar 1000×1500 px (format 2:3, wycinek z serwera Unsplash), JPEG, poza tym bez zmian. Osoba jest od tyłu, w salonie, bez twarzy.
Poziomy długości (ucho, ramiona, łopatki, pas, poniżej pasa) są wyskalowane raz ręcznie na tym zdjęciu, w `fryzjer.html` (`DL_Y`). Linie rysuje SVG na zdjęciu, maska włosów nie jest już potrzebna.

| Plik | Źródło | Autor | Licencja |
|---|---|---|---|
| wlosy-dlugosc.jpg | https://unsplash.com/photos/person-wearing-black-top-W6cwaL7PMSw | Jessie Dee Dabrowski (@jessiedeexx) | Unsplash License, https://unsplash.com/license |

## Miniatury gotowych stylizacji (`styl-*.jpg`, 600×450)

`styl-micro-french.jpg`, `styl-velvet-burgund.jpg` i `styl-glazed-pearl.jpg` to rendery kreatora paznokci (silnik lakieru z `paznokcie.html`) na zdjęciach
dlon-1.jpg (micro french i glazed pearl) oraz dlon-3.jpg (velvet burgund), z kadrem na paznokcie i kompresją JPEG. Licencje i autorzy jak dla tych zdjęć wyżej.

## Kosmetologia (krok „Obszar”)

Pobrane 2026-10-19. `kosmetologia-1.jpg`: kadr 640 × 800 z wersji 1600 × 1067 (x 500–1140, y 240–1040): twarz z zamkniętymi oczami, szyja i dekolt. Twarz jest widoczna, bo wybór obszaru „twarz” tego wymaga; zdjęcie służy tylko jako ilustracja obszaru, bez sugerowania, że osoba poleca studio.
Obrysy obszarów (`OBSZAR` w `kosmetyka.html`) zaznaczone ręcznie na tych plikach; po zmianie kadru trzeba je poprawić.

| Plik | Źródło | Autor | Licencja |
|---|---|---|---|
| kosmetologia-1.jpg | https://unsplash.com/photos/a-woman-with-her-eyes-closed-standing-in-front-of-a-building-hzQ1VAEJoW4 | Ann Danilina (@annhwa) | Unsplash License, https://unsplash.com/license |
| plecy-1.jpg | https://unsplash.com/photos/the-back-of-a-woman-wearing-a-white-dress-p5JqZjuC0Zk | Kateryna Hliznitsova (@kate_gliz) | Unsplash License, https://unsplash.com/license |

## Zdjęcia kategorii, studiów i happy hours (`kat-*.jpg`, `studio-*.jpg`, `hh-*.jpg`, `salon-wnetrze.jpg`)

Pobrane 2026-10-21 z Unsplash (darmowa licencja, nie Unsplash+), w szerokości 1200 px (studio-lilia 900 px) przez serwis obrazków Unsplash, poza tym bez zmian.

| Plik | Gdzie | Źródło | Autor | Licencja |
|---|---|---|---|---|
| kat-paznokcie.jpg | start, kafel Paznokcie | https://unsplash.com/photos/hand-with-mauve-and-glitter-nails-Y14F-1vzVds | @newleonin | Unsplash License, https://unsplash.com/license |
| kat-rzesy.jpg | start, kafel Rzęsy | https://unsplash.com/photos/woman-left-eye-Wude2F3CMss | @aaaarupar | Unsplash License |
| kat-brwi.jpg | start, kafel Brwi | https://unsplash.com/photos/a-close-up-of-a-womans-eye-with-makeup-nt6KRD9im7A | @lintin9095 | Unsplash License |
| kat-fryzjer.jpg | start, kafel Fryzjer | https://unsplash.com/photos/person-holding-gray-hair-curler-MMz03PyCOZg | @bayleejadegramling | Unsplash License |
| kat-kosmetyka.jpg | start, kafel Kosmetyka | https://unsplash.com/photos/woman-receiving-facial-skincare-treatment-PqyzuzFiQfY | @karelysruiz | Unsplash License |
| studio-malwa.jpg | Studio Malwa: wyniki, start, profil, galeria studia | https://unsplash.com/photos/a-woman-getting-her-nails-done-at-a-nail-salon-gb6gtiTZKB8 | @giorgiotrovato | Unsplash License |
| studio-iga.jpg | Lash Room Iga | https://unsplash.com/photos/eyelash-extensions-application-in-salon-sRSRuxkOuzI | @hayleykimstudios | Unsplash License |
| studio-nude.jpg | Atelier Nude | https://unsplash.com/photos/hand-with-light-pink-manicured-nails-vtQHwU4F13s | @jd_chon | Unsplash License |
| studio-lilia.jpg | Pracownia Lilia | https://unsplash.com/photos/a-potted-plant-sitting-next-to-a-white-vase-qtoMPyiIBPA | @alonagrrr | Unsplash License |
| studio-loft.jpg | Salon Loft | https://unsplash.com/photos/hairstylist-blow-drying-client-hair-FkAZqQJTbXM | @awcreativeut | Unsplash License |
| hh-manicure.jpg | start, happy hours (paznokcie) | https://unsplash.com/photos/womans-hand-with-ornate-nails-holding-a-delicate-plant-mciNDxIq4J0 | @julia_2501 | Unsplash License |
| hh-brwi.jpg | start, happy hours (brwi) | https://unsplash.com/photos/a-woman-getting-her-eyebrows-done-by-a-professional-hair-stylist-CqEGy4zAmbI | @bermixstudio | Unsplash License |
| salon-wnetrze.jpg | galeria strony studia | https://unsplash.com/photos/a-room-with-a-chair-sink-and-a-plant-in-it-Ui6DZ9A1eXU | @unsplashbydan | Unsplash License |

Na kat-kosmetyka, studio-iga, hh-brwi i studio-malwa widać część twarzy albo osoby w salonie: Unsplash License pozwala na użycie, ale nie wolno sugerować, że te osoby polecają aplikację albo studio. Przed wersją produkcyjną sprawdź licencję ponownie.

