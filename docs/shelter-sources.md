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

## Re-verification, 7 October 2026

Latest official shelter announcement found: **Super Typhoon Bavi (09W)**, 2026-07-05 (CNMI JIC releases 2–5 July 2026). No shelter announcement was found for Tropical Storm Choi-wan (October 2026). Releases:

- https://drive.google.com/file/d/1Zlu6BJ0q9cQwcQs2VDPtKB8NpjEbmdVT/view
- https://www.mvariety.com/news/local/local-news-updated-shelter-information-for-rota/article_ceca4090-96a3-41bd-bbf6-23125e9225fc.html/
- https://www.mvariety.com/news/local/local-news-rota-shelters-update/article_b7d0aefc-5be6-4678-89cd-1203c6558477.html/
- https://drive.google.com/file/d/1_RjzxNenqiyAuBahIIX58qJImy6eA1gD/view
- https://drive.google.com/file/d/1bDu4dhb-tFDLtyyq7LescX7C3wTYl3PC/view
- https://drive.google.com/file/d/1kgSrEhdHpFLS4wVemWXaBsOgcx-NkcfJ/view
- https://www.mvariety.com/news/local/super-typhoon-bavi-situational-report-9-july-28-2026---6-30-pm-chst/article_1b2d9c7e-2d96-44a7-a9de-3d61c487e2fc.html
- https://www.mvariety.com/news/local/super-typhoon-bavi-situational-report-as-of-wednesday-aug-5/article_f05095ac-ff26-4d45-8ce1-789f22b0c7f7.html

What changed in `assets/data/shelters.json` (version 2026.10.07):

- Every record now has `designation`: **current** = named in the Bavi releases (10 shelters), **past** = used only in an earlier storm (7). Directions to the "nearest shelter" only consider current shelters.
- `medicalSupport` = named in the JIC Typhoon Condition I release (5 Jul 2026, 2:15 pm) for "residents in vulnerable housing, low-lying areas, and those needing medical support or shelter assistance": Kagman Community Center (Saipan), Tinian Middle and High School, Rota Aging Office, Dr. Rita Hocog Inos Jr./Sr. High School. This replaces the earlier wheelchair-based filter, whose only match was the storm-damaged Man'amko' Center.
- `caution` on the Saipan Office on Aging (Man'amko' Center): roof and windows lost in Sinlaku, not fully reopened (Marianas Variety, 16 Jul 2026).

| Shelter | On Bavi list | Change |
|---|---|---|
| Kagman High School | yes | — |
| Koblerville Elementary School | yes | — |
| Marianas High School | yes | — |
| DCCA Kagman Community Center | yes | Landmark text adds Kagman Road / Kagman Market / fire station; marked medical support. |
| Dandan Head Start (Dandan School campus) | not-mentioned | — |
| Garapan Elementary School | yes | — |
| Kagman Elementary School | not-mentioned | — |
| Oleai Head Start | not-mentioned | Name shortened (campus location not confirmed); landmark text rewritten. |
| Saipan Office on Aging (Man'amko Center) | not-mentioned | Marked "earlier storms only" and given a damage warning; excluded from "nearest shelter" directions. |
| Saipan Southern High School | not-mentioned | — |
| Tanapag Middle School | not-mentioned | — |
| Tanapag Youth Center | not-mentioned | — |
| Magdalena M. Hofschneider Tinian Head Start | yes | Pin moved 246 m from the village centre onto the Tinian Elementary School campus (1 CMC 446). Landmark text rewritten. |
| Tinian Elementary School | yes | Design capacity set to 40 (PSS). |
| Tinian Middle School and Tinian High School | yes | — |
| Dr. Rita Hocog Inos Jr./Sr. High School | yes | Pin moved about 1.2 km, from the former Rota High School building (now DLNR offices) to the shelter campus off Pali'E Road (Red Cross plus code 44RW+733; NCES geocode 27 m away). Landmark text rewritten. |
| Sinapalo Office on Aging (Rota Aging Center) | yes | — |

Sources per shelter (re-check):

### Kagman High School

- Finding: Bavi primary shelter (opened 3 Jul 2026 3 pm). Counts: 81 (5 Jul), 69 (6 Jul), 49 (7 Jul); absent from the 13 Jul roster. At 14:15 on 5 Jul the JIC called Kagman Community Center Saipan's 'only available shelter', so the primaries were full or closed to newcomers by then. School office phone per NCES: (670) 664-3780 (not announced as a shelter line).
- Location: Shelter is the KHS cafeteria. Red Cross address 'Half Flower Street'. From the pin, OSM has Lalanghita Road 85 m, Half Flower Street 88 m and Kagman Road (NMI-34) 98 m away. Kagman Elementary School is next door.
- Coordinates: Pin is 39 m from the OSM campus centre (way 257204518, 15.16762,145.78449) and inside the polygon; NCES 2023-24 geocode 15.16769,145.78443.
- Source (2026-07-02): CNMI JIC Bavi shelter release 19:20 ChST (bit.ly/3QV7MyK): Saipan list includes 'Kagman High School'; opens 3 Jul 2026 3:00 pm. — https://drive.google.com/file/d/1Zlu6BJ0q9cQwcQs2VDPtKB8NpjEbmdVT/view
- Source (2026-07-04): CNMI JIC release 20:30 ChST, 'available shelters as of 7:00pm, July 4' (bit.ly/4gTeDmK): 'Kagman High School' among available shelters at 7 pm 4 Jul. — https://drive.google.com/file/d/1_RjzxNenqiyAuBahIIX58qJImy6eA1gD/view
- Source (2026-07-05): Marianas Variety citing JIC, counts as of 11 a.m. 5 Jul [MV live site captcha-blocked; read via web.archive.org 20260705192119]: KHS 'sheltered 81'. — https://www.mvariety.com/news/local/local-news-hundreds-evacuate-to-shelters-as-super-typhoon-bavi-nears-marianas/article_c4b8a1df-65a9-4fb3-a2cc-9fecd984cf10.html/
- Source (2026-07-06): KPRG citing JIC, counts 6 Jul (quoted in docs/shelter-sources.md; URL re-checked 200): '69 at Kagman High School'. — https://www.islapublic.org/news/2026-07-06/more-than-500-residents-take-shelter-as-bavi-pounds-the-marianas
- Source (2026-07-08): Marianas Variety: JIC shelter roster as of Tue 7 Jul + CUC power [MV live site captcha-blocked; read via web.archive.org 20260708032305]: 'Kagman High School: 49' (7 Jul). — https://www.mvariety.com/news/local/local-news-saipan-spared-worst-of-bavis-impact-as-cuc-moves-to-restore-power/article_4538c8d9-e6ee-4e16-bb02-44acd40f9c87.html/
- Source (2026-04-13): Marianas Variety (U. T. Sabuco) quoting PSS Commissioner Camacho, Sinlaku secondary shelters [MV live site captcha-blocked; read via web.archive.org 20260413054743]: KHS cafeteria 'nearing capacity with 61 evacuees out of an 80-person limit'. — https://www.mvariety.com/news/local/local-news-pss-activates-secondary-shelters-as-evacuee-numbers-rise-ahead-of-sinlaku/article_64ba73f3-8d9d-46bf-b006-37f52643c7d9.html/
- Source (2026-04-13): Marianas Variety (U. T. Sabuco), PSS shelter capacities [MV live site captcha-blocked; read via web.archive.org 20260413045255]: 'Kagman High School's cafeteria, with an 80-person capacity'. — https://www.mvariety.com/news/local/local-news-shelters-across-saipan-tinian-exceed-50-capacity-as-sinlaku-nears/article_16cff46e-7e8b-4d3b-bf27-4725f094d0f8.html/
- Source (2026-04-13): Marianas Variety (B. Manabat), Sinlaku shelters [MV live site captcha-blocked; read via web.archive.org 20260413043842]: KHS staff: 'The school's capacity is 50'. — https://www.mvariety.com/news/local/local-news-166-residents-in-shelters-as-sinlaku-approaches-marianas/article_31f79a8f-1b83-4737-a711-02c9a0558c81.html/
- Source (2026-04-17): American Red Cross open-shelter list in AKF guide (URL re-checked 200): 'Kagman High School- Half Flower Street'. — https://www.kidneyfund.org/sites/default/files/media/documents/drp-resource-guide-typhoon-sinlaku-4-17-2026.pdf
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): Kagman High School, phone (670) 664-3780. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200073

