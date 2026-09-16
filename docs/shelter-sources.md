# CNMI typhoon shelters - evidence trail

Research date: 2026-09-16. Companion files: `cnmi-shelters.json` (17 shelters), `cnmi-contacts.json`, `water-points.json` (18 points).

## 1. Summary of what is authoritative

The single best source is the CNMI Governor / HSEM Joint Information Center archive at
`https://governor.cnmi.gov/jic/sinlaku/` (bulletins #1-#27, each embedding a PDF). It gives:

* **HSEM Typhoon Sinlaku Bulletin #2 (12 Apr 2026, 2:00 PM)** and **#3 (13 Apr 2026)** - the official pre-storm shelter designation, pet policy, Office on Aging role, and State Warning Point numbers.
* **JIC SITREPs 013-034 (26 Apr - 13 May 2026)** - per-facility shelter rosters (including overflow sites), CUC filling-station list with hours, C-POD schedule, reverse-osmosis water sites, and hotlines.

Second tier: the HSEM press release for Super Typhoon Bavi as republished verbatim by Marianas Press (2 Jul 2026), JIC counts as reported by KPRG/islapublic.org (6 Jul 2026), the Governor's office Mawar release (24 May 2023), the HSEM 2015/2019 storm bulletins on cnmihsem.gov.mp (phone numbers), and the American Red Cross open-shelter list of 17 Apr 2026 (captured in an American Kidney Fund PDF).

Third tier (news, partly blocked): Marianas Variety (rate-limited / bot-challenged - only the Oct 2023 'Stay calm' article could be read in full; the Sinlaku capacity/secondary-shelter articles were seen only as search-engine excerpts), NMI News Service (403 on every fetch), Saipan Tribune (Nov 2018 Yutu page readable), RNZ, Kandit, CEDR Digital Corps and FEMA/ReliefWeb for Yutu 2018.

## 2. Every URL fetched, and what it said

### 2.1 Official HSEM / Governor / JIC

**https://governor.cnmi.gov/wp-content/uploads/2026/04/Typhoon-Sinlaku-Bulletin-2-Press-Release.pdf** (HSEM, 12 Apr 2026, fetched via governor.cnmi.gov/jic/sinlaku/typhoon-sinlaku-bulletin-2/). Verbatim:

> Shelter Updates Shelters Activated
> Shelters will open at 4:00 pm on April 12, 2026. Residents who need shelter assistance are asked to use the shelters closest to their homes. Residents are expected to bring their own bedding, food, and drinks to the shelter. No pets are permitted in the shelter unless they are certified service animals. An ID should be presented upon entry. To ensure the safety and comfort of all residents, we kindly ask that those seeking shelter bring only essential items. Due to limited space and capacity at our shelter locations.
> 1. Saipan: Kagman High School (North), Koblerville Elementary (South), and Marianas High School (Central).
> 2. Tinian: Tinian Elementary School
> 3. Rota: Sinapalo Office on Aging (Primary), Dr. Rita Hocog Inos Jr./Sr. High School (Secondary)
> For Saipan, the Office on Aging is open to accommodate persons with disabilities and those with medical needs. Services under these categories include individuals who are wheelchair bound, who need oxygen, and those with ailments that do not need to be admitted to the hospital.
> For Rota, the Office on Aging in Sinapalo is the designated shelter. For inquiries, please call Valerie Q. Apatang at (670) 532-2656.
> Transportation to Shelters [...] Saipan, Tinian, and Rota: EOC State Warning Point: (670) 237-8000 or (670) 664-8000

Also: "shelter through CHCC. Please call (670) 234-8950 for assistance" (medical support to reach a shelter).

**https://governor.cnmi.gov/wp-content/uploads/2026/04/Typhoon-Sinlaku-Bulletin-3-Press-Release.pdf** (HSEM, 13 Apr 2026). Same shelter list ("Shelters opened up at 4:00 pm on April 12, 2026"). Adds:

> Sheltering for Registered Sex Offenders: The Registered Sex Offenders' designated shelter is located at the Koberville [sic] Youth Center.

**https://governor.cnmi.gov/jic/sinlaku/** and `/page/2/`, `/page/3/` - index of bulletins #1-#27 (bulletin #5 returns 404). Bulletin pages #9-#27 embed SITREP PDFs at `https://governor.cnmi.gov/wp-content/uploads/2026/05/<Date>-SITREP-CNMI-JIC.pdf` (the `gov_content/uploads/...` and `storage/...` URLs returned by search engines are dead, 404).

**JIC UPDATE 013, 26 Apr 2026** (`.../2026/05/Apr-26-SITREP-CNMI-JIC.pdf`). Verbatim:

> Saipan Filling Stations (Effective 04/25)
> ● Puerto Rico Road, Puerto Rico — 8:00 AM to 11:00 PM daily
> ● Dr. Torres Drive (WSR Elementary), Chalan Kanoa — 8:00 AM to 11:00 PM daily
> ● Tinaktak Drive, Koblerville — 8:00 AM to 6:00 PM daily
> ● Capitol Hill Road, Capitol Hill — 8:00 AM to 6:00 PM daily
> ● Chacha Road, Kagman — 8:00 AM to 11:00 PM daily
> ● Tuturam Drive, San Vicente — 8:00 AM to 11:00 PM daily
> Additional filling stations are being used to support government tanker operations supplying emergency shelters and critical facilities.
> SHELTERS & HOUSING
> Saipan Shelters & Housing
> ● Marianas High School (1) ● Marianas High School (2) ● Oleai Head Start ● Koblerville Elementary School ● Kagman High School ● Dandan Head Start ● Garapan Elementary School ● DCCA Kagman Community Center
> Tinian Shelters & Housing
> ● Tinian Elementary School ● Magdalena M. Hofschneider, Tinian Head Start
> Current Population: 565 (increase of 2 as of 4/25/2026)
> CNMI EOC Hotline (670)-237-8000 or (670)-287-7106

**JIC UPDATE 020, 30 Apr 2026** (`Apr-30-SITREP-CNMI-JIC-1.pdf`): same shelter list (adds "Kagman Community Center" line alongside "DCCA Kagman Community Center"), "Current Shelter Population: 488".

> Saipan Filling Stations (Effective 04/30)
> ● Capitol Hill Water Filling Station | Open 8AM - 6PM DAILY
> ● Puerto Rico Water Filling Station | Open 8AM - 11PM DAILY
> ● Chalan Kanoa Water Filling Station | Open 8AM - 11PM DAILY
> ● San Vicente Water Filling Station | Open 8AM - 11PM DAILY
> Effective Friday, May 1, 2026 the KOBLERVILLE and KAGMAN WATER FILLING STATIONS will be CLOSED.
> MRE and Bottled Water Distribution (Saipan) [...] Date: Friday, May 1, 2026 Time: 0900 – until supplies last
> ● Kagman (Direct Distribution): Door-to-door distribution [...] ● C-POD Sites (Islandwide)

**JIC UPDATE 022, 2 May 2026** (`May-2-SITREP-CNMI-JIC.pdf`): "Current Shelter Population: 442* ... cumulative count since April 30, 2026".

> POTABLE WATER SUPPORT (SAIPAN) Free potable water distribution remains available [...] Location: Paupau Beach and Hopwood Middle School Hours: 0700 – 1900 daily Limit: Up to 100 gallons per vehicle This water filling station is operated using reverse osmosis systems and is a joint effort between the Federal Emergency Management Agency, CNMI Government, and the United States Air Force.
> CUC Trouble Desk 670-664-4282 or 670-236-4333

**JIC UPDATE 024, 4 May 2026** (`May-4-SITREP-CNMI-JIC.pdf`):

> ● May 4, 2026 | Airport Field | 0900 – Until supplies last
> ● May 6, 2026 | Koblerville Youth Center | 0900 – Until supplies last
> ● May 8, 2026 | Garapan Fishing Base | 0900 – Until supplies last
> Current Shelter Population: 421 (increase of 3). Transition to long-term sheltering (Tier 2) is ongoing. Kagman Community Center (KCC) currently houses 60 individuals; with three (3) transfers from Dandan School, occupancy will increase to 63. Preparations at Tanapag Youth Center continue, focusing on water pump and shower installation.

**JIC UPDATE (8 May 2026)** (`May-8-SITREP-CNMI-JIC.pdf`): filling stations now Puerto Rico, Chalan Kanoa, Tuturam-San Vicente only (Capitol Hill dropped); shelter list unchanged; "Non Congregate Shelter (NCS) - Crowne Plaza" added; and

> Location: Garapan Fishing Base and Sugar Dock Hours: 1000 – 1800 daily

(also present 9 and 10 May).

**JIC UPDATE 034, 13 May 2026** (`May-13-SITREP-CNMI-JIC.pdf`). Verbatim table:

> Island Site Name Clients Pets / SAIPAN Garapan Elementary School 11 0 / Kagman Community Center 46 0 / Koblerville Elementary School 44 1 / Marianas High School 59 0 / Marianas High School Unit 2 13 0 / Non Congregate Sheltering (NCS) – Crowne Plaza 12 0 / NCS – Finasisu Terraces 8 0 / Oleai Elementary School 15 0 / TINIAN NCS – Western Lodge 6 0 / Grand Total 214 1 / Current Shelter Population: 214 (decrease of 26)

**https://governor.cnmi.gov/wp-content/uploads/2026/04/JIC09-Bottled-Drinking-Water-Distribution-to-be-Held-in-Airport-Field-Starting-Thursday-April-23-2026.pdf** - JIC09 notice of the Airport Field bottled-water POD (text layer garbled; title and date usable).

**https://governor.cnmi.gov/news/now-in-effect-typhoon-condition-i-for-saipan-tinian-and-rota/** (13 Apr 2026): no shelter names; "residents currently living in non-concrete or otherwise vulnerable structures are strongly advised to relocate to more structurally sound shelters without delay"; HSEM PIO Bernard Villagomez 670-287-7106.

**https://governor.cnmi.gov/news/governor-palacios-maintains-typhoon-condition-i-for-rota-tropical-storm-condition-i-for-saipan-and-tinian/** (Mawar, 24 May 2023). Verbatim shelter list: SAIPAN "Marianas High School (Cafeteria)", "Koblerville Elementary School (Cafeteria)", "Kagman High School (Cafeteria)", "Kagman Community Center"; TINIAN "Tinian Elementary School (Cafeteria)"; ROTA "Sinapalo Office on Aging". "No pets are permitted in the shelter unless the pet is a certified service animal." "An ID should be presented upon entry." "Shelters were activated Monday afternoon at 4:00 p.m., May 22, 2023". Transport: Saipan (670) 237-8000, (670) 236-2682; Tinian (670) 783-8962 or 433-9250, (670) 433-1800 or 433-1803; Rota (670) 532-9451/2, (670) 286-6618.

**https://governor.cnmi.gov/news/updated-contact-information-for-shelter-transport/** (21 May 2023): Saipan "EOC State Warning Point: (670) 237-8000"; Tinian "COTA (670) 433-0011", "PSS (670) 783-8962", "Tinian Municipality Operation Center (670) 483-1800" [sic - 433-1800 elsewhere]; Rota "Rota Mayor's Office (670) 532-9451/2".

**https://governor.cnmi.gov/typhoon-recovery/**: S.T.R.O.N.G. tent/roof mission; phones Governor (670) 237-2200, DPW (670) 235-9570, USACE debris (670) 588-9850, FEMA 1-800-621-3362, SBA 800-659-2955, CUC Rota (670) 532-9413. No shelter or water lists.

**https://governor.cnmi.gov/bulletins/**: index only.

**https://www.cnmihsem.gov.mp/downloads/weather/Wutip/BULLETIN_07A_02-22-19_1115_PM.pdf** (HSEM, 22 Feb 2019) letterhead: "Telephone: (670) 664-2216 (mainline) ... EOC STATE WARNING POINT (24/7) Tel. No. (670) 237-8000 or (670) 664-8000 Fax No. (670) 322-9500 ... ReadyCNMI App". Body: "CALL CNMI EOC STATE WARNING POINT AT 237-8000 OR 664-8000, AND FOR THE NORTHERN ISLANDS ... HIGH FREQUENCY SINGLE SIDE BAND RADIO ON FREQUENCY 5.205.0".

**https://cnmihsem.gov.mp/downloads/weather/BULL_NO.05.pdf** (HSEM, Soudelor, 1 Aug 2015): "CNMI DISPATCH CENTER (24/7) Tel. No. (670) 237-8000/3"; no shelter list in that bulletin (later Soudelor bulletins not online). `https://hsem.gov.mp/` does not resolve; `https://cnmihsem.gov.mp/` root returns 403 "Under Maintenance".

**https://opd.gov.mp/assets/gov_directory.pdf** (CNMI government directory): "Walter A. Manglona Director - Office on Aging 670-233-1321/22"; "24-Hour Call Center 670-664-4282 (4CUC)"; CUC Rota 670-532-9411/9414; CUC Tinian 670-433-9265.

### 2.2 HSEM releases carried by media

**https://marianaspress.com/news/article/shelters-on-saipan-tinian-and-rota-to-open-on-friday-july-3-2026-at-300pm** (2 Jul 2026, HSEM press release, Bavi). Shelters: Saipan "Kagman High School", "Marianas High School", "Koblerville Elementary School"; Tinian "Tinian Head Start", "Tinian Elementary School"; Rota "Dr. Rita Hocog Inos Jr./Sr. High School". "shelters on Saipan, Tinian, and Rota will open on Friday, July 3, 2026, at 3:00 p.m. ChST". "Weapons, alcohol, illicit drugs, smoking materials, and pets are not allowed in shelters, except for service animals." "Present a valid form of identification upon entry." Transport: COTA "(670) 237-8000 or (670) 664-8000".

**https://kanditnews.com/get-into-concrete-shelter-now/** and **https://kanditnews.com/cnmi-typhoon-condition-ii-declared-guam-govguam-schools-courts-closed-preparations-underway/** (12 Apr 2026): reproduce HSEM Bulletin #2 shelter block verbatim, incl. "3. Rota: Sinapalo Office on Aging (Primary), Dr. Rita Hocog Inos Jr./Sr. High School (Secondary)" and the Office on Aging disability sentence, "EOC State Warning Point: (670) 237-8000 or (670) 664-8000".

**https://www.mvariety.com/news/local/stay-calm-and-protected/article_1afde326-6664-11ee-87ec-1b8361401fb4.html** (PSS, Bolaven, Oct 2023): "Designated shelters will include Koblerville Elementary School for residents in the southern part of Saipan; Marianas High School for those living in the central part of Saipan; Kagman High School for those in the eastern part of Saipan; and Tinian Elementary School on Tinian. Shelters will also open at the Aging Centers on Saipan and Rota."

### 2.3 JIC counts as reported

**https://www.islapublic.org/news/2026-07-06/more-than-500-residents-take-shelter-as-bavi-pounds-the-marianas** (KPRG, 6 Jul 2026): "The Joint Information Center reported that 517 residents were sheltering across the Commonwealth as of Monday morning ... On Saipan, 150 individuals sheltered at Marianas High School, 66 at Kobler Elementary School, 69 at Kagman High School, 84 at Garapan Elementary School, and 33 at Kagman Community Center. In Tinian, 61 residents took shelter at Tinian Elementary School and Tinian Middle/High School. On Rota, 25 residents sheltered at Dr. Rita Hocog Inos Jr./Sr. High School, while 29 stayed at the Rota Aging Center."

**https://www.islapublic.org/news/2026-07-09/power-water-restoration-push-forward-across-saipan-tinian-and-rota-after-bavi**: "Power was restored to portions of San Jose Village, including the health center, the shelter at Tinian Elementary School"; CUC "prioritizing critical infrastructure including water wells, wastewater facilities, shelters, the airport and the hospital."

**https://www.islapublic.org/news/2026-04-27/as-hundreds-remain-sheltered-sinlakus-impact-still-deeply-felt**: "565 people remained in shelters across Saipan and Tinian as of April 25"; names Marianas High School and Koblerville Elementary School cafeteria shelters.

**https://www.islapublic.org/news/2026-07-04/still-recovering-from-sinlaku-cnmi-braces-as-bavi-nears-monday-landfall**: "292 people already in shelters as of Saturday"; no names.

**https://marianaspress.com/news/article/evacuees-to-typhoon-shelters-rise-to-303** (14 Apr 2026): "Marianas High School has the highest number of evacuees with 81", "Koblerville Elementary School with 64", "Kagman High School with 63", "Saipan Aging Center with 25", "Tinian Elementary School with 45", "Tinian Head Start 14", "Rota Aging Center with 11".

**https://www.rnz.co.nz/international/pacific-news/592283/apatang-says-cnmi-is-prepared-for-super-typhoon-sinlaku-as-265-enter-emergency-shelter** (14 Apr 2026): MHS 65, KES 63, KHS 62, "Saipan and Rota ageing centres are housing 26 and 11", Tinian ES 38; "Public School System is housing 190 evacuees on Saipan and 38 on Tinian".

**https://www.rnz.co.nz/news/pacific/677872/cnmi-officials-urge-residents-to-shelter-as-super-typhoon-bavi-approaches** (6 Jul 2026): Rota residents urged to "evacuate to the Office of Aging in Sinapalo or Dr Rita Hocog Inos Jr/Sr High School in Songsong".

### 2.4 Red Cross open-shelter list (via AKF)

**https://www.kidneyfund.org/sites/default/files/media/documents/drp-resource-guide-typhoon-sinlaku-4-17-2026.pdf** (17 Apr 2026), section "American Red Cross - Open Shelters", verbatim:

> ii. Dr Rita Hocog Inos Jr Sr High School- 44RW 733, Songsong, MP 96951 (Open 24 Hours)
> iii. Tinian Head Start- San Jose, Tinian, MP 96952 (Open 24 Hours)
> iv. Koblerville Elementary School- As Gonno Road, Saipan, MP 96952 (Open 24 Hours)
> v. Marianas High School- Bwaay Lane, Siapan, MP 96950 (Open 24 Hours)
> vi. ManAmko Center Office on Aging- Kopa Di Oru St, Saipan, MP 96950 (Open 24 Hours)
> vii. Kagman High School- Half Flower Street, Saipan, MP 96950 (Open 24 Hours)
> viii. Tanapag Youth Center- 6QR4+9RV, Tanapag, MP 96950 (Open 24 Hours)

Also Red Cross contact "(671-472-6217) or (800-733-2767)", FEMA "800.621.3362".

### 2.5 Marianas Variety articles seen only via search-engine excerpts (fetch blocked: HTTP 429 via WebFetch, TownNews bot challenge via curl, 403 via reader proxy, no Wayback snapshot)

* `.../local-news-166-residents-in-shelters-as-sinlaku-approaches-marianas/article_31f79a8f-...` - excerpt: "As of noon Monday, 166 residents had taken shelter at Kagman High School, Marianas High School, Koblerville Elementary School, and the Office on Aging"; "Kagman High School (North), Koblerville Elementary (South), and Marianas High School (Central). The Office on Aging was open to accommodate persons with disabilities and those with medical needs".
* `.../local-news-pss-activates-secondary-shelters-as-evacuee-numbers-rise-ahead-of-sinlaku/article_64ba73f3-...` - excerpt: "secondary shelters on Saipan, Tinian and Rota being opened as of 3 p.m. Monday, April 13"; "Kagman Elementary School was designated as a secondary shelter, supporting the nearby Kagman High School cafeteria, which was nearing capacity with 61 evacuees out of an 80-person limit"; "At Marianas High School, the secondary shelter is located in its second cafeteria".
* `.../local-news-shelters-across-saipan-tinian-exceed-50-capacity-as-sinlaku-nears/article_16cff46e-...` - excerpt: "Marianas High School's main cafeteria is designed for 100 occupants and had taken in 68 individuals as of 1 p.m."; "Koblerville Elementary School can accommodate up to 100 individuals and had 58 shelterees"; a conflicting excerpt gives MHS 80 and KES 418.
* `.../local-news-hundreds-evacuate-to-shelters-as-super-typhoon-bavi-nears-marianas/article_c4b8a1df-...` - excerpt: "Garapan Elementary School, a secondary designated shelter site, received 77 shelterees".
* `.../local-news-saipan-still-in-the-dark-water-and-power-recovery-lags-after-sinlaku/article_7c792595-...` - excerpt: CUC stations "in Puerto Rico in front of the Governor Eloy S. Inos Peace Park; in Chalan Kanoa on Dr. Torres Drive in front of William S. Reyes Elementary School; in San Vicente on Tuturam Drive behind San Vicente Central Park; and in Kagman on Chacha Road across from Santa Soledad Church ... daily from 8 a.m. to 11 p.m."
* `https://www.mvariety.com/news/local/130-people-seek-shelter/article_d0e49aa8-...` (Bolaven Oct 2023) - excerpt: "16 individuals in the Koblerville Elementary School cafeteria and 53 in the Kagman High School cafeteria".

### 2.6 NMI News Service (403 on every route; search excerpts only)

* `https://www.nminewsservice.com/cnmi-typhoon-condition-ii-sinlaku-shelters/` - "Shelters opened at 4:00 pm on April 12, 2026 ... Kagman High School (North), Koblerville Elementary (South), and Marianas High School (Central)".
* `https://www.nminewsservice.com/sinlaku-recovery-rundown-day-14-april-29-2026/` - "Water at Tanapag Thursday"; Paupau Beach / Hopwood potable water 7am-7pm 100 gal; Samaritan's Purse Garapan Fishing Base and Sugar Dock 10am-6pm.
* `https://www.nminewsservice.com/saipan-water-filling-stations-cuc/` and `.../saipan-water-filling-stations-close-july-12/` (Bavi) - the same four CUC stations reopened 7 Jul 2026, 8 a.m.-11 p.m., "closed effective Sunday, July 12, after the utility reported reaching 24-hour water service".
* `https://www.nminewsservice.com/sinlaku-recovery-day-45-jic-update-040/` - Tanapag Youth Center "at zero clients" on 27 May 2026.
* `https://www.nminewsservice.com/sinlaku-recovery-day-20-jic-022-may-2-2026/` - C-POD schedule (matches JIC 024 above).

### 2.7 CUC

* **https://www.cucgov.org/typhoon-safety/**: "For power and water outage advisories and updates, please call the CUC hotline at (670) 236-4333"; customer service "(670) 664-4282 (4CUC)".
* **https://www.cucgov.org/customer-service/**: "(670) 664-4282".
* **https://www.cucgov.org/news-and-events/public-advisories/2026-july-07-public-advisory-st-bavi-re-water-filling-stations-for-the-island-of-saipan/** and the Rota advisory of the same date: content is JPEG page scans only (no text layer, no OCR available here). Station names for Bavi therefore rest on the NMI News Service excerpts in 2.6.
* **https://marianaspress.com/news/article/commonwealth-utilities-corporation-situation-report-as-of-1pm-chst-04222026** (22 Apr 2026): restoration status only.

### 2.8 Water / POD sources (2026)

* **https://marianaspress.com/news/article/fema-distributes-36000-bottles-of-water-in-saipan-more-sites-set** (24 Apr 2026, HSEM's Kennedy Benjamin): Airport Field Thu 23 Apr (one case per household/vehicle); Koblerville Youth Center Fri 24 Apr 9 am; Garapan Fishing Base Sat 25 Apr 9 am.
* **https://marianaspress.com/news/article/samaritans-purse-sets-up-free-water-station-for-saipan-residents-post-super-typhoon-sinlaku** (24 Apr 2026): "Sugar Dock (Bantalan) in Chalan Kanoa", free water, four free jerry cans.
* **https://marianaspress.com/news/article/kagman-is-one-of-1st-staging-areas-for-sinlaku-relief-as-fema-supplies-arrive** (18 Apr 2026): "a staging and distribution site in Kagman" for water and food rations.
* **https://www.pacificislandtimes.com/post/usace-provides-power-generators-for-response-efforts-in-guam-cnmi** (c. 20 Apr 2026): stations at Capitol Hill "along Capitol Hill Road", Chalan Kanoa (WSR), Koblerville "along Tinaktak Drive", Kagman "on Chacha Road across from Santa Soledad Church".
* https://www.islapublic.org/news/2026-05-11/saipan-water-restoration-reaches-80-cuc-reports-steady-progress, https://www.hawaiinewsnow.com/2026/04/17/..., https://storymaps.arcgis.com/stories/d74f32dca22a4db78d56470d07f16b33, https://www.marianasstrong.com/ (404), Wikipedia Sinlaku/Bavi pages - no station-level data.

### 2.9 Yutu 2018 / Soudelor 2015

* **https://cedrdigitalcorps.org/2018/10/29/archived-yutu-status-updates/** and **https://cedrdigitalcorps.org/2018/11/07/cn/**: "As of 2:00 pm today, the following 3 shelters are the only ones open and accepting displaced residents: Tanapag Middle School, Kagman Elementary School, Saipan Southern High School" (29 Oct-7 Nov 2018); "842 individuals in 14 shelters across 2 CNMI islands"; "Four long-term congregate shelters being prepared". Water: "Free Potable Drinking Water: Hrs: 6:30 am – Midnight – three 5 gallon limit/family. Free Non-potable Water: Hrs: 9:00 am – 4:00 pm – Limit: 100 gallons, except for Kloberville which is 50 gal. Stations open today: Navy Hill, Kagman, Kannat Tabla, and Koblerville." Tinian: "Maui Water Pump Station – 1:30pm – 5:30pm – 55 gal. max/family; Marpo Valley Water Station – 1:30 am – 5:00 pm; Kammer Beach – 10am – 5pm". PODs: "Kagman Fire Station, San Roque Fire Station, Koblerville Fire Station, American Memorial Park, Ada Gymnasium – 10:30 am – 3:30pm". Tenting: Saipan 323-0029, Tinian 433-1803.
* **https://reliefweb.int/report/northern-mariana-islands-united-states-america/super-typhoon-yutu-relief-recovery-update-4** (30 Oct 2018): "CUC Call Center: (670) 664-4282 / CUC Outage Hotline: (670) 236-4333 / CUC Rota: (670) 532-9411/9413 / CUC Tinian: (670) 433-9261/9264/9265"; water stations "As Matuis (Matansa Rd., Route 320) – 8AM to 2PM; Navy Hill [Isla Dr. (near Navy Hill baseball field)] – 8AM to 3PM; Capitol Hill (corner of Mt. Tapochao and Belau St.) – 9AM to 3PM; Kagman [across Kagman Market (off Kagman Rd.)] – 9AM to 3PM; Kanat Tabla (located before the rock quarry) – 9AM to 3PM; Koblerville [Tanaktak Dr. (between Hanam Market & Tottoville)] – 9AM to 3PM"; shelters "Tanapag Middle School Availability – 8 / Dandan Head Start Availability – 3 / Kagman Elementary School Availability – 45 / Kagman High School Availability – 3"; "COTA at (670) 664-2690".
* **https://www.fema.gov/press-release/20210318/super-typhoon-yutu-relief-recovery-update-3-relief-supply-distribution-sites** (27 Oct 2018): PODs Kagman, San Roque and Koblerville fire stations, American Memorial Park, Ada Gymnasium from 11 AM 28 Oct 2018.
* **https://www.saipantribune.com/index.php/yutu-updates-november-9-2018/**: "Displaced residents who are currently sheltered at Kagman Community Center and Kagman High School will be transported by COTA to the new opening of the Kagman Elementary School facility on Saturday, Nov. 10, 2018"; "The CNMI Shelter Relief Program will provide power, air conditioning, meal and water distribution daily"; 5-gallon bottle exchange at "San Antonio basketball court" 10 Nov 3 pm.
* Soudelor 2015: only the HSEM bulletin above and a Grist retrospective (distribution at Koblerville Fire Station, Garapan Fishing Base, San Roque Fire Station, Kagman Fire Station); no shelter list located.
* **https://www.postguam.com/news/cnmi/nmi-requests-emergency-declaration-preps-for-typhoon/article_d522aec2-...** (Oct 2019): blocked (429/403); search excerpt claims "Koblerville Elementary School could accommodate 46 people, Marianas High School 100, Dandan Middle School 60". Not used in the JSON except as a caveat.

### 2.10 Geocoding

Nominatim (User-Agent `NMITyphoonWatch/0.1 (dev@nmityphoonwatch.local)`, 1.2 s spacing, bounded viewboxes per island) resolved: Kagman HS, Marianas HS, Koblerville ES, Garapan ES, Manamko Center, Tanapag (Elementary) School, Kagman ES, Saipan Southern HS, Hopwood, Oleai ES, Tinian ES, Tinian Jr/Sr HS, Rota High School, Peace Park, WSR Elementary, Pau Pau Beach, Sugar Dock, American Memorial Park, Kammer Beach, Saipan International Airport, and the village nodes used as fallbacks. Overpass (overpass-api.de / lz4 / private.coffee; heavy 429/504) added Dandan Elementary, San Vicente Elementary, the Sinapalo place node and an unnamed Susupe sports centre. Two pins were decoded from Open Location Codes: Tanapag Youth Center (Red Cross list "6QR4+9RV") and Kagman Community Center ("5Q8H+RC9" from a third-party directory listing). Not found anywhere: Kagman Community Center (OSM), Tinian Head Start, Dandan Head Start, Santa Soledad Church, Koblerville Youth Center, Ada Gym (named), the Saipan fire stations other than Garapan, Tinian gym, Maui well, Marpo Valley station, Rota Office on Aging building.

## 3. Per-shelter confidence

| shelterId | Designation evidence | Coord conf. | Overall |
|---|---|---|---|
| kagman-high-school | HSEM primary (Sinlaku, Bavi, 2023); JIC counts | high | **High** |
| marianas-high-school | HSEM primary; JIC rosters incl. Unit 2 | high | **High** |
| koblerville-elementary-school | HSEM primary; JIC rosters | high | **High** |
| saipan-office-on-aging | HSEM Bulletin #2 (disability/medical shelter); Red Cross list; Sinlaku counts | medium (OSM building 'Manamko Center'; Red Cross street differs) | **High** as a designation, medium on pin and phone |
| garapan-elementary-school | JIC rosters Apr-May 2026; Bavi counts; PSS 'secondary designated' | high | **High** (secondary) |
| kagman-community-center | Governor 2023 list; JIC rosters; Tier-2 site; Bavi count | low (plus code from directory) | **High** designation / **low** pin |
| oleai-head-start | JIC rosters only (overflow) | medium | Medium |
| dandan-head-start | JIC rosters 2026 + Yutu 2018 | medium | Medium |
| tanapag-youth-center | Red Cross list 17 Apr 2026 + JIC Tier-2 prep | medium (Red Cross plus code) | Medium |
| kagman-elementary-school | PSS secondary 2026 (excerpt only) + Yutu long-term shelter | high | Medium |
| saipan-southern-high-school | Yutu 2018 only | high | Low (historical) |
| tanapag-middle-school | Yutu 2018 only | medium | Low (historical) |
| tinian-elementary-school | HSEM primary all years; JIC | high | **High** |
| tinian-middle-high-school | JIC Bavi count only | high | Medium |
| tinian-head-start | HSEM Bavi list; JIC rosters; Red Cross | low (village centre) | High designation / low pin |
| rota-office-on-aging-sinapalo | HSEM primary; JIC/RNZ counts; phone in bulletin | low (village node) | High designation / low pin |
| dr-rita-hocog-inos-jr-sr-high-school | HSEM secondary; only Rota shelter in Bavi release | high | **High** |

Excluded on purpose: Dandan Middle School (single blocked 2019 article), Koblerville Youth Center (registered-sex-offender shelter and C-POD, not a public shelter), Crowne Plaza / Finasisu Terraces / Western Lodge (non-congregate hotel sheltering, May 2026), Hopwood Middle School (destroyed by Yutu; used only as a water site), Guam shelters listed in the AKF guide.

## 4. Fields that stay null / uncertain

* **Pets**: every HSEM release 2023-2026 says no pets except certified service animals; no CNMI "pet-friendly shelter" designation was found in any 2015-2026 source (searches on HSEM, Saipan Humane Society, Saipan Cares for Animals, ASPCA/Humane World Sinlaku coverage). `petsAllowed` is therefore `false` for all 17; the one "Pets: 1" row in JIC 034 (Koblerville ES) is presumably a service animal.
* **Wheelchair/ADA**: only the Saipan Office on Aging is explicitly designated for wheelchair-bound / oxygen-dependent residents. No source describes the accessibility of the school cafeterias, so those stay `null`.
* **Generator**: no per-shelter generator information published. JIC notes CUC prioritised shelters for grid restoration and that Kagman Community Center / Tanapag Youth Center received water-pump and shower installations; the 2018 Kagman Elementary long-term shelter advertised "power, air conditioning". All `null`.
* **Capacity**: only cafeteria figures from Marianas Variety excerpts (KHS 80, MHS 100, KES 100) with an internal conflict (80/418 in a second excerpt). Everything else `null`.
* **Phones**: only the Rota Office on Aging (HSEM-published) and the Saipan Office on Aging (government directory) have numbers; schools carry none.
* **Rota water**: CUC ran a Rota water filling station after Bavi (7 Jul 2026 advisory, image only) - location unknown, so it is not in `water-points.json`. Tinian 2026: no filling-station list found (water system stayed largely online).
* **Yutu full roster**: 14-17 shelters were open in Oct-Nov 2018 but no complete list survives online; only the eight named above.
