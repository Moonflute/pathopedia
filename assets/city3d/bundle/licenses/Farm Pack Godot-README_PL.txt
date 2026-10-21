Farm Pack - wersja glTF dla Godota 4.7
=======================================

Zrodlo: FarmPack_Godot.zip (folder FBX + tekstura Farm Atlas.png).

Zawartosc
- Models/       308 modeli (.glb) w 8 kategoriach:
                Nature 86, Fences and Roads 51, Fields and Crops 47, Vehicles 45,
                Buildings 39, Tools and Props 19, Produce 15, Animals 6.
- Materials/    4 wspolne materialy (.tres). Uzywaja ich wszystkie modele.
- Textures/     farm_atlas.png (1024x1024, cala paczka jedzie na tym jednym atlasie).
- Environment/  Farm_Environment.tres - niebo i swiatlo otoczenia.
- Test/         ModelBrowser.tscn - przegladarka calej paczki, z kategoriami.

Wazne: w zrodle kazdy model byl dwa razy
   Folder FBX mial 612 plikow, ale to 308 modeli wyeksportowanych dwa razy:
   raz jako "Barn_1_A.fbx" (materialy FarmMat / FarmMetMat), raz jako "SM_Barn_1_A.fbx"
   (materialy M_Atlas_Farm / M_Metalic_1_Farm). Geometria identyczna - to ten sam eksport
   w dwoch konwencjach nazw.
   Wzialem nowszy zestaw (SM_), bo jest czystszy. Stary ciagnal za soba smieci z innych
   projektow: 11 plikow wskazywalo na teksture "Kithcen.png", Scythe.fbx na mapy
   DefaultMaterial_* i "Wood_1 BaseColor.png", Pig.fbx na "4.png" - zadnej z tych tekstur
   nie ma w paczce.
   Cztery modele istnialy TYLKO w starym zestawie: Fence_3_3_A, House_1_A, House_1_B,
   WindTower_1. Doklejylem je i przemianowalem na SM_ + nowe nazwy materialow, zeby
   caly folder byl spojny.
   Warto to posprzatac takze w wersji na Unity - kupujacy sciaga teraz wszystko dwa razy.

Kategorie
   W zrodle wszystkie pliki leza w jednym folderze. Poukladalem je w 8 kategorii po nazwach
   (SM_Tractor -> Vehicles, SM_Field -> Fields and Crops itd.). Nazwy plikow bez zmian.
   Jak wolisz inny podzial - powiedz, to przekladam.

1. Import
   Skopiuj folder "Farm Pack" do projektu (razem z plikami .import) i poczekaj,
   az Godot zaimportuje pliki (ok. 1-2 minuty).
   Materialy i tekstura sa podpiete przez UID, wiec folder moze lezec gdziekolwiek w projekcie.

2. Przegladarka
   Otworz Test/ModelBrowser.tscn i nacisnij F6 (Run Current Scene).
   - lista kategorii po lewej, nizej lista modeli z filtrem (np. "Tractor" albo "Field")
   - "Show category as grid" ustawia cala kategorie w siatke
   - przeciaganie mysza = obrot kamery, kolko = zoom
   - na dole rozmiar wybranego modelu w metrach

Ruchome czesci
- 74 modele maja czesci jako osobne wezly, gotowe do animowania z kodu:
  samochody - kola SM_FL, SM_FR, SM_RL, SM_RR
  traktory  - SM_TractorWheels_F, SM_TractorWheels_R, SM_Tractor_Sterring (kierownica)
  stodoly   - SM_BarnDoor_*
  wiatrak   - SM_WindTower_1_Turbin (smiglo) i SM_WindTower_1_Motor

Materialy
- M_Atlas_Farm     - podstawowy, 288 modeli (metallic 0.413, roughness 1.0)
- M_Metalic_1_Farm - metal: maszyny, silosy, ogrodzenia (metallic 0.628, roughness 0.421)
- M_Metalic_2_Farm - metal, minimalnie bardziej matowy (roughness 0.486)
- M_Metalic_3_Farm - slabo metaliczny (metallic 0.105, roughness 0.604)
- Wartosci przeniesione 1:1 z plikow FBX. Culling tylnych scian wylaczony (cull_mode = 2).
- Zmiana w jednym pliku .tres zmienia wszystkie modele.
- Podpiecie jest w plikach .glb.import (Advanced Import Settings -> Materials -> Use External).
- Drobiazg: glowny material ma metallic 0.413 przy roughness 1.0. Tak jest w zrodle,
  wiec nie ruszalem, ale jesli chcesz czysto matowy wyglad - wystarczy zmienic metallic
  na 0 w Materials/M_Atlas_Farm.tres.

Co jeszcze zostalo poprawione
- Transformacje wypieczone w siatke - kazdy wezel ma skale 1.0 i zerowy obrot.
- Z nazw wezlow zniknely koncowki po duplikatach z Blendera (".001", ".006") - w 43 plikach.
- Kazdy .glb ma podpieta teksture wzglednie (../../Textures/), wiec dziala tez poza Godotem.

Liczby
- 308 modeli, 582 583 trojkaty razem, srednio 1891 na model, mediana 724.
  56% modeli ponizej 1000 trojkatow. Najwiekszy: SM_House_1_A/B (17 613).
- Skala: 1 jednostka = 1 m. Od 13 cm (SM_Potato_1) do 24 m (SM_Road_1_4).
- Sprawdzone w Godot 4.7.2: import bez bledow, walidator glTF (Khronos) bez bledow,
  wszystkie 308 modeli uzywa wspolnych materialow.