### Koblerville Elementary School

- Finding: Bavi primary shelter: 69 (5 Jul), 66 (6 Jul); closed by 7 Jul. School office phone per NCES: (670) 664-3961.
- Location: Shelter is in the cafeteria. Red Cross address 'As Gonno Road'. The pin is on Atis Street (4 m), with As Gonno Road (NMI-304) 164 m away; Saipan Southern High School adjoins.
- Coordinates: Pin is 13 m from the OSM campus centre (way 311254046, 15.11931,145.70500); NCES geocode 15.11906,145.705703 is in the same polygon.
- Source (2026-07-02): CNMI JIC Bavi shelter release 19:20 ChST (bit.ly/3QV7MyK): 'Koblerville Elementary School' on the Saipan list. — https://drive.google.com/file/d/1Zlu6BJ0q9cQwcQs2VDPtKB8NpjEbmdVT/view
- Source (2026-07-04): CNMI JIC release 20:30 ChST, 'available shelters as of 7:00pm, July 4' (bit.ly/4gTeDmK): listed available 7 pm 4 Jul. — https://drive.google.com/file/d/1_RjzxNenqiyAuBahIIX58qJImy6eA1gD/view
- Source (2026-07-05): Marianas Variety citing JIC, counts as of 11 a.m. 5 Jul [MV live site captcha-blocked; read via web.archive.org 20260705192119]: 'Koblerville Elementary School housed 69'. — https://www.mvariety.com/news/local/local-news-hundreds-evacuate-to-shelters-as-super-typhoon-bavi-nears-marianas/article_c4b8a1df-65a9-4fb3-a2cc-9fecd984cf10.html/
- Source (2026-07-06): KPRG citing JIC, counts 6 Jul (quoted in docs/shelter-sources.md; URL re-checked 200): '66 at Kobler Elementary School'. — https://www.islapublic.org/news/2026-07-06/more-than-500-residents-take-shelter-as-bavi-pounds-the-marianas
- Source (2026-07-08): Marianas Variety: JIC shelter roster as of Tue 7 Jul + CUC power [MV live site captcha-blocked; read via web.archive.org 20260708032305]: not on the 7 Jul roster. — https://www.mvariety.com/news/local/local-news-saipan-spared-worst-of-bavis-impact-as-cuc-moves-to-restore-power/article_4538c8d9-e6ee-4e16-bb02-44acd40f9c87.html/
- Source (2026-04-13): Marianas Variety (U. T. Sabuco), PSS shelter capacities [MV live site captcha-blocked; read via web.archive.org 20260413045255]: 'can accommodate up to 100 individuals'. — https://www.mvariety.com/news/local/local-news-shelters-across-saipan-tinian-exceed-50-capacity-as-sinlaku-nears/article_16cff46e-7e8b-4d3b-bf27-4725f094d0f8.html/
- Source (2026-04-13): Marianas Variety (B. Manabat), Sinlaku shelters [MV live site captcha-blocked; read via web.archive.org 20260413043842]: 'KoES can accommodate up to 418 people'. — https://www.mvariety.com/news/local/local-news-166-residents-in-shelters-as-sinlaku-approaches-marianas/article_31f79a8f-1b83-4737-a711-02c9a0558c81.html/
- Source (2026-07-27): Marianas Variety, PSS Rota schools after Bavi [MV live site captcha-blocked; read via web.archive.org 20260727051240]: some Koblerville ES buildings 'remain without power because of Sinlaku-related damage'. — https://www.mvariety.com/news/local/rota-schools-begin-recovery-after-bavi-pss-faces-new-fiscal-challenges/article_54254006-d9e5-40b2-9300-bc6eed8910d1.html
- Source (2026-04-17): American Red Cross open-shelter list in AKF guide (URL re-checked 200): 'Koblerville Elementary School- As Gonno Road'. — https://www.kidneyfund.org/sites/default/files/media/documents/drp-resource-guide-typhoon-sinlaku-4-17-2026.pdf
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): phone (670) 664-3961. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200079

### Marianas High School

- Finding: Bavi primary shelter: 145 (5 Jul), 150 (6 Jul), 86 + 29 (7 Jul); closed by 13 Jul. School office phone per NCES: (670) 664-3800.
- Location: Two units: the main cafeteria ('Marianas High School 1') and the second cafeteria ('Marianas High School 2' / 'MHS cafeteria'), 'a short distance from the primary site'. Red Cross address 'Bwaay Lane'; OSM: Dwaay Lane 31 m, Beach Road (NMI-33) 189 m.
- Coordinates: Pin equals the OSM point (node 1474820826); NCES geocode 15.161161,145.707908 is 67 m away.
- Source (2026-07-02): CNMI JIC Bavi shelter release 19:20 ChST (bit.ly/3QV7MyK): 'Marianas High School' on the Saipan list. — https://drive.google.com/file/d/1Zlu6BJ0q9cQwcQs2VDPtKB8NpjEbmdVT/view
- Source (2026-07-04): CNMI JIC release 20:30 ChST, 'available shelters as of 7:00pm, July 4' (bit.ly/4gTeDmK): 'Marianas High School 1 and 2' available 7 pm 4 Jul. — https://drive.google.com/file/d/1_RjzxNenqiyAuBahIIX58qJImy6eA1gD/view
- Source (2026-07-05): Marianas Variety citing JIC, counts as of 11 a.m. 5 Jul [MV live site captcha-blocked; read via web.archive.org 20260705192119]: 'Marianas High School sheltered 145'. — https://www.mvariety.com/news/local/local-news-hundreds-evacuate-to-shelters-as-super-typhoon-bavi-nears-marianas/article_c4b8a1df-65a9-4fb3-a2cc-9fecd984cf10.html/
- Source (2026-07-06): KPRG citing JIC, counts 6 Jul (quoted in docs/shelter-sources.md; URL re-checked 200): '150 individuals sheltered at Marianas High School'. — https://www.islapublic.org/news/2026-07-06/more-than-500-residents-take-shelter-as-bavi-pounds-the-marianas
- Source (2026-07-08): Marianas Variety: JIC shelter roster as of Tue 7 Jul + CUC power [MV live site captcha-blocked; read via web.archive.org 20260708032305]: 'Marianas High School: 86 MHS cafeteria: 29' (7 Jul). — https://www.mvariety.com/news/local/local-news-saipan-spared-worst-of-bavis-impact-as-cuc-moves-to-restore-power/article_4538c8d9-e6ee-4e16-bb02-44acd40f9c87.html/
- Source (2026-07-13): JIC Bavi Situational Report #4, shelter update as of 1600 ChST (bit.ly/4vpQWGg): MHS and MHS Cafeteria both 'Closed' (13 Jul). — https://drive.google.com/file/d/1kgSrEhdHpFLS4wVemWXaBsOgcx-NkcfJ/view
- Source (2026-04-13): Marianas Variety (U. T. Sabuco) quoting PSS Commissioner Camacho, Sinlaku secondary shelters [MV live site captcha-blocked; read via web.archive.org 20260413054743]: secondary shelter 'in its second cafeteria, a short distance from the primary site'. — https://www.mvariety.com/news/local/local-news-pss-activates-secondary-shelters-as-evacuee-numbers-rise-ahead-of-sinlaku/article_64ba73f3-8d9d-46bf-b006-37f52643c7d9.html/
- Source (2026-04-13): Marianas Variety (U. T. Sabuco), PSS shelter capacities [MV live site captcha-blocked; read via web.archive.org 20260413045255]: 'the main cafeteria, designed for 100 occupants'. — https://www.mvariety.com/news/local/local-news-shelters-across-saipan-tinian-exceed-50-capacity-as-sinlaku-nears/article_16cff46e-7e8b-4d3b-bf27-4725f094d0f8.html/
- Source (2026-04-13): Marianas Variety (B. Manabat), Sinlaku shelters [MV live site captcha-blocked; read via web.archive.org 20260413043842]: MHS 'has a capacity of 80'. — https://www.mvariety.com/news/local/local-news-166-residents-in-shelters-as-sinlaku-approaches-marianas/article_31f79a8f-1b83-4737-a711-02c9a0558c81.html/
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): phone (670) 664-3800. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200056

### DCCA Kagman Community Center

- Finding: During Bavi this was Saipan's only open shelter from 14:15 on 5 Jul, and the last Saipan shelter to close (closed by 28 Jul 2026). Its low-confidence pin is the most important coordinate gap left; it needs an official address or a ground check.
- Location: On or near Kagman Road (NMI-34) in Kagman III: the current pin is 59 m from Kagman Road, about 600 m west of Kagman High School on the same road. This matches CUC's phrase 'Kagman Road toward Kagman Market, Community Center and Fire Station'.
- Coordinates: Nominatim has no result and OSM has no community centre in Kagman. The current pin comes from a third-party plus code (5Q8H+RC9, evendo.com) and lands on an unnamed 745 m2 building (OSM way 638018498) 59 m from Kagman Road. Plausible, but no official address confirms it.
- Source (2026-07-05): CNMI JIC Typhoon Condition I release 14:15 ChST (bit.ly/3R0jqbv): 'Saipan: The only available shelter at this time is the Kagman Community Center.' — https://drive.google.com/file/d/1bDu4dhb-tFDLtyyq7LescX7C3wTYl3PC/view
- Source (2026-07-06): KPRG citing JIC, counts 6 Jul (quoted in docs/shelter-sources.md; URL re-checked 200): '33 at Kagman Community Center'. — https://www.islapublic.org/news/2026-07-06/more-than-500-residents-take-shelter-as-bavi-pounds-the-marianas
- Source (2026-07-08): Marianas Variety: JIC shelter roster as of Tue 7 Jul + CUC power [MV live site captcha-blocked; read via web.archive.org 20260708032305]: 'Kagman Community Center: 19' (7 Jul). — https://www.mvariety.com/news/local/local-news-saipan-spared-worst-of-bavis-impact-as-cuc-moves-to-restore-power/article_4538c8d9-e6ee-4e16-bb02-44acd40f9c87.html/
- Source (2026-07-13): JIC Bavi Situational Report #4, shelter update as of 1600 ChST (bit.ly/4vpQWGg): Kagman Community Center 31 (13 Jul). — https://drive.google.com/file/d/1kgSrEhdHpFLS4wVemWXaBsOgcx-NkcfJ/view
- Source (2026-07-15): JIC SitRep #5 via Marianas Variety [MV live site captcha-blocked; read via web.archive.org 20260716091102]: 'Saipan (Kagman Community Center): 21 occupants'. — https://www.mvariety.com/news/local/super-typhoon-bavi-situational-report-5-july-15-2026-5-30-pm-chst/article_9f536925-3b4b-4d2d-adeb-202dfeae79ba.html
- Source (2026-07-17): JIC SitRep via Marianas Variety [MV live site captcha-blocked; read via web.archive.org 20260718061507]: 'Saipan - Kagman Community Center (22)'. — https://www.mvariety.com/news/local/super-typhoon-bavi-situational-report-july-17-2026-7-30-pm-chst/article_ac249fcf-5f5d-42b8-9a28-f408a389cd95.html
- Source (2026-07-21): JIC SitRep #7 via Marianas Variety [MV live site captcha-blocked; read via web.archive.org 20260722073516]: 'Saipan (Kagman): 18 occupants'. — https://www.mvariety.com/news/local/super-typhoon-bavi-situational-report-7-july-21-2026---7-00-pm-chst/article_843bbe8f-6d72-47f6-a217-5f83490c62a0.html
- Source (2026-07-24): JIC SitRep #8 via Marianas Variety [MV live site captcha-blocked; read via web.archive.org 20260724164949]: 'Saipan: 15'. — https://www.mvariety.com/news/local/super-typhoon-bavi-situational-report-8-july-24-6-30-pm-chst/article_514ddecb-9aa4-471b-b1f5-c79149de7936.html
- Source (2026-07-28): JIC SitRep #9 via Marianas Variety [MV live site captcha-blocked; read via web.archive.org 20260728202837]: 'All shelters on Saipan are closed.' — https://www.mvariety.com/news/local/super-typhoon-bavi-situational-report-9-july-28-2026---6-30-pm-chst/article_1b2d9c7e-2d96-44a7-a9de-3d61c487e2fc.html
- Source (2026-07-16): Marianas Variety, Office on Aging worker Cynthia Attao [MV live site captcha-blocked; read via web.archive.org 20260716004620]: Attao 'currently assists at the Kagman Community Center shelter'. — https://www.mvariety.com/news/local/elderly-disabled-residents-need-more-help-after-sinlaku-bavi-attao-says/article_55e8973b-5fe7-42b8-8ad4-c45535df79c1.html
- Source (2026-06-26): Governor's Typhoon Recovery page, JIC Update 049, CUC Feeder 4: 'Kagman Road toward Kagman Market, Community Center and Fire Station'. — https://governor.cnmi.gov/typhoon-recovery/
- Source (2026-05-04): JIC Update 024 (verbatim in docs/shelter-sources.md; URL re-checked 200): KCC is the Tier-2 long-term shelter (Sinlaku). — https://governor.cnmi.gov/wp-content/uploads/2026/05/May-4-SITREP-CNMI-JIC.pdf
- Source (2026-10-07): Nominatim: no result for 'Kagman Community Center' — https://nominatim.openstreetmap.org/search?format=jsonv2&q=Kagman+Community+Center

### Dandan Head Start (Dandan School campus)

- Finding: Used only during Sinlaku (26 Apr-8 May 2026). Not in any Bavi or Choi-wan announcement. Head Start phone per NCES: (670) 288-8820.
- Location: The campus now holds Dandan Middle School and Dandan Head Start/Early Head Start. NCES 2023-24 lists no Dandan Elementary, and the JIC 13 Jul 2026 PSS list names 'Dandan Middle School'; OSM still labels the campus 'Dandan Elementary School'. Use 'Dandan Middle School / Head Start campus, off Dandan Road (NMI-305, ~100 m)' in the landmark hint.
- Coordinates: Pin (OSM way 638072014 centre) is inside the campus polygon; the NCES geocode for Dandan Head Start (15.138078,145.733237) is 61 m away in the same polygon.
- Source (2026-04-26): JIC Update 013 (verbatim in docs/shelter-sources.md; URL re-checked 200): 'Dandan Head Start' on the Saipan shelter list. — https://governor.cnmi.gov/wp-content/uploads/2026/05/Apr-26-SITREP-CNMI-JIC.pdf
- Source (2026-05-04): JIC Update 024 (verbatim in docs/shelter-sources.md; URL re-checked 200): 'three (3) transfers from Dandan School' to KCC. — https://governor.cnmi.gov/wp-content/uploads/2026/05/May-4-SITREP-CNMI-JIC.pdf
- Source (2026-07-13): JIC Bavi Situational Report #4, shelter update as of 1600 ChST (bit.ly/4vpQWGg): PSS list names 'Dandan Middle School'. — https://drive.google.com/file/d/1kgSrEhdHpFLS4wVemWXaBsOgcx-NkcfJ/view
- Source (2026-10-07): NCES EDGE school geocodes 2023-24: Dandan Head Start 15.138078,145.733237; Dandan Middle School 15.137171,145.733593; no Dandan Elementary listed. — https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_GEOCODE_PUBLICSCH_2324/MapServer/0/query?where=STATE%3D%27MP%27&outFields=*&returnGeometry=false&f=json
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): Dandan Head Start, phone (670) 288-8820. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200057
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): Dandan Middle School, phone (670) 664-5025. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200071

### Garapan Elementary School

- Finding: Not on the 2-3 Jul opening list; it appears as overflow on the 4 Jul 7 pm list. Absent from the 13 Jul roster. School office phone per NCES: (670) 664-3955.
- Location: Described as a PSS 'secondary designated shelter site' (MV 5 Jul 2026).
- Coordinates: Pin is 2 m from the OSM campus centre (way 251355141); the NCES geocode is in the same polygon.
- Source (2026-07-04): CNMI JIC release 20:30 ChST, 'available shelters as of 7:00pm, July 4' (bit.ly/4gTeDmK): 'Garapan Elementary School' available 7 pm 4 Jul. — https://drive.google.com/file/d/1_RjzxNenqiyAuBahIIX58qJImy6eA1gD/view
- Source (2026-07-05): Marianas Variety citing JIC, counts as of 11 a.m. 5 Jul [MV live site captcha-blocked; read via web.archive.org 20260705192119]: 'Garapan Elementary School, a secondary designated shelter site, received 77 shelterees'. — https://www.mvariety.com/news/local/local-news-hundreds-evacuate-to-shelters-as-super-typhoon-bavi-nears-marianas/article_c4b8a1df-65a9-4fb3-a2cc-9fecd984cf10.html/
- Source (2026-07-06): KPRG citing JIC, counts 6 Jul (quoted in docs/shelter-sources.md; URL re-checked 200): '84 at Garapan Elementary School'. — https://www.islapublic.org/news/2026-07-06/more-than-500-residents-take-shelter-as-bavi-pounds-the-marianas
- Source (2026-07-08): Marianas Variety: JIC shelter roster as of Tue 7 Jul + CUC power [MV live site captcha-blocked; read via web.archive.org 20260708032305]: 'Garapan Elementary School: 52' (7 Jul). — https://www.mvariety.com/news/local/local-news-saipan-spared-worst-of-bavis-impact-as-cuc-moves-to-restore-power/article_4538c8d9-e6ee-4e16-bb02-44acd40f9c87.html/
- Source (2026-05-13): JIC Update 034 (verbatim in docs/shelter-sources.md; URL re-checked 200): Garapan ES 11 clients (Sinlaku). — https://governor.cnmi.gov/wp-content/uploads/2026/05/May-13-SITREP-CNMI-JIC.pdf
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): phone (670) 664-3955. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200058

### Kagman Elementary School

- Finding: Not in any Bavi or Choi-wan announcement. Building condition after Sinlaku is unverified. School office phone per NCES: (670) 664-3911.
- Location: Sinlaku secondary shelter 'supporting the nearby Kagman High School cafeteria'. From the pin: Forbidden Island Road 119 m, Kagman Road 148 m.
- Coordinates: Pin equals OSM node 1474821633 ('Kagaman elementary School'); the NCES geocode is 30 m away, inside the same campus polygon (way 257204517).
- Source (2026-04-13): Marianas Variety (U. T. Sabuco) quoting PSS Commissioner Camacho, Sinlaku secondary shelters [MV live site captcha-blocked; read via web.archive.org 20260413054743]: 'Kagman Elementary School has been designated as a secondary shelter' (13 Apr 2026). — https://www.mvariety.com/news/local/local-news-pss-activates-secondary-shelters-as-evacuee-numbers-rise-ahead-of-sinlaku/article_64ba73f3-8d9d-46bf-b006-37f52643c7d9.html/
- Source (2026-07-13): JIC Bavi Situational Report #4, shelter update as of 1600 ChST (bit.ly/4vpQWGg): KES summer-school start 'still pending'. — https://drive.google.com/file/d/1kgSrEhdHpFLS4wVemWXaBsOgcx-NkcfJ/view
- Source (2026-07-27): Marianas Variety, PSS Rota schools after Bavi [MV live site captcha-blocked; read via web.archive.org 20260727051240]: some KES buildings 'remain without power because of Sinlaku-related damage'. — https://www.mvariety.com/news/local/rota-schools-begin-recovery-after-bavi-pss-faces-new-fiscal-challenges/article_54254006-d9e5-40b2-9300-bc6eed8910d1.html
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): phone (670) 664-3911. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200081

### Oleai Head Start

- Finding: Used only during Sinlaku. Drop the '(Oleai Elementary School campus)' qualifier until the location is verified. Head Start phone per NCES: (670) 234-5692.
- Location: NCES 2023-24 places Oleai Head Start at 15.164396,145.712353, on a separate building beside Oleai Street just outside the NW corner of the Oleai Elementary School grounds. The JIC used both 'Oleai Head Start' (26 Apr-8 May) and 'Oleai Elementary School' (13 May), so 'on the OES campus' is unverified.
- Coordinates: Nominatim has no result. The current pin is the Oleai ES campus centre (OSM way 345114873). The NCES point lands 3 m from unnamed OSM building way 345114872, 151 m from the pin; plausible but unconfirmed.
- Source (2026-04-26): JIC Update 013 (verbatim in docs/shelter-sources.md; URL re-checked 200): 'Oleai Head Start' on the Saipan list. — https://governor.cnmi.gov/wp-content/uploads/2026/05/Apr-26-SITREP-CNMI-JIC.pdf
- Source (2026-05-13): JIC Update 034 (verbatim in docs/shelter-sources.md; URL re-checked 200): 'Oleai Elementary School' 15 clients. — https://governor.cnmi.gov/wp-content/uploads/2026/05/May-13-SITREP-CNMI-JIC.pdf
- Source (2026-10-07): NCES EDGE school geocodes 2023-24: Oleai Head Start 15.164396,145.712353; Oleai ES 15.163681,145.713434. — https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_GEOCODE_PUBLICSCH_2324/MapServer/0/query?where=STATE%3D%27MP%27&outFields=*&returnGeometry=false&f=json
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): Oleai Head Start, phone (670) 234-5692. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200059
- Source (2026-10-07): Nominatim: no result for 'Oleai Head Start, Saipan' — https://nominatim.openstreetmap.org/search?format=jsonv2&q=Oleai+Head+Start,+Saipan

### Saipan Office on Aging (Man'amko Center)

- Finding: SAFETY FLAG: the building lost its roof in Sinlaku and had not fully reopened as of 16 Jul 2026. It is not named in any Bavi or Choi-wan release; during Bavi the JIC sent residents needing medical support to Kagman Community Center. Do not show it as an open wheelchair/oxygen shelter without fresh confirmation. (670) 233-1321 is the Office on Aging main line, not a shelter hotline.
- Location: 'the Manamko' Center in Garapan' (MV 16 Jul 2026); OSM building 'Manamko Center' on Husga Avenue (34 m); Red Cross address 'Kopa Di Oru St'.
- Coordinates: Pin is inside the OSM building 'Manamko Center' (way 469267321).
- Source (2026-04-12): HSEM Sinlaku Bulletin #2 (verbatim in docs/shelter-sources.md; URL re-checked 200): Office on Aging open for persons with disabilities and medical needs (wheelchair, oxygen). — https://governor.cnmi.gov/wp-content/uploads/2026/04/Typhoon-Sinlaku-Bulletin-2-Press-Release.pdf
- Source (2026-04-13): Marianas Variety (B. Manabat), Sinlaku shelters [MV live site captcha-blocked; read via web.archive.org 20260413043842]: 23 sheltering at the Manamko' Center; Director's 'primarily for ...' statement. — https://www.mvariety.com/news/local/local-news-166-residents-in-shelters-as-sinlaku-approaches-marianas/article_31f79a8f-1b83-4737-a711-02c9a0558c81.html/
- Source (2026-07-16): Marianas Variety, Office on Aging worker Cynthia Attao [MV live site captcha-blocked; read via web.archive.org 20260716004620]: 'the Manamko' Center in Garapan sustained significant damage during Sinlaku. "The roof flew away, and the windows were broken" ... has not fully reopened. After Sinlaku, several elderly residents were relocated to other shelters.' — https://www.mvariety.com/news/local/elderly-disabled-residents-need-more-help-after-sinlaku-bavi-attao-says/article_55e8973b-5fe7-42b8-8ad4-c45535df79c1.html
- Source (2026-10-07): CNMI Aging and Disability Resource Center, service providers: Office on Aging (670) 233-1321. — https://cnmiadrc.org/service-providers/
- Source (2026-04-17): American Red Cross open-shelter list in AKF guide (URL re-checked 200): 'ManAmko Center Office on Aging- Kopa Di Oru St'. — https://www.kidneyfund.org/sites/default/files/media/documents/drp-resource-guide-typhoon-sinlaku-4-17-2026.pdf

### Saipan Southern High School

- Finding: No 2026 shelter use found (Yutu 2018 only). School office phone per NCES: (670) 664-4002.
- Coordinates: Pin is 2 m from the OSM campus centre (way 398670856); the NCES geocode is in the same polygon.
- Source (2026-07-13): JIC Bavi Situational Report #4, shelter update as of 1600 ChST (bit.ly/4vpQWGg): SSHS among PSS schools resuming summer classes 14 Jul 2026. — https://drive.google.com/file/d/1kgSrEhdHpFLS4wVemWXaBsOgcx-NkcfJ/view
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): phone (670) 664-4002. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200078

### Tanapag Middle School

- Finding: No 2026 shelter use found. School office phone per NCES: (670) 664-3425.
- Location: OSM labels the point 'Tanapag Elementary School'; NCES 2023-24 'Tanapag Middle School' is 38 m away. Chalan Pale Arnold (NMI-30) is 69 m away, and Tanapag Head Start (NCES 15.241887,145.758547) adjoins.
- Coordinates: OSM node 1474820318; NCES geocode 15.241177,145.75841 is 38 m away.
- Source (2026-07-13): JIC Bavi Situational Report #4, shelter update as of 1600 ChST (bit.ly/4vpQWGg): Tanapag Middle School among PSS schools resuming summer classes 14 Jul. — https://drive.google.com/file/d/1kgSrEhdHpFLS4wVemWXaBsOgcx-NkcfJ/view
- Source (2026-07-27): Marianas Variety, PSS Rota schools after Bavi [MV live site captcha-blocked; read via web.archive.org 20260727051240]: some Tanapag MS buildings 'remain without power because of Sinlaku-related damage'. — https://www.mvariety.com/news/local/rota-schools-begin-recovery-after-bavi-pss-faces-new-fiscal-challenges/article_54254006-d9e5-40b2-9300-bc6eed8910d1.html
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): phone (670) 664-3425. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200062

### Tanapag Youth Center

- Finding: Used only during Sinlaku. Not in any Bavi or Choi-wan announcement.
- Location: The pin (Red Cross plus code 6QR4+9RV) is 36 m from the street OSM names 'Ssg Wilgene Leito' and 84 m from Chalan Pale Arnold (NMI-30), next to Tanapag Middle School.
- Coordinates: Nominatim has no result. Keep the Red Cross plus code 6QR4+9RV (decodes to 15.240987,145.757047).
- Source (2026-04-17): American Red Cross open-shelter list in AKF guide (URL re-checked 200): 'Tanapag Youth Center- 6QR4+9RV, Tanapag ... (Open 24 Hours)'. — https://www.kidneyfund.org/sites/default/files/media/documents/drp-resource-guide-typhoon-sinlaku-4-17-2026.pdf
- Source (2026-05-04): JIC Update 024 (verbatim in docs/shelter-sources.md; URL re-checked 200): 'Preparations at Tanapag Youth Center continue, focusing on water pump and shower installation.' — https://governor.cnmi.gov/wp-content/uploads/2026/05/May-4-SITREP-CNMI-JIC.pdf
- Source (2026-10-07): Nominatim: no result for 'Tanapag Youth Center' — https://nominatim.openstreetmap.org/search?format=jsonv2&q=Tanapag+Youth+Center

### Magdalena M. Hofschneider Tinian Head Start

- Finding: Bavi: on the 2-3 Jul lists, then dropped (7 pm 4 Jul: Tinian ES only; 5 Jul: Tinian Middle and High School). Center phone per NCES: (670) 433-9253.
- Location: On the Tinian Elementary School campus grounds, San Jose ('a new facility was constructed on the campus grounds of the Tinian Elementary School', 1 CMC 446 findings). Official name: 'Magdalena M. Hofschneider Tinian Head Start/Early Head Start Center'.
- Coordinates: 1 CMC 446 puts the center on the Tinian ES campus; the corrected pin is the OSM Tinian Elementary School campus centre (way 1069009131). NCES 2023-24 geocodes Tinian Head Start to the same point as Tinian ES. The old pin (14.9707,145.6255, village centre) is 246 m away and outside the campus. Campus-level confidence only: the building itself is not mapped.
- Source (2026-07-02): CNMI JIC Bavi shelter release 19:20 ChST (bit.ly/3QV7MyK): 'Tinian Head Start' on the Tinian list. — https://drive.google.com/file/d/1Zlu6BJ0q9cQwcQs2VDPtKB8NpjEbmdVT/view
- Source (2026-07-03): CNMI JIC graphic 11:15 ChST 'UPDATED: Shelter Information for Rota' (image updatedshelterinfo.webp) [MV live site captcha-blocked; read via web.archive.org 20260704091310]: 'Tinian Head Start' listed again. — https://www.mvariety.com/news/local/local-news-updated-shelter-information-for-rota/article_ceca4090-96a3-41bd-bbf6-23125e9225fc.html/
- Source (2026-07-04): CNMI JIC release 20:30 ChST, 'available shelters as of 7:00pm, July 4' (bit.ly/4gTeDmK): not on the 7 pm 4 Jul list (Tinian ES only). — https://drive.google.com/file/d/1_RjzxNenqiyAuBahIIX58qJImy6eA1gD/view
- Source (2026-04-26): JIC Update 013 (verbatim in docs/shelter-sources.md; URL re-checked 200): 'Magdalena M. Hofschneider, Tinian Head Start'. — https://governor.cnmi.gov/wp-content/uploads/2026/05/Apr-26-SITREP-CNMI-JIC.pdf
- Source (2022-06-30): 1 CMC 446 / PL 22-20 (codified PDF dated 21 Jul 2023): Head Start facility 'constructed on the campus grounds of the Tinian Elementary School'. — https://cnmilaw.gov/legacy/pdf/cmc_section/T1/446.pdf
- Source (2026-10-07): NCES EDGE school geocodes 2023-24: Tinian Head Start and Tinian ES both geocoded to 14.971901,145.624291. — https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_GEOCODE_PUBLICSCH_2324/MapServer/0/query?where=STATE%3D%27MP%27&outFields=*&returnGeometry=false&f=json
- Source (2026-10-07): PSS Head Start/Early Head Start page: 'Magdalena M Hofschneider Head Start Center, Tinian'; Tinian office (670) 287-9934. — https://www.cnmipss.org/head-startearly-head-start
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): Tinian Head Start, phone (670) 433-9253. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200076
- Source (2026-10-07): Nominatim: no result for 'Tinian Head Start' — https://nominatim.openstreetmap.org/search?format=jsonv2&q=Tinian+Head+Start

### Tinian Elementary School

- Finding: Bavi counts: 58 (5 Jul), 61 including Tinian MS/HS (6 Jul), 23 (7 Jul), 16 (13 Jul), 11 (17 Jul); closed by 21 Jul. School office phone per NCES: (670) 433-9251.
- Location: Shelter is in the cafeteria. The school 'sits on over five hectares of land in the heart of San Jose Village ... surrounded by the San Jose Church, the public library, a health clinic, a police and fire department, post office' (PSS). OSM: Canal Street (NMI-202) 120 m, 2nd Avenue (NMI-201) 203 m. Tinian Head Start shares the campus.
- Coordinates: Pin is 14 m from the OSM campus centre (way 1069009131).
- Source (2026-07-02): CNMI JIC Bavi shelter release 19:20 ChST (bit.ly/3QV7MyK): 'Tinian Elementary School' on the Tinian list. — https://drive.google.com/file/d/1Zlu6BJ0q9cQwcQs2VDPtKB8NpjEbmdVT/view
- Source (2026-07-04): CNMI JIC release 20:30 ChST, 'available shelters as of 7:00pm, July 4' (bit.ly/4gTeDmK): the only Tinian shelter listed at 7 pm 4 Jul. — https://drive.google.com/file/d/1_RjzxNenqiyAuBahIIX58qJImy6eA1gD/view
- Source (2026-07-05): Marianas Variety citing JIC, counts as of 11 a.m. 5 Jul [MV live site captcha-blocked; read via web.archive.org 20260705192119]: '58 individuals sought refuge at Tinian Elementary School'. — https://www.mvariety.com/news/local/local-news-hundreds-evacuate-to-shelters-as-super-typhoon-bavi-nears-marianas/article_c4b8a1df-65a9-4fb3-a2cc-9fecd984cf10.html/
- Source (2026-07-08): Marianas Variety: JIC shelter roster as of Tue 7 Jul + CUC power [MV live site captcha-blocked; read via web.archive.org 20260708032305]: 'Tinian Elementary School: 23'; power restored to 'Tinian Elementary School shelter'. — https://www.mvariety.com/news/local/local-news-saipan-spared-worst-of-bavis-impact-as-cuc-moves-to-restore-power/article_4538c8d9-e6ee-4e16-bb02-44acd40f9c87.html/
- Source (2026-07-13): JIC Bavi Situational Report #4, shelter update as of 1600 ChST (bit.ly/4vpQWGg): Tinian Elementary School 16. — https://drive.google.com/file/d/1kgSrEhdHpFLS4wVemWXaBsOgcx-NkcfJ/view
- Source (2026-07-21): JIC SitRep #7 via Marianas Variety [MV live site captcha-blocked; read via web.archive.org 20260722073516]: 'Tinian: Closed' (21 Jul). — https://www.mvariety.com/news/local/super-typhoon-bavi-situational-report-7-july-21-2026---7-00-pm-chst/article_843bbe8f-6d72-47f6-a217-5f83490c62a0.html
- Source (2026-04-13): Marianas Variety (U. T. Sabuco) quoting PSS Commissioner Camacho, Sinlaku secondary shelters [MV live site captcha-blocked; read via web.archive.org 20260413054743]: 'exceeded its 40-person capacity, with 42 shelterees'. — https://www.mvariety.com/news/local/local-news-pss-activates-secondary-shelters-as-evacuee-numbers-rise-ahead-of-sinlaku/article_64ba73f3-8d9d-46bf-b006-37f52643c7d9.html/
- Source (2026-10-07): PSS Tinian Elementary page: location description quoted in locationDetail. — https://www.cnmipss.org/tinian-elementary-school-0
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): phone (670) 433-9251. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200077

### Tinian Middle School and Tinian High School

- Finding: Used for Bavi from 5 Jul; absent from the 7 Jul roster. School office phone per NCES: (670) 237-3818.
- Location: The Sinlaku overflow was 'Tinian High School's cafeteria' (PSS, MV 13 Apr 2026). NCES physical address 'Canal St. San Jose'; OSM: Cemetery Road 231 m. The JIC calls it 'Tinian Middle and High School'.
- Coordinates: Pin is 14 m from the OSM campus centre (way 257200042); the NCES geocode is in the same polygon.
- Source (2026-07-05): CNMI JIC Typhoon Condition I release 14:15 ChST (bit.ly/3R0jqbv): 'Tinian: Residents are advised to shelter at Tinian Middle and High School.' — https://drive.google.com/file/d/1bDu4dhb-tFDLtyyq7LescX7C3wTYl3PC/view
- Source (2026-07-06): KPRG citing JIC, counts 6 Jul (quoted in docs/shelter-sources.md; URL re-checked 200): '61 residents took shelter at Tinian Elementary School and Tinian Middle/High School'. — https://www.islapublic.org/news/2026-07-06/more-than-500-residents-take-shelter-as-bavi-pounds-the-marianas
- Source (2026-04-13): Marianas Variety (U. T. Sabuco) quoting PSS Commissioner Camacho, Sinlaku secondary shelters [MV live site captcha-blocked; read via web.archive.org 20260413054743]: 'Tinian High School's cafeteria has been designated as a secondary shelter'. — https://www.mvariety.com/news/local/local-news-pss-activates-secondary-shelters-as-evacuee-numbers-rise-ahead-of-sinlaku/article_64ba73f3-8d9d-46bf-b006-37f52643c7d9.html/
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): physical 'Canal St. San Jose', phone (670) 237-3818. — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200065

### Dr. Rita Hocog Inos Jr./Sr. High School

- Finding: SAFETY: the current pin sends people about 1.2 km to the wrong building. Bavi counts: 25 (6 Jul), 13 (7 Jul), 22 (13 Jul), 26 (17 Jul); closed by 5 Aug 2026. School office phone per NCES: (670) 532-9502.
- Location: Shelter is the cafeteria; 'Building D houses showers, bathrooms and other facilities supporting shelter operations'. The campus is 'Songsong Village area, District 4' (Rota Mayor), the former Rota Junior High campus off Pali'E Road (NMI-100, 90 m). It is NOT the former Rota High School building on the San Francisco de Borja Highway, which is now the DLNR office building.
- Coordinates: Red Cross address '44RW 733, Songsong' read as plus code 7R6744RW+733 decodes to 14.140637,145.145172; the NCES 2023-24 geocode (14.140873,145.14524) is 27 m away. The old pin (14.13504,145.13593) is OSM way 236360243, tagged 'Formerly Rota High School. Now occupied by CNMI Government Agencies'; OPM lists that building as the 'DLNR Office Building (Former Rota High School)'. The new pin is 46 m from GNIS node 358021584 'Rota Elementary School', the old elementary/junior-high campus.
- Source (2026-07-02): CNMI JIC Bavi shelter release 19:20 ChST (bit.ly/3QV7MyK): 'Dr. Rita Hocog Inos Jr./Sr. High School' is the Rota shelter. — https://drive.google.com/file/d/1Zlu6BJ0q9cQwcQs2VDPtKB8NpjEbmdVT/view
- Source (2026-07-04): Office of the Mayor of Rota notice 'ROTA SHELTERS: UPDATE' (image rotashelters.webp) [MV live site captcha-blocked; read via web.archive.org 20260705031752]: 'DR. RITA H. INOS JR. SR. HIGHSCHOOL, SONGSONG VILLAGE AREA, DISTRICT 4', open 3:00 pm 4 Jul. — https://www.mvariety.com/news/local/local-news-rota-shelters-update/article_b7d0aefc-5be6-4678-89cd-1203c6558477.html/
- Source (2026-07-04): CNMI JIC release 20:30 ChST, 'available shelters as of 7:00pm, July 4' (bit.ly/4gTeDmK): listed available 7 pm 4 Jul. — https://drive.google.com/file/d/1_RjzxNenqiyAuBahIIX58qJImy6eA1gD/view
- Source (2026-07-05): CNMI JIC Typhoon Condition I release 14:15 ChST (bit.ly/3R0jqbv): 'remain open for residents'. — https://drive.google.com/file/d/1bDu4dhb-tFDLtyyq7LescX7C3wTYl3PC/view
- Source (2026-07-08): Marianas Variety: JIC shelter roster as of Tue 7 Jul + CUC power [MV live site captcha-blocked; read via web.archive.org 20260708032305]: 'Rita H. Inos Jr.-Sr. High School-Rota: 13'. — https://www.mvariety.com/news/local/local-news-saipan-spared-worst-of-bavis-impact-as-cuc-moves-to-restore-power/article_4538c8d9-e6ee-4e16-bb02-44acd40f9c87.html/
- Source (2026-07-13): JIC Bavi Situational Report #4, shelter update as of 1600 ChST (bit.ly/4vpQWGg): 22 occupants (13 Jul). — https://drive.google.com/file/d/1kgSrEhdHpFLS4wVemWXaBsOgcx-NkcfJ/view
- Source (2026-08-05): JIC SitRep via Marianas Variety [MV live site captcha-blocked; read via web.archive.org 20260806104931]: 'Dr. Rita Hocog Inos Jr./Sr. High School and the Rota Aging Center are closed.' — https://www.mvariety.com/news/local/super-typhoon-bavi-situational-report-as-of-wednesday-aug-5/article_f05095ac-ff26-4d45-8ce1-789f22b0c7f7.html
- Source (2026-07-27): Marianas Variety, PSS Rota schools after Bavi [MV live site captcha-blocked; read via web.archive.org 20260727051240]: cafeteria is the shelter; Building D; FEMA restored power. — https://www.mvariety.com/news/local/rota-schools-begin-recovery-after-bavi-pss-faces-new-fiscal-challenges/article_54254006-d9e5-40b2-9300-bc6eed8910d1.html
- Source (2026-04-17): American Red Cross open-shelter list in AKF guide (URL re-checked 200): 'Dr Rita Hocog Inos Jr Sr High School- 44RW 733, Songsong'. — https://www.kidneyfund.org/sites/default/files/media/documents/drp-resource-guide-typhoon-sinlaku-4-17-2026.pdf
- Source (2026-10-07): NCES EDGE school geocodes 2023-24: RHI geocode 14.140873,145.14524. — https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_GEOCODE_PUBLICSCH_2324/MapServer/0/query?where=STATE%3D%27MP%27&outFields=*&returnGeometry=false&f=json
- Source (2026-10-07): CNMI Office of Personnel Management office list: 'Department of Lands & Natural Resources Office Building (Former Rota High School) District #4, Songsong Village'. — https://opm.cnmi.gov/
- Source (2026-09-29): Wikipedia 'Rota' (rev. 2026-09-29; passage marked [citation needed]; corroborative only): 'RHIJSHS is located on the former junior high school campus in Songsong Village'. — https://en.wikipedia.org/wiki/Rota,_Northern_Mariana_Islands
- Source (2026-10-07): OpenStreetMap via Overpass API (2026-10-07): way 236360243 operator tag 'Formerly Rota High School. Now occupied by CNMI Government Agencies'. — https://www.openstreetmap.org/
- Source (2026-10-07): NCES CCD school detail (2025-2026 data): phone (670) 532-9502; physical address given as 'Sinapalo' (conflicts with every other source). — https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=690000200060

### Sinapalo Office on Aging (Rota Aging Center)

- Finding: Releases use several names: 'Rota Office of Aging', 'Office on Aging Center', 'Aging Office', 'DCCA Rota Aging', 'Rota Aging Center'. Bavi counts: 29 (6 Jul), 35 (7 Jul), 72 (13 Jul), 67 (17 Jul); closed by 5 Aug 2026. Rota transport: Mayor (670) 532-9451/2, COTA (670) 236-2682.
- Location: 'OFFICE ON AGING CENTER - ROTA, SINAPALO I AREA' (Office of the Mayor of Rota, 4 Jul 2026).
- Coordinates: Nominatim has no result, and OSM has no Office on Aging feature in Sinapalo. Keep the Sinapalo place node; the source says 'Sinapalo I area'.
- Source (2026-07-03): CNMI JIC graphic 11:15 ChST 'UPDATED: Shelter Information for Rota' (image updatedshelterinfo.webp) [MV live site captcha-blocked; read via web.archive.org 20260704091310]: 'Rota Office of Aging' opens at Typhoon Condition II. — https://www.mvariety.com/news/local/local-news-updated-shelter-information-for-rota/article_ceca4090-96a3-41bd-bbf6-23125e9225fc.html/
- Source (2026-07-04): Office of the Mayor of Rota notice 'ROTA SHELTERS: UPDATE' (image rotashelters.webp) [MV live site captcha-blocked; read via web.archive.org 20260705031752]: 'OFFICE ON AGING CENTER - ROTA, SINAPALO I AREA'; 'OFFICE ON AGING CENTER - ROTA (670)532-2656'. — https://www.mvariety.com/news/local/local-news-rota-shelters-update/article_b7d0aefc-5be6-4678-89cd-1203c6558477.html/
- Source (2026-07-04): CNMI JIC release 20:30 ChST, 'available shelters as of 7:00pm, July 4' (bit.ly/4gTeDmK): 'Office on Aging Center'; Rota transport lines include (670) 532-2656. — https://drive.google.com/file/d/1_RjzxNenqiyAuBahIIX58qJImy6eA1gD/view
- Source (2026-07-05): CNMI JIC Typhoon Condition I release 14:15 ChST (bit.ly/3R0jqbv): 'The Aging Office ... remain open'. — https://drive.google.com/file/d/1bDu4dhb-tFDLtyyq7LescX7C3wTYl3PC/view
- Source (2026-07-08): Marianas Variety: JIC shelter roster as of Tue 7 Jul + CUC power [MV live site captcha-blocked; read via web.archive.org 20260708032305]: 'DCCA Rota Aging: 35'. — https://www.mvariety.com/news/local/local-news-saipan-spared-worst-of-bavis-impact-as-cuc-moves-to-restore-power/article_4538c8d9-e6ee-4e16-bb02-44acd40f9c87.html/
- Source (2026-07-13): JIC Bavi Situational Report #4, shelter update as of 1600 ChST (bit.ly/4vpQWGg): Rota Aging Center 72 (13 Jul). — https://drive.google.com/file/d/1kgSrEhdHpFLS4wVemWXaBsOgcx-NkcfJ/view
- Source (2026-08-05): JIC SitRep via Marianas Variety [MV live site captcha-blocked; read via web.archive.org 20260806104931]: Rota Aging Center closed. — https://www.mvariety.com/news/local/super-typhoon-bavi-situational-report-as-of-wednesday-aug-5/article_f05095ac-ff26-4d45-8ce1-789f22b0c7f7.html
- Source (2026-04-12): HSEM Sinlaku Bulletin #2 (verbatim in docs/shelter-sources.md; URL re-checked 200): Sinlaku primary Rota shelter; inquiries (670) 532-2656. — https://governor.cnmi.gov/wp-content/uploads/2026/04/Typhoon-Sinlaku-Bulletin-2-Press-Release.pdf
- Source (2026-10-07): Nominatim: no result for 'Office on Aging, Rota' — https://nominatim.openstreetmap.org/search?format=jsonv2&q=Office+on+Aging,+Rota

Not added (not walk-in public shelters): the Koblerville Youth Center (designated only for registered sex offenders, HSEM Bulletin #3), hotel non-congregate sheltering for displaced households (Crowne Plaza, Finasisu Terraces, Western Lodge; JIC May 2026), and CHCC's arrangement for expectant mothers at 36+ weeks (call (670) 234-8950; on Tinian and Rota, the health centers), which the app mentions under Medical support.
