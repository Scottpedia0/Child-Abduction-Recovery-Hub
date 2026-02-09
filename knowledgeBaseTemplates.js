// knowledgeBaseTemplates.js
// JavaScript ES Module — converted from knowledgeBaseTemplates.ts
// All TypeScript type annotations and interfaces removed.
// Contains the full knowledge base template library for the Child Abduction Recovery Hub.


export const knowledgeBaseTemplates = [
    // ═══════════════════════════════════════════════════════
    //  SECTION 1: LEGAL TEXTS & TREATIES
    // ═══════════════════════════════════════════════════════
    {
        id: 'kb-1', entryType: 'resource',
        name: 'Hague Convention on International Child Abduction (1980)',
        countryPair: 'Global', resourceType: 'Legal Text',
        tags: ['Legal', 'Treaty', 'Hague', 'Official'],
        summary: 'The core international treaty governing the return of children wrongfully removed across borders. Covers 101 signatory countries.',
        fullText: `THE HAGUE CONVENTION ON THE CIVIL ASPECTS OF INTERNATIONAL CHILD ABDUCTION (1980)

Key Articles:

Article 1 — Objects
a) To secure the prompt return of children wrongfully removed to or retained in any Contracting State.
b) To ensure that rights of custody and access are effectively respected across Contracting States.

Article 3 — Wrongful Removal
Removal or retention is wrongful where it breaches custody rights under the law of the State of habitual residence.

Article 12 — One-Year Rule
If proceedings begin within one year, the court SHALL order return. After one year, return may still be ordered unless the child is settled in the new environment.

Article 13 — Exceptions to Return
a) The left-behind parent was not exercising custody rights.
b) The left-behind parent consented or acquiesced.
c) Grave risk of physical/psychological harm (the most litigated exception).
d) The child objects and has reached an age of maturity.

Article 15 — Declaration of Wrongfulness
Courts may request a declaration from the home country that the removal was wrongful.

Article 21 — Access Rights
Central Authorities shall promote peaceful enjoyment of access rights.

Key Deadlines:
- File within 1 year of abduction for strongest case
- Central Authority must act within 6 weeks
- Courts should decide promptly (6 weeks is the benchmark)`
    },
    {
        id: 'kb-2', entryType: 'resource',
        name: 'Brussels II Revised Regulation (EU)',
        countryPair: 'EU Countries', resourceType: 'Legal Text',
        tags: ['Legal', 'EU', 'Brussels II'],
        summary: 'EU regulation that strengthens Hague Convention returns within EU member states. Stricter rules, harder to refuse return.',
        fullText: `BRUSSELS II REVISED (REGULATION 2201/2003) — EU CHILD ABDUCTION RULES

Applies between: All EU member states (except Denmark)

Key Features:
- Overrides Hague Convention Article 13(b) in many cases
- The court in the country of habitual residence has FINAL say
- Even if the destination country refuses return, the home country court can override that decision
- Stricter timelines: 6 weeks for first instance court decisions
- Child must be heard during proceedings (if age/maturity allows)

Article 11(4): A court cannot refuse return under Article 13(b) if adequate arrangements have been made to protect the child.

Article 11(6-8) — The Override Mechanism:
If a court refuses to return the child, the case goes BACK to the court of habitual residence, which can order the return — and that order is directly enforceable.

Practical Effect: Within the EU, it is extremely difficult to prevent a return order. The home country court always gets the last word.`
    },
    {
        id: 'kb-3', entryType: 'resource',
        name: 'UN Convention on the Rights of the Child',
        countryPair: 'Global', resourceType: 'Legal Text',
        tags: ['Legal', 'UN', 'Children Rights'],
        summary: 'The most widely ratified human rights treaty. Article 11 specifically addresses illicit transfer and non-return of children abroad.',
        fullText: `UN CONVENTION ON THE RIGHTS OF THE CHILD — RELEVANT ARTICLES

Article 11:
1. States Parties shall take measures to combat the illicit transfer and non-return of children abroad.
2. States shall promote bilateral or multilateral agreements or accession to existing agreements.

Article 9:
1. A child shall not be separated from their parents against their will, except when competent authorities determine separation is in the child's best interests.
3. The right to maintain personal relations and direct contact with BOTH parents on a regular basis.

Article 10:
1. Applications to enter or leave a State for family reunification shall be dealt with in a positive, humane and expeditious manner.

Article 35:
States shall take all measures to prevent the abduction of, sale of, or traffic in children.

Why This Matters: The UNCRC is ratified by every UN member state except the US. It can be cited in courts worldwide to support the child's right to maintain contact with both parents.`
    },

    // ═══════════════════════════════════════════════════════
    //  SECTION 2: TEMPLATES & FORMS
    // ═══════════════════════════════════════════════════════
    {
        id: 'kb-4', entryType: 'template',
        name: 'Police Report Filing Template',
        countryPair: 'Global', resourceType: 'Template',
        tags: ['Police', 'Documentation', 'First Steps'],
        summary: 'Standardized format for filing an international parental child abduction report with local police.',
        fullText: `MISSING CHILD / PARENTAL ABDUCTION — POLICE REPORT TEMPLATE

[Give this document to the officer taking your report]

1. CHILD INFORMATION
Full Legal Name: _______________
Date of Birth: _______________
Passport Number(s): _______________
Nationality/Nationalities: _______________
Last Known Location: _______________
Physical Description: _______________
Recent Photo Attached: Yes / No

2. TAKING PARENT / ABDUCTOR
Full Name: _______________
Relationship to Child: _______________
Nationality: _______________
Passport Number: _______________
Known Addresses Abroad: _______________
Vehicle (if known): _______________

3. CIRCUMSTANCES OF ABDUCTION
Date/Time of Taking or Last Contact: _______________
Location Child Was Taken From: _______________
Destination Country (known/suspected): _______________
Method of Travel (flight, car, etc.): _______________
Flight Details (if known): _______________

4. CUSTODY STATUS
Custody Order in Place: Yes / No
Issuing Court: _______________
Type of Order: Sole / Joint / Other
Copy of Order Attached: Yes / No

5. REQUEST TO OFFICER
- Please enter the child into your country's missing persons database
- Please issue a port alert / border alert if available
- This may constitute an offence under the relevant statute
- Please provide a copy of this report with a case/reference number

6. REPORTING PARENT
Name: _______________
Contact Phone: _______________
Email: _______________
Address: _______________
Lawyer (if any): _______________`
    },
    {
        id: 'kb-5', entryType: 'template',
        name: 'Hague Convention Application Template',
        countryPair: 'Global', resourceType: 'Template',
        tags: ['Hague', 'Legal', 'Application', 'Central Authority'],
        summary: 'Template for filing a Hague Convention return application through your Central Authority.',
        fullText: `HAGUE CONVENTION APPLICATION FOR RETURN OF CHILD

[Submit to YOUR country's Central Authority]

PART 1 — APPLICANT (LEFT-BEHIND PARENT)
Full Name: _______________
Date of Birth: _______________
Nationality: _______________
Current Address: _______________
Phone: _______________
Email: _______________
Passport Number: _______________

PART 2 — CHILD
Full Name: _______________
Date of Birth: _______________
Nationality: _______________
Passport Number(s): _______________
Habitual Residence Before Removal: _______________

PART 3 — RESPONDENT (TAKING PARENT)
Full Name: _______________
Date of Birth: _______________
Nationality: _______________
Current/Suspected Address Abroad: _______________
Phone (if known): _______________

PART 4 — FACTS
Date of Wrongful Removal/Retention: _______________
Country Child Taken To: _______________
Circumstances of Removal: _______________
[Describe what happened]

PART 5 — LEGAL BASIS
Custody Rights Under Law of: _______________
Basis of Custody: Court Order / Operation of Law / Agreement
Custody Order Details: _______________
Were You Exercising Custody Rights? Yes
Did You Consent to Removal? No

PART 6 — ATTACHMENTS
□ Copy of custody order (certified/translated if needed)
□ Child's birth certificate
□ Photo of child (recent)
□ Photo of respondent
□ Marriage/divorce certificate
□ Proof of habitual residence
□ Police report
□ Any relevant communications (texts, emails)

PART 7 — RELIEF SOUGHT
I request the return of my child to [Country] under the Hague Convention 1980.

Signature: _______________ Date: _______________`
    },

    // ═══════════════════════════════════════════════════════
    //  SECTION 3: USER-GENERATED ADVANCED TEMPLATES
    // ═══════════════════════════════════════════════════════
    {
        id: 'template-comprehensive-fbi-ipkca-report', entryType: 'template',
        name: 'US: FBI IPKCA Criminal Complaint Dossier',
        countryPair: 'US', resourceType: 'Legal Filing',
        tags: ['FBI', 'IPKCA', 'Criminal', 'US Law', 'Warrant'],
        summary: 'A complete, legally structured dossier to request a federal investigation under the International Parental Kidnapping Crime Act (18 U.S.C. § 1204).',
        phone: '1-800-CALL-FBI',
        url: 'https://www.fbi.gov/investigate/violent-crime/crimes-against-children',
        fullText: `TO: Special Agent in Charge, Violent Crimes Against Children Unit
FBI Field Office: [CITY, STATE]
CC: United States Attorney's Office, District of [DISTRICT]

SUBJECT: OFFICIAL REFERRAL: Violation of 18 U.S.C. § 1204 (International Parental Kidnapping)

I. EXECUTIVE SUMMARY
I, [YOUR NAME], am reporting the international abduction of my minor child, [CHILD'S NAME], by [ABDUCTOR'S NAME]. The child was removed from the United States on [DATE] with the intent to obstruct my lawful exercise of parental rights. I request the immediate opening of a federal investigation, the issuance of a UFAP warrant, and the involvement of the FBI Legal Attaché in [DESTINATION COUNTRY].

II. JURISDICTIONAL ELEMENTS (18 U.S.C. § 1204)
1. The child was in the United States immediately prior to the offense.
2. The Defendant, [ABDUCTOR'S NAME], is a [US CITIZEN / ALIEN ADMITTED FOR PERMANENT RESIDENCE].
3. The Defendant removed the child from the United States / retained the child outside the United States with the intent to obstruct my parental rights.

III. VICTIM & SUBJECT PROFILES

VICTIM (CHILD):
- Name: [FULL NAME]
- DOB: [DATE] (Age: [AGE])
- US Passport: [NUMBER] (Issued: [DATE])
- Foreign Passport: [NUMBER] (Country: [COUNTRY])
- Habitual Residence: [CITY, STATE] (Evidence: School records attached)

SUBJECT (ABDUCTOR):
- Name: [FULL NAME]
- Relationship: [MOTHER/FATHER]
- DOB: [DATE]
- Citizenship: [COUNTRIES]
- Last Known Address in US: [ADDRESS]
- Current Location: [ADDRESS IN FOREIGN COUNTRY OR 'UNKNOWN']

IV. EVIDENCE OF INTENT (PREMEDITATION)
- Flight: The Subject purchased one-way tickets on [AIRLINE] Flight [NUMBER] departing [DATE].
- Employment: The Subject resigned from their job on [DATE] (Evidence attached).
- Assets: The Subject liquidated [BANK ACCOUNTS / ASSETS] totaling $[AMOUNT] on [DATE].
- Communication: The Subject sent a text/email on [DATE] stating "[QUOTE]."

V. CUSTODY STATUS
At the time of removal, I held [SOLE / JOINT] legal custody pursuant to:
- Court Order: [CASE NUMBER] issued by [COURT NAME] on [DATE].
(A certified copy of the custody order/statute is attached as Exhibit A).

VI. REQUESTED LAW ENFORCEMENT ACTION
1. NCIC Entry: Enter the child and subject into NCIC immediately as Missing/Endangered.
2. Federal Warrant: Seek a criminal complaint and warrant for arrest under 18 U.S.C. § 1204.
3. Interpol: Request the issuance of a Red Notice (Subject) and Yellow Notice (Child).
4. Border Alerts: Notify CBP and foreign counterparts to prevent transit to a third country.

I declare under penalty of perjury that the foregoing is true and correct.

[YOUR SIGNATURE]
[DATE]
[PHONE NUMBER]`
    },
    {
        id: 'template-hague-undertakings', entryType: 'template',
        name: "Legal: 'Safe Harbor' Undertakings (To Win Return)",
        countryPair: 'General', resourceType: 'Court Document',
        tags: ['Hague', 'Legal', 'Undertakings', 'Defense', 'Strategy'],
        summary: "When an abductor claims returning the child puts them at risk (Article 13b), you must offer 'Undertakings' — enforceable promises to the court that ensure safety. This template wins cases.",
        fullText: `PROPOSED UNDERTAKINGS (SAFE HARBOR MEASURES)

IN THE MATTER OF: [CHILD'S NAME]

To facilitate the immediate return of the child to [HOME COUNTRY] and to ameliorate any alleged risk under Article 13(b) of the Hague Convention, the Applicant, [YOUR NAME], hereby freely and voluntarily undertakes to this Court and the Courts of [HOME COUNTRY] as follows:

1. NON-PROSECUTION (CRIMINAL):
The Applicant agrees not to initiate or pursue criminal charges for parental kidnapping against the Respondent upon their return, subject to the discretion of the District Attorney/Crown Prosecution Service. The Applicant will request that any outstanding arrest warrants be recalled or suspended to allow the Respondent to travel.

2. HOUSING & ACCOMMODATION:
The Applicant shall vacate the former marital residence located at [ADDRESS] effectively immediately upon the Respondent's return, granting the Respondent and Child exclusive possession of the property until a court of competent jurisdiction in [HOME COUNTRY] orders otherwise.

3. INTERIM FINANCIAL SUPPORT:
The Applicant shall pay the Respondent the sum of [AMOUNT] per month for spousal/child maintenance, beginning on the date of return, until a financial order is made by the [HOME COUNTRY] court.

4. TRAVEL COSTS:
The Applicant shall purchase economy class airfare for the Respondent and the Child to travel from [CURRENT COUNTRY] to [HOME COUNTRY].

5. NO VIOLENCE / HARASSMENT:
The Applicant shall not harass, threaten, or approach the Respondent within [DISTANCE] meters, except for agreed-upon custodial exchanges.

6. JURISDICTION:
The Applicant agrees to submit to the jurisdiction of the [HOME COUNTRY] Family Court immediately upon return to determine long-term custody and visitation.

These undertakings are made to ensure the 'soft landing' of the child and are legally binding upon the Applicant.`
    },
    {
        id: 'guide-us-mexico-strategy', entryType: 'country_matrix',
        name: "Country Strategy: US to Mexico (The Amparo Nightmare)",
        countryPair: 'US-Mexico', resourceType: 'Country Strategy',
        tags: ['Mexico', 'Amparo', 'Hague', 'LATAM', 'Strategy'],
        summary: "Detailed strategy for Mexico, the most common destination for US abductions. Explains how to navigate the 'Amparo' appeal system which causes years of delay.",
        fullText: `STRATEGIC ANALYSIS: US -> MEXICO ABDUCTION

Mexico is a Hague partner, but enforcement is complicated by the 'Amparo' system (Constitutional Protection appeals). Without a specific strategy, cases can drag for 3-5 years.

PHASE 1: THE HAGUE FILING (First 30 Days)
- Authority: Application goes to the SRE (Secretaría de Relaciones Exteriores).
- Venue: You must file in the Federal Court (Juzgado de Distrito), NOT the local family court. Local judges are often biased. Federal judges are better trained.
- Precautionary Measures (Medidas Precautorias): Your initial filing MUST request an immediate border alert (Alerta Migratoria) to stop the abductor from taking the child further.

PHASE 2: THE RESTITUTION HEARING
- Mexico has a 'concentrated' hearing phase. You will likely testify via video.
- The Judge will interview the child. In Mexico, children as young as 4 or 5 are often interviewed.

PHASE 3: THE AMPARO (The Trap)
- If you win the return order, the abductor will file an 'Amparo Indirecto' claiming their human rights were violated.
- Effect: This automatically stays (pauses) the return of the child.
- Counter-Strategy: Your lawyer must immediately file a 'Recurso de Revisión' requesting an expedited review. Do not let the file sit. Petition the appellate court every week.

CRITICAL ERROR TO AVOID:
Do NOT attempt 'Self-Help' (re-kidnapping) in Mexico. Kidnapping is a severe federal crime. You will be imprisoned, and you will lose all standing in the Hague case.

CONTACTS:
- SRE Family Law Division: dgdpic@sre.gob.mx
- US Embassy Mexico City (ACS): MexicoCityACS@state.gov`
    },
    {
        id: 'template-digital-forensics-affidavit', entryType: 'procedure',
        name: 'Digital Forensics & Preservation Protocol',
        countryPair: 'General', resourceType: 'Procedure',
        tags: ['Digital', 'Forensics', 'Evidence', 'Tracing', 'Technology'],
        summary: 'How to legally capture and present digital evidence (social media, cloud data) to prove flight risk or location without violating privacy laws.',
        fullText: `DIGITAL EVIDENCE COLLECTION & PRESERVATION PROTOCOL

OBJECTIVE: To secure proof of (A) Location and (B) Premeditation (Intent) before the abductor deletes it.

STEP 1: PRESERVATION (The 'Do Not Delete' Phase)
If you have shared access to accounts (iCloud, Google, Amazon, Bank), DO NOT CHANGE THE PASSWORDS yet. Changing passwords alerts them, causing them to go dark.
- Log in quietly.
- Export data: Use 'Google Takeout' or 'Download Your Information' on Facebook to pull a full archive.

STEP 2: LOCATION TRIANGULATION
Look for these specific metadata markers:
1. Google Photos: Open recent photos -> Click 'Info' (i) -> View Map Location.
2. IP Addresses: Check Gmail 'Last Account Activity' or Facebook 'Security and Login' settings.
3. Uber/Lyft/Grab: Check 'Past Trips'. This gives you exact drop-off addresses.

STEP 3: PROVING PREMEDITATION (Crucial for Court)
Courts grant immediate custody if you prove 'Flight Risk'. Look for:
- Search History: "Non-extradition countries," "How to get a passport for a minor," "Jobs in [COUNTRY]."
- Commerce: Purchases of luggage, translation services, or liquidation of assets.

STEP 4: THE AFFIDAVIT TEMPLATE (For your Lawyer)
"I, [NAME], attest that on [DATE], I accessed the shared computer located in the marital home. I observed the following:
- On [DATE], the Respondent searched for 'Schools in [FOREIGN CITY]'.
- On [DATE], the Respondent emailed a realtor in [FOREIGN COUNTRY].
Attached are screenshots labeled Exhibit A-C. These searches occurred 3 weeks prior to the alleged 'vacation', demonstrating a premeditated plan to permanently relocate."`
    },
    {
        id: 'template-article13b-rebuttal', entryType: 'template',
        name: "Legal: Rebuttal to Article 13(b) 'Grave Risk'",
        countryPair: 'General', resourceType: 'Legal Filing',
        tags: ['Hague', 'Article 13b', 'Legal', 'Defense', 'Rebuttal'],
        summary: "The 'Grave Risk' defense is the #1 tool used by abductors to stop a return. This is the legal script your lawyer needs to defeat it.",
        fullText: `LEGAL ARGUMENT: REBUTTAL TO ARTICLE 13(b) DEFENSE

1. THE THRESHOLD IS 'GRAVE', NOT 'UNCOMFORTABLE':
The Article 13(b) exception requires a 'grave' risk — meaning immediate physical danger or war-zone conditions. It is not a vehicle for litigating the 'best interests' of the child. That is for the home court to decide.

2. HOME COUNTRY PROTECTIONS ARE ADEQUATE:
The Courts of [HOME COUNTRY] have robust child protection laws, restraining orders, and emergency shelters. The Hague Convention operates on the presumption that the courts of the signatory state are capable of protecting the child. The Respondent has failed to show that the legal system is effectively broken or unavailable.

3. SOLIPSISTIC RISK (CREATED BY ABDUCTOR):
The Respondent argues that if they are arrested upon return, the child will suffer. This is a risk of the abductor's own making. A parent cannot create a risk (by kidnapping) and then use that risk as a defense against return. Furthermore, the Applicant has offered Undertakings to neutralize this risk.

4. SEPARATION OF CHILD AND PRIMARY CARER:
The Respondent argues they are the 'primary attachment figure' and cannot return. Case law establishes that if the abducting parent refuses to return with the child, they cannot rely on the psychological harm of separation as a defense, provided the Left-Behind Parent pays for their ticket. The refusal to return is a choice, not a necessity.

CONCLUSION:
The Article 13(b) defense must fail because the risk is not 'grave' and can be mitigated by the specific protective measures available in [HOME COUNTRY].`
    },
    {
        id: 'guide-non-hague-litigation', entryType: 'guidance',
        name: 'Strategy: Non-Hague Countries (Litigation vs. Negotiation)',
        countryPair: 'General', resourceType: 'Strategy Guide',
        tags: ['Non-Hague', 'Strategy', 'India', 'Middle East', 'China', 'Negotiation'],
        summary: "If there is no treaty (e.g., India, China, UAE), you have two paths: The 'Hard Way' (Criminal/Leverage) or the 'Soft Way' (Foreign Custody Filing). You usually need both.",
        fullText: `STRATEGIC PLAYBOOK: NON-HAGUE COUNTRIES

When a child is taken to a country with no treaty, there is no mechanism to force a return. You must choose a strategy based on LEVERAGE.

PATH A: THE 'HARD' LEVERAGE (Criminal Pressure)
Goal: Make the abductor's life so difficult they negotiate a return.
1. Federal Warrant/Criminal Warrant: Obtain a felony warrant for kidnapping immediately.
2. Interpol Red Notice: Traps the abductor in the destination country.
3. Passport Cancellation: Revoke the abductor's visa or passport if possible.
4. Financial Freeze: Cut off all money. Sue family members who funded the flight.

PATH B: THE 'SOFT' LITIGATION (Foreign Court)
Goal: Win custody under the foreign country's laws.
1. Submit to Jurisdiction: File for custody in their court.
2. The 'Forum Conveniens' Argument: Argue the child is a foreigner.
3. Cultural/Religious Law: In Sharia courts, argue custodial violations. In India, argue 'Parens Patriae'.

THE HYBRID STRATEGY (RECOMMENDED):
Start with Path A (Hard Leverage). When the abductor realizes they are trapped and broke, offer Path B (Settlement). "I will drop the Interpol notice and the criminal charges IF you return the child."`
    },
    {
        id: 'template-emergency-custody-motion', entryType: 'template',
        name: 'Legal: Emergency Ex Parte Motion for Sole Custody',
        countryPair: 'US', resourceType: 'Legal Filing',
        tags: ['Legal', 'Custody', 'Emergency', 'Motion', 'UCCJEA'],
        summary: "The immediate motion you file in your home court the moment you discover the abduction. This gives you the 'Rights of Custody' needed for the Hague case.",
        fullText: `EMERGENCY MOTION FOR TEMPORARY SOLE CUSTODY & WRIT OF ASSISTANCE

1. JURISDICTION:
The child, [CHILD'S NAME], has resided in [STATE/COUNTY] for the last [NUMBER] months/years, establishing this Court as the 'Home State' under the UCCJEA.

2. EMERGENCY CIRCUMSTANCES:
On [DATE], the Respondent removed the child from the jurisdiction without the Petitioner's consent.

3. RELIEF REQUESTED:
a. Sole Legal and Physical Custody of the minor child to the Petitioner.
b. Suspension of the Respondent's visitation rights until further hearing.
c. A directive that the child be immediately returned to [STATE].
d. A 'Writ of Assistance' authorizing all law enforcement officers to take the child into protective custody.
e. A specific finding that the removal was wrongful and a violation of custody rights (required for Hague Article 3).

4. NOTICE:
Notice should be waived due to the risk that alerting the Respondent will cause them to flee further into hiding.`
    },
    {
        id: 'matrix-japan-enforcement-detail', entryType: 'country_matrix',
        name: 'Country Strategy: US/UK to Japan (Enforcement Nuances)',
        countryPair: 'US-Japan', resourceType: 'Country Strategy',
        tags: ['Japan', 'Hague', 'Asia', 'Enforcement', 'Strategy'],
        summary: "Detailed look at the Japan enforcement reforms (2020). Returns are legally possible but operationally difficult.",
        fullText: `STRATEGIC ANALYSIS: US -> JAPAN ABDUCTION

Historically, Japan was a 'black hole' for abduction. Since signing the Hague in 2014 and the Civil Execution Act amendments in 2020, returns are legally possible but operationally difficult.

THE CRITICAL HURDLE: 'DIRECT ENFORCEMENT'
Under the new law, if a parent refuses to return the child after a court order, an 'Execution Officer' can physically retrieve the child. HOWEVER:
1. The execution officer must be present.
2. The child must not strictly refuse (difficult with alienated teens).
3. The Left-Behind Parent MUST be present in Japan to receive the child immediately.

STRATEGY:
1. VISITATION IS A TRAP: If you agree to a visitation schedule while the Hague case is pending, the judge may deny the return. Argue visitation is insufficient.
2. HABEAS CORPUS: Consider filing in the Japanese High Court if the abductor is hiding the child.
3. CRIMINAL CHARGES: Japan generally refuses to extradite its own citizens. Use warrants as leverage, not as a recovery tool.

CONTACT:
Ministry of Foreign Affairs (MOFA) - Hague Convention Division: +81-3-5501-8466`
    },
    {
        id: 'checklist-reunification-safety', entryType: 'procedure',
        name: 'Protocol: The Physical Handover (Safety & Logistics)',
        countryPair: 'General', resourceType: 'Procedure',
        tags: ['Reunification', 'Safety', 'Logistics', 'Handover'],
        summary: 'The moment of handover is dangerous. The abductor is volatile. This is the safety protocol for the day you get your child back.',
        fullText: `PROTOCOL FOR PHYSICAL REUNIFICATION (HANDOVER DAY)

1. LOCATION:
NEVER do the handover at the abductor's home. Request a neutral, secure location:
- A Police Station Lobby
- The Embassy or Consulate
- A Court designated exchange center

2. THE 'GRAB BAG':
Have a bag ready:
- Certified Copy of the Return Order (translated)
- The Child's Passport (do not let the abductor hold it)
- Snacks/Toys (distraction)
- A new phone for the child if older

3. THE INTERACTION:
- Do not engage with the abductor. Do not gloat. Do not apologize.
- If the child is crying (common due to alienation), remain calm.
- "I love you, you are safe, we are going home." Repeat this.

4. IMMEDIATE DEPARTURE:
- Go directly to the airport.
- Have your lawyer alert Airport Immigration that you are passing through with a valid court order.`
    },
    {
        id: 'template-state-dept-welfare-robust', entryType: 'template',
        name: 'US: Dept of State Welfare & Whereabouts Request',
        countryPair: 'US', resourceType: 'Letter Template',
        tags: ['State Dept', 'Welfare Check', 'Consular', 'US'],
        summary: "A detailed request to the Office of Children's Issues for a welfare visit with specific concerns and messages to deliver.",
        fullText: `SUBJECT: URGENT ACTION REQUEST: Welfare & Whereabouts Visit - [CHILD'S NAME] - [CASE NUMBER]

TO: AskCI@state.gov (US Dept of State)

To the Country Officer,

I request that the US Embassy in [CITY, COUNTRY] conduct a physical welfare visit to my US Citizen child, [CHILD'S NAME], immediately.

1. LOCATION INTELLIGENCE:
The child is believed to be at: [ADDRESS].

2. SPECIFIC CONCERNS TO INVESTIGATE:
- Medical: The child suffers from [CONDITION]. Please visually confirm medication.
- Schooling: Is the child enrolled?
- Alienation: Is the child being allowed to speak English? Are they being told I am dead/in prison?

3. MESSAGES TO DELIVER:
- To the Child: "Your [father/mother] loves you and is fighting to bring you home."
- To the Abductor: Please hand-deliver the attached amnesty offer.

4. PRIVACY WAIVER:
I have attached a signed Privacy Act Waiver.

Please provide a written report within 48 hours.

Sincerely,
[YOUR NAME]`
    },
    {
        id: 'template-uk-tipstaff-order', entryType: 'template',
        name: 'UK: Application for Tipstaff Location Order',
        countryPair: 'UK', resourceType: 'Legal Filing',
        tags: ['UK', 'Legal', 'Tipstaff', 'High Court', 'Enforcement'],
        summary: "In the UK, the 'Tipstaff' is the High Court's enforcement officer with power to track abductors using tax/benefit records.",
        fullText: `IN THE HIGH COURT OF JUSTICE
FAMILY DIVISION

APPLICATION FOR A COLLECTION ORDER / LOCATION ORDER

1. THE APPLICANT applies for an order directing the Tipstaff to:
A. Locate the child, [CHILD'S NAME], and the Respondent.
B. Seize the passports and travel documents.
C. Take the child into protective custody.

2. GROUNDS:
- The child was wrongfully removed/retained on [DATE].
- The Respondent has concealed their whereabouts.
- There is an imminent risk of further flight.

3. DIRECTION TO THIRD PARTIES:
Include a 'Port Alert' to all UK exit points and a direction to HMRC/DWP to disclose the Respondent's address immediately.

4. CERTIFICATE OF URGENCY:
Delay would defeat the purpose of the application.`
    },
    {
        id: 'resource-eu-certificate-return', entryType: 'resource',
        name: "EU: Brussels IIb 'Certificate of Return' (Trumping Order)",
        countryPair: 'EU', resourceType: 'Legal Filing',
        tags: ['EU', 'Brussels II', 'Legal', 'Trumping Order', 'Strategy'],
        summary: "The most powerful tool in Europe. If a foreign court refuses return under Article 13(b), your home court can 'Trump' them under Brussels IIb.",
        fullText: `GUIDE TO THE BRUSSELS IIb 'CERTIFICATE OF RETURN' (TRUMPING MECHANISM)

Applicable: Between all EU Member States (except Denmark).

THE SCENARIO:
You filed for return in France. The French court refused, citing Article 13(b). In a normal Hague case, you'd be stuck.

THE BRUSSELS IIb SOLUTION:
Under Brussels IIb, you have a second chance in your HOME court.

STEP 1: The French court transmits the refusal file to your Home Court within 1 month.
STEP 2: Your Home Court invites submissions.
STEP 3: Your Home Court examines the custody question and issues a judgment.
STEP 4: The Home Court issues the 'CERTIFICATE OF RETURN'.

THE POWER OF THE CERTIFICATE:
- It is automatically enforceable in France.
- The French courts CANNOT oppose it.
- There is NO appeal against enforcement.
- The child must be returned immediately.

ACTION:
If you lose in the foreign EU court, instruct your Home Attorney immediately: "File for a decision on custody and a Certificate of Return under Brussels IIb."`
    },
    {
        id: 'template-interpol-yellow-notice-full', entryType: 'template',
        name: 'Global: Interpol Yellow Notice Application Data',
        countryPair: 'General', resourceType: 'Form Instructions',
        tags: ['Interpol', 'Yellow Notice', 'Police', 'Tracing'],
        summary: 'Interpol does not take requests from individuals. Provide this data to your local police (NCB) to submit on your behalf.',
        fullText: `DATA REQUIRED FOR INTERPOL YELLOW NOTICE (MISSING PERSON)

Provide this dossier to your local Police Detective or National Central Bureau (NCB).

1. SUBJECT (MISSING CHILD):
- Family Name, Forenames
- Sex, Date of Birth, Place of Birth
- Nationality
- Identity Documents: Passport #

2. PHYSICAL DESCRIPTION:
- Height/Weight, Hair/Eyes
- Distinguishing Marks
- Photo: High-resolution headshot, less than 6 months old

3. CIRCUMSTANCES OF DISAPPEARANCE:
- Date, Place, Probable Destination
- Linked Individual (Abductor)

4. REQUEST FOR ACTION:
[ ] Publish on Interpol Public Website
[ ] Restricted to Law Enforcement Only

5. AUTHORITY:
- Case Reference Number
- Magistrate/Judge Issuing Warrant
- Relevant Law`
    },
    {
        id: 'template-financial-freeze', entryType: 'template',
        name: 'Financial: Asset Freeze & Trace Request',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['Financial', 'Bank', 'Freeze', 'Investigation', 'Tracing'],
        summary: 'A dual-purpose letter to banks: (1) Stop the money, (2) Preserve the evidence of where the money went.',
        fullText: `TO: [BANK NAME] Security & Fraud Department

RE: FRAUD ALERT & ASSET PRESERVATION - Acct [NUMBER]

URGENT: KIDNAPPING INVESTIGATION IN PROGRESS

1. IMMEDIATE FREEZE:
I am the joint owner. Effective immediately, I revoke all authorization for [ABDUCTOR'S NAME] to withdraw funds, use debit cards, or initiate transfers. Please place a 'Hard Hold' on all assets.

2. PRESERVATION OF RECORDS:
Pursuant to an active police investigation (Report #[NUMBER]), you are legally required to preserve all data regarding:
- Wire transfers (SWIFT/IBAN data)
- ATM withdrawal locations (including IP addresses)
- Credit card transaction details

3. FOREIGN TRANSACTION ALERT:
If any attempt is made to access these funds from [SUSPECTED COUNTRY], deny the transaction and log the location data immediately.

I attach my ID and a copy of the police report.`
    },
    {
        id: 'template-custody-affidavit', entryType: 'template',
        name: "Legal: 'Left-Behind Parent' Affidavit",
        countryPair: 'General', resourceType: 'Court Document',
        tags: ['Legal', 'Affidavit', 'Testimony', 'Court Document', 'Hague'],
        summary: 'Your main testimony. It must be factual, chronological, and devoid of emotional ranting to be taken seriously by a foreign judge.',
        fullText: `AFFIDAVIT OF [YOUR NAME] IN SUPPORT OF RETURN APPLICATION

I, [YOUR NAME], being duly sworn, depose and state:

1. I am the biological [MOTHER/FATHER] of [CHILD'S NAME] and the Petitioner in this matter.

2. HABITUAL RESIDENCE:
Until [DATE OF REMOVAL], the child lived exclusively in [CITY, STATE]. The child attended [SCHOOL], saw Dr. [DOCTOR] for medical care, and participated in [ACTIVITY]. Evidence attached as Exhibit A.

3. CUSTODY RIGHTS:
I hold Rights of Custody pursuant to [COURT ORDER / STATUTE]. I was actively exercising these rights.

4. THE WRONGFUL REMOVAL:
On [DATE], the Respondent removed the child. I did NOT consent.

5. REBUTTAL TO ALLEGATIONS:
The Respondent claims I am 'abusive'. This is a fabrication designed to manipulate the Article 13(b) defense. I have no criminal record. (Police Clearance Certificate attached as Exhibit C).

6. PRAYER FOR RELIEF:
I respectfully request this Court order the summary return of the child.

[SIGNATURE]`
    },
    {
        id: 'guide-middle-east-custody', entryType: 'country_matrix',
        name: 'Country Strategy: US/UK to Middle East (Sharia/Hadanah)',
        countryPair: 'General', resourceType: 'Country Strategy',
        tags: ['Middle East', 'Sharia', 'Non-Hague', 'Custody', 'Islamic Law'],
        summary: "Understanding 'Hadanah' (Custody) vs 'Walaya' (Guardianship) is vital for cases in Saudi Arabia, UAE, Qatar, Egypt, etc.",
        fullText: `STRATEGIC OVERVIEW: ABDUCTION TO MENA (Middle East/North Africa)

Most MENA countries are Non-Hague. Family law is based on Sharia principles. You cannot use Western legal arguments here.

KEY CONCEPTS:
1. HADANAH (Physical Custody): Usually goes to the mother until the child reaches a certain age (often 7-9 for boys, 9-11 for girls).
2. WALAYA (Guardianship): Almost always remains with the father. Covers decision-making, travel, and finances.

STRATEGY FOR FATHERS:
- You have the upper hand on 'Walaya'. You can place a 'Travel Ban' on the child to prevent further movement.
- Argument: If the mother is obstructing your role as Guardian, you can petition to transfer Hadanah.

STRATEGY FOR MOTHERS:
- If you are a Western mother, you are at a disadvantage. You must not leave the country without the child.
- Argument: Prove the father is 'Unfit' to strip him of guardianship.
- Settlement: Often the best bet is a cash settlement in exchange for permission to take the child home.

WARNING:
Adultery is a crime in many of these jurisdictions. Keep your private life completely scrubbed from social media.`
    },
    {
        id: 'template-chins-petition', entryType: 'template',
        name: 'Legal: CHINS Petition (Post-Return Protection)',
        countryPair: 'US', resourceType: 'Legal Filing',
        tags: ['CHINS', 'Protection', 'Legal', 'US', 'Post-Return'],
        summary: "A 'Child In Need of Services' petition puts the child under state protection after return, making it much harder for the parent to re-abduct.",
        fullText: `PETITION ALLEGING CHILD IN NEED OF SERVICES (CHINS)

1. The Child, [NAME], is a child in need of services because:
a. The child's condition is seriously endangered as a result of the Respondent's inability to supply necessary supervision.
b. Specifically, the Respondent abducted the child internationally on [DATE], causing severe emotional trauma.

2. RISK OF RE-ABDUCTION:
The Respondent has demonstrated a willingness to violate court orders and flee.

3. REQUEST FOR INTERVENTION:
a. Adjudicate the child as a CHINS.
b. Place the child in the temporary custody of the Petitioner.
c. Order the Respondent to surrender all travel documents.
d. Order Supervised Visitation only.

This creates a state-level safety net. If the Respondent takes the child now, it is kidnapping from the State, not just a civil dispute.`
    },
    {
        id: 'template-school-records-alert', entryType: 'prevention',
        name: "Prevention: School Records 'Red Flag' Request",
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['School', 'Records', 'Tracing', 'Prevention'],
        summary: 'Abductors eventually need to enroll the child in school. This letter ensures you get alerted when they request records.',
        fullText: `TO: [SCHOOL PRINCIPAL] and [REGISTRAR]

RE: STUDENT RECORDS FLAG - [CHILD'S NAME] - MISSING CHILD

Please place an immediate ADMINISTRATIVE FLAG on the cumulative file and digital records of [CHILD'S NAME] (DOB: [DATE]).

The child has been abducted by [ABDUCTOR'S NAME]. A police investigation is active (Case #[NUMBER]).

INSTRUCTIONS:
1. If you receive a request for transcripts/records from a new school (especially from [COUNTRY]), DO NOT transfer the records immediately.
2. Notify the local police and myself immediately upon receipt of such a request.
3. Call me immediately at [PHONE]. This is often the only lead we have to locate the child.

I have attached the Custody Order which grants me the right to access records.

Sincerely,
[YOUR NAME]`
    },
    {
        id: 'template-media-strategy-matrix', entryType: 'procedure',
        name: 'Media: To Publish or Not? (Risk Assessment)',
        countryPair: 'General', resourceType: 'Strategy Guide',
        tags: ['Media', 'Strategy', 'Publicity', 'Risk Assessment'],
        summary: 'Going to the media is irreversible. Use this matrix to decide if it will help or hurt your case.',
        fullText: `MEDIA STRATEGY DECISION MATRIX

WHEN TO GO PUBLIC:
- The Abductor is narcissistic and cares about their reputation
- The Police are doing nothing and need pressure
- You have no leads on location and need 'eyes on the ground'
- The child is in a Western democracy where public opinion matters

WHEN TO STAY QUIET:
- The Abductor is paranoid/mentally unstable
- The Abductor is in a country where 'Honor' is paramount
- A sensitive negotiation is happening
- The child is older (teens)

IF YOU GO PUBLIC — THE RULES:
1. Focus on the Child, not the Hate. "We love them, we miss them."
2. Use a dedicated email/phone, never your personal one.
3. One main photo. Use the same photo everywhere.

WARNING: Once it's on the internet, you cannot take it back.`
    },
    {
        id: 'template-airline-gdpr-bypass', entryType: 'template',
        name: 'Logistics: Airline Info Request (Privacy Bypass)',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['Airline', 'Privacy', 'GDPR', 'Tracing'],
        summary: "Airlines refuse info due to privacy laws. This frames the request as a 'Vital Interest' emergency to bypass GDPR/Privacy blocks.",
        fullText: `TO: Data Protection Officer / Emergency Response Team
AIRLINE: [AIRLINE NAME]

SUBJECT: URGENT - VITAL INTEREST REQUEST - MISSING CHILD [NAME]

Reference: GDPR Article 6(1)(d) "Vital Interests"

I am requesting confirmation of travel for a MINOR CHILD, [CHILD'S NAME], on Flight [NUMBER] dated [DATE].

Under GDPR Article 6(1)(d), processing is lawful when "necessary to protect the vital interests of the data subject."

I am not asking for the adult's contact info. I am asking: DID THE CHILD BOARD THE PLANE?

If you refuse to release this to me, you are legally obligated to release it immediately to the investigating officer:
Detective [NAME], Email: [EMAIL], Phone: [PHONE].

Sincerely,
[YOUR NAME]`
    },
    {
        id: 'template-mirror-order', entryType: 'template',
        name: "Legal: 'Mirror Order' / Safe Harbor Request",
        countryPair: 'General', resourceType: 'Court Document',
        tags: ['Legal', 'Mirror Order', 'Safe Harbor', 'Strategy', 'Hague'],
        summary: "CRITICAL: Foreign courts refuse return because they fear the abducting parent will be arrested. Obtain this order in your HOME court to show the foreign judge that return is safe.",
        fullText: `ORDER FOR SAFE HARBOR AND MIRRORING OF FOREIGN RETURN ORDER

This Court, acknowledging proceedings pending in [FOREIGN COUNTRY] under the Hague Convention, hereby ORDERS:

1. NON-ENFORCEMENT OF ARREST WARRANTS:
Upon the Respondent's voluntary return with the child, this Court recalls any civil warrants for a period of [NUMBER] days.

2. INTERIM CUSTODY UPON RETURN:
The Respondent shall have temporary physical possession of the child at the former residence for the first [NUMBER] days to minimize transition trauma.

3. NO PROSECUTION REQUEST:
The Petitioner does not desire criminal prosecution, provided the child is returned by [DATE].

4. FINANCIAL SUPPORT:
The Petitioner shall deposit $[AMOUNT] into the Registry of the Court for the Respondent upon arrival.

5. JURISDICTION:
This Court affirms exclusive continuing jurisdiction under the UCCJEA to determine custody once the child is returned.

IT IS SO ORDERED.`
    },
    {
        id: 'guide-civil-conspiracy', entryType: 'guidance',
        name: "Strategy: Suing the Abductor's Family (Civil Conspiracy)",
        countryPair: 'US', resourceType: 'Strategy Guide',
        tags: ['Civil Litigation', 'Tort', 'Funding', 'Strategy', 'Pressure'],
        summary: "How to cut off the abductor's funding. If grandparents or friends helped fund the kidnapping, sue them for Civil Conspiracy.",
        fullText: `STRATEGY: CIVIL TORT LITIGATION (THE 'NUCLEAR OPTION')

Most abductors cannot survive abroad without financial help from family back home. Cutting off this supply line is often more effective than a police warrant.

KEY CLAIMS TO FILE:
1. Civil Conspiracy to Interfere with Custodial Relations
2. Intentional Infliction of Emotional Distress (IIED)
3. Aiding and Abetting

THE GOAL:
- Force the Co-Conspirators to spend money on their own lawyers.
- Force them to testify under oath (Deposition). If they lie about where the child is, they commit Perjury.
- Force a settlement where they agree to stop funding the abductor.

WARNING:
This is aggressive. It will destroy family relationships permanently. Use only when the abductor is fully non-compliant.`
    },
    {
        id: 'template-uae-travel-ban', entryType: 'country_matrix',
        name: 'Country Strategy: US/UK to UAE (Travel Bans)',
        countryPair: 'General', resourceType: 'Country Strategy',
        tags: ['UAE', 'Dubai', 'Middle East', 'Travel Ban', 'Non-Hague'],
        summary: "The UAE is Non-Hague. The most effective tool is the 'Travel Ban'. Here is how to use it.",
        fullText: `STRATEGIC OVERVIEW: ABDUCTION TO UAE (DUBAI/ABU DHABI)

The UAE is not a Hague signatory. US/UK court orders are generally NOT recognized.

CRITICAL TOOL: THE TRAVEL BAN (MAN'A AL SAFAR)

SCENARIO A: YOU ARE THE FATHER (LEFT BEHIND)
- You retain 'Guardianship' (Walaya).
- File an urgent Travel Ban on the child to prevent further movement.
- Strategy: File the ban, then negotiate.

SCENARIO B: YOU ARE THE MOTHER (LEFT BEHIND)
- File for 'Hadanah' (Custody) under UAE law.
- Danger: If you enter the UAE, the father may place a travel ban on YOU.

WARNING: Do not attempt to smuggle the child out. UAE border biometrics are advanced. You will be caught and imprisoned.`
    },
    {
        id: 'template-narcissist-comms', entryType: 'guidance',
        name: 'Communication: BIFF Response Script (High-Conflict)',
        countryPair: 'General', resourceType: 'Communication Guide',
        tags: ['Communication', 'Psychology', 'Negotiation', 'BIFF', 'Evidence'],
        summary: "Abductors often have high-conflict personalities. Use the BIFF method (Brief, Informative, Friendly, Firm) so they can't use your words against you.",
        fullText: `THE 'BIFF' METHOD FOR HIGH-CONFLICT ABDUCTORS

(Brief, Informative, Friendly, Firm)

SCENARIO: Abductor emails you: "You are a terrible parent, you never cared, I had to save [CHILD]. Stop harassing me."

DO NOT REPLY: "You are the kidnapper! I will put you in jail!"
(This will be used against you in court.)

USE THIS TEMPLATE INSTEAD:

"Dear [NAME],

Thank you for letting me know you are with [CHILD]. (Friendly)

I am writing to confirm that [CHILD] has not attended school in [HOME CITY] since [DATE]. The court hearing is scheduled for [DATE]. (Informative)

I am willing to discuss a parenting plan provided [CHILD] is returned by [DATE]. (Firm)

Please arrange a FaceTime call for me and [CHILD] on [DAY] at [TIME].

Sincerely,
[YOUR NAME]"

WHY THIS WORKS:
1. Brief: No emotional fuel for them.
2. Informative: Creates a paper trail that you are reasonable.
3. Friendly: Destroys their 'Abuse' defense in court.
4. Firm: Sets a boundary without a threat.`
    },
    {
        id: 'template-ne-exeat', entryType: 'template',
        name: "Prevention: 'Ne Exeat' Bundle (Before They Leave)",
        countryPair: 'US', resourceType: 'Court Document',
        tags: ['Prevention', 'Ne Exeat', 'Legal', 'Court Order', 'UCAPA'],
        summary: "If you suspect an abduction is IMMINENT. This is the 'gold standard' prevention order to file immediately.",
        fullText: `EMERGENCY PETITION FOR PREVENTION OF INTERNATIONAL ABDUCTION
(Pursuant to UCAPA - Uniform Child Abduction Prevention Act)

1. RISK FACTORS (Section 7 UCAPA):
[ ] Abandoned employment
[ ] Liquidated assets
[ ] Obtained passport applications without consent
[ ] Threatened to remove child to a Non-Hague signatory
[ ] Used abusive language indicating refusal to follow Court Orders

2. REQUESTED RELIEF:
A. NE EXEAT: Respondent is prohibited from removing the child from the jurisdiction.
B. PASSPORT SURRENDER: All passports to the Clerk of Court within 24 hours.
C. TRAVEL ALERT: Enter child into the Children's Passport Issuance Alert Program.
D. SUPERVISED VISITATION: No overnights.
E. BOND: Post a bond sufficient to cover international legal fees.`
    },
    {
        id: 'guide-india-habeas-corpus', entryType: 'country_matrix',
        name: 'Country Strategy: US/UK to India (Habeas Corpus)',
        countryPair: 'US-India', resourceType: 'Country Strategy',
        tags: ['India', 'Habeas Corpus', 'Non-Hague', 'Legal', 'Strategy'],
        summary: 'India is the hardest jurisdiction for return. You must file a Writ of Habeas Corpus in the Indian High Court.',
        fullText: `STRATEGY: WRIT OF HABEAS CORPUS IN INDIA

Since India is not a Hague signatory, you cannot file for 'Return'. You must file a Writ of Habeas Corpus.

YOUR REQUIRED ARGUMENTS:
1. 'Rootedness': File IMMEDIATELY. If you wait 6 months, the court will say the child is 'rooted' in India.
2. 'Doctrine of Comity': Argue the US/UK court has already exercised jurisdiction. (Weak in India, but necessary.)
3. 'Soft Landing' Offer (CRITICAL): Indian judges will NOT send a child back if the mother will be arrested or destitute. Submit an affidavit promising separate housing, no criminal charges, and withdrawal of Interpol Red Notices.
4. 'Intimate Contact' Principle: If the child is under 5, the court almost always keeps them with the mother.

TIMELINE:
Expect 6-12 months. If you lose, appeal to the Supreme Court of India immediately.`
    },
    {
        id: 'template-letter-congress', entryType: 'template',
        name: 'Advocacy: Letter to Elected Representative',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['Political', 'Advocacy', 'Congress', 'Pressure'],
        summary: 'When the legal system fails, you need political pressure. Use this to ask your Representative/Senator/MP to inquire on your behalf.',
        fullText: `TO: The Honorable [REPRESENTATIVE/SENATOR NAME]

RE: CONSTITUENT CRISIS - International Kidnapping of [CHILD'S NAME]

I am a constituent requesting your urgent assistance regarding the international abduction of my child.

CASE STATUS:
- Date Abducted: [DATE]
- Destination: [COUNTRY]
- Current Status: STALLED due to [REASON]

THE ASK:
Please submit a formal inquiry to the Department of State asking:
1. Why has the Central Authority failed to meet the 6-week deadline?
2. What diplomatic pressure is being applied?
3. Can the Ambassador raise this case with the Ministry of Foreign Affairs?

Attached is a Privacy Release Form to allow you to access my file.

Sincerely,
[YOUR NAME]`
    },
    {
        id: 'checklist-recovery-logistics', entryType: 'procedure',
        name: "Logistics: The 'Go-Bag' for International Recovery",
        countryPair: 'General', resourceType: 'Checklist',
        tags: ['Recovery', 'Logistics', 'Checklist', 'Travel', 'Safety'],
        summary: 'You won the court order. You are flying to get your child. What do you physically need to bring?',
        fullText: `THE RECOVERY DEPLOYMENT CHECKLIST

DOCUMENTS (The 'Red Folder'):
[ ] Certified Copy of the Return Order (Translated and Apostilled)
[ ] Child's Birth Certificate (Original)
[ ] Your Custody Order (Home Country)
[ ] Letter from Central Authority
[ ] Police Report from Home Country

COMMUNICATIONS:
[ ] Burner Phone or Local SIM
[ ] Printed contact list (Lawyer, Embassy, Police)
[ ] Power Bank (20,000mAh)

CHILD CARE:
[ ] Photos of you and the child together
[ ] A letter from grandparents
[ ] Snacks/Comfort Object from home

SAFETY:
[ ] Door Stop Alarm (for your hotel room)
[ ] AirTags: Place in the child's jacket immediately

FLIGHT:
[ ] Direct Flight home if possible
[ ] Notify the airline 'Special Assistance' desk`
    },
    {
        id: 'template-interpol-red-withdrawal', entryType: 'template',
        name: 'Legal: Offer to Withdraw Interpol Red Notice (Leverage)',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['Negotiation', 'Leverage', 'Criminal', 'Interpol', 'Settlement'],
        summary: 'The Red Notice is your biggest bargaining chip. This letter uses it to negotiate a voluntary return.',
        fullText: `CONFIDENTIAL SETTLEMENT COMMUNICATION

TO: Counsel for [ABDUCTOR]

RE: PROPOSAL FOR VOLUNTARY RETURN AND WARRANT RECALL

A Federal Warrant has been issued and an INTERPOL Red Notice is active. Your client is effectively trapped in [COUNTRY].

WE OFFER THE FOLLOWING:
If [ABDUCTOR] voluntarily returns [CHILD] to [HOME AIRPORT] by [DATE]:
1. Jointly petition to recall the Federal Warrant.
2. Request deletion of the Interpol Red Notice immediately upon arrival.
3. Consent to a 'No Arrest' order for civil contempt proceedings.

IF REJECTED:
Full extradition requests and damages for civil conspiracy against all funding parties.

This offer expires in 72 hours.

Sincerely,
[YOUR NAME/LAWYER]`
    },
    {
        id: 'guide-germany-enforcement', entryType: 'country_matrix',
        name: 'Country Strategy: Germany (Section 170 Enforcement)',
        countryPair: 'Germany', resourceType: 'Country Strategy',
        tags: ['Germany', 'Enforcement', 'Legal', 'Europe', 'Strategy'],
        summary: "Germany has a specific enforcement mechanism (FamFG). Understanding 'Ordnungsgeld' vs 'Zwangsgeld' is key.",
        fullText: `STRATEGIC OVERVIEW: ENFORCEMENT IN GERMANY

Winning the Hague case in Germany is Step 1. Getting the child is Step 2.

THE LEGAL MECHANISM (FamFG Section 88-90):

1. ORDNUNGSGELD (Administrative Fine):
Court fines them. Often ineffective if the abductor has no money.

2. ZWANGSHAFT (Coercive Detention):
The court puts the parent in jail until they reveal the child's location or hand them over. The most effective tool.

3. UNMITTELBARER ZWANG (Direct Force - Section 90):
Authorizes the Jugendamt and Police to take the child by force.
CRITICAL: You must ask the judge to include permission to enter the residence and search for the child in the original return order.

TIMING:
Enforcement is stayed if an appeal is filed unless you ask for 'Sofortige Wirksamkeit' (Immediate Effectiveness). ALWAYS ask for this.`
    },
    {
        id: 'template-victim-impact', entryType: 'template',
        name: 'Legal: Victim Impact Statement (For Sentencing)',
        countryPair: 'General', resourceType: 'Court Document',
        tags: ['Criminal', 'Sentencing', 'Court', 'Victim Rights'],
        summary: 'If the abductor is caught and prosecuted, you will write a statement for the judge.',
        fullText: `VICTIM IMPACT STATEMENT

Your Honor,

I am the parent of [CHILD]. The defendant's decision to kidnap our child was not an act of love; it was an act of cruelty.

FINANCIAL IMPACT:
I have spent $[AMOUNT] on legal fees, investigators, and travel — money meant for [CHILD]'s college education.

EMOTIONAL IMPACT ON CHILD:
Since returning, [CHILD] suffers from separation anxiety, nightmares, and trusts no one. They were told I was dead.

EMOTIONAL IMPACT ON ME:
For [NUMBER] days, I did not know if my child was alive. I lost my job. I lost years of memories.

SENTENCING REQUEST:
I ask the Court to impose the maximum sentence to send a message that children are not property to be stolen. I also request full Restitution.

Respectfully,
[YOUR NAME]`
    },
    {
        id: 'guide-philippines-custody', entryType: 'country_matrix',
        name: 'Country Strategy: US to Philippines (Article 213)',
        countryPair: 'US-Philippines', resourceType: 'Country Strategy',
        tags: ['Philippines', 'Hague', 'Asia', 'Strategy'],
        summary: "Philippines is a Hague partner but returns are rare due to the 'Tender Years' doctrine.",
        fullText: `STRATEGIC OVERVIEW: ABDUCTION TO PHILIPPINES

THE MAJOR OBSTACLE: ARTICLE 213 (FAMILY CODE)
"No child under seven shall be separated from the mother unless the court finds compelling reasons."

This domestic law often clashes with the Hague Convention.

STRATEGY:
1. ARGUE TREATY SUPREMACY: The Hague Convention supersedes the Family Code based on 'Pacta Sunt Servanda'.
2. PROVE 'COMPELLING REASONS' if child is under 7.
3. IMMIGRATION LEVERAGE: Report the child's visa overstay to the Bureau of Immigration.

CONTACT:
- DOJ Philippines: oca@doj.gov.ph`
    },
    {
        id: 'template-demarche', entryType: 'template',
        name: "Diplomacy: Request for Embassy 'Demarche'",
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['Diplomacy', 'Politics', 'Demarche', 'State Dept'],
        summary: "When the legal system is stalled, ask your State Department to issue a 'Demarche' (Diplomatic Note) to the foreign government.",
        fullText: `TO: The Ambassador of [YOUR COUNTRY] to [DESTINATION COUNTRY]

SUBJECT: REQUEST FOR DIPLOMATIC DEMARCHE - Case of [CHILD'S NAME]

Despite a Hague Convention filing on [DATE], the [DESTINATION] Central Authority/Court has failed to comply with the treaty timeline.

Current delay: [NUMBER] months.

I respectfully request that the Embassy issue a Diplomatic Demarche (Note Verbale) to the Ministry of Foreign Affairs of [DESTINATION].

Please express concern regarding the systemic delays and remind the host government of their obligations under Article 11 of the Hague Convention.

This is not a private legal matter; it is a failure of treaty compliance between our two nations.

Sincerely,
[YOUR NAME]`
    },
    {
        id: 'template-pro-se-filing', entryType: 'template',
        name: 'Legal: Notice of Pro Se Appearance (Self-Representation)',
        countryPair: 'US', resourceType: 'Court Document',
        tags: ['Legal', 'Pro Se', 'Court Document', 'Financial'],
        summary: 'If you run out of money and must represent yourself, file this immediately.',
        fullText: `NOTICE OF PRO SE APPEARANCE

CASE NO: [NUMBER]

TO THE CLERK OF THE COURT AND ALL PARTIES:

PLEASE TAKE NOTICE that the Petitioner, [YOUR NAME], will appear Pro Se (representing themselves) in this matter effective immediately.

Please direct all future notices to:
Address: [FULL ADDRESS]
Email: [EMAIL]
Phone: [PHONE]

(Note: While Pro Se is hard, it is better than having no voice. Judges often give leeway to parents fighting for their children. Be respectful, be organized, and cite the 'Best Interests of the Child'.)

[YOUR SIGNATURE]
[DATE]`
    },
    {
        id: 'template-digital-service-edr', entryType: 'template',
        name: 'Digital: Emergency Disclosure Request (Google/Meta)',
        countryPair: 'US', resourceType: 'Legal Filing',
        tags: ['Digital', 'Tracing', 'Google', 'Meta', 'Police', 'Investigation'],
        summary: 'How to get IP addresses from Google/Facebook using the Emergency Disclosure Request. Must come from Law Enforcement.',
        fullText: `EMERGENCY DISCLOSURE REQUEST (EDR) GUIDE

Tech companies can use an EDR in cases involving danger to a child.

WHO SENDS THIS:
It must come from Law Enforcement. Print this and give it to your Detective.

THE REQUEST FORMAT:
To: LERS (Law Enforcement Response System) - Google/Meta

"I, [DETECTIVE NAME], certify that this request regards an emergency involving danger of death or serious physical injury to a minor child, [NAME].

TARGET ACCOUNT: [EMAIL/URL]

DATA REQUESTED:
1. Recent Login IP Addresses (Last 30 days).
2. Associated Recovery Phone Numbers.
3. Location History / GPS coordinates.

JUSTIFICATION:
The subject has abducted a child to a foreign jurisdiction. The child's location is unknown."

NOTE: If the detective is slow, have your lawyer subpoena the data (takes 30+ days). The EDR takes 24 hours.`
    },
    {
        id: 'guide-article12-settled', entryType: 'guidance',
        name: "Legal: Article 12 'Settled' Defense (Detailed Analysis)",
        countryPair: 'General', resourceType: 'Legal Filing',
        tags: ['Hague', 'Article 12', 'Settled', 'Legal', 'Defense'],
        summary: "If the child has been gone >1 year, the court can refuse return if the child is 'settled'. You must attack the quality of that settlement.",
        fullText: `DEFEATING THE ARTICLE 12 'SETTLED' DEFENSE

The Burden of Proof: The Abductor must prove the child is settled.

KEY ARGUMENTS:

1. EMOTIONAL vs PHYSICAL SETTLEMENT:
Mere physical presence is not enough. If the abductor has alienated the child from you, the child is living in psychological distress and cannot be considered 'settled'.

2. IMMIGRATION STATUS AS UNCERTAINTY:
If the abductor is on a tourist visa or illegally present, the child faces constant threat of deportation. One cannot be 'settled' on quicksand.

3. CONCEALMENT STOPS THE CLOCK:
Argue that the 1-year clock should be paused for periods where the abductor actively hid the child.

4. TRANSIENCE:
Show the court that the abductor has moved homes multiple times. This is not settlement; this is fugitive behavior.`
    },

    // ═══════════════════════════════════════════════════════
    //  SECTION 4: EXPANDED ACTION TEMPLATES & PROCEDURES
    // ═══════════════════════════════════════════════════════
    {
        id: 'kb_us_fbi_initial_report_email_v1', entryType: 'template',
        name: 'FBI Initial Report Email (International Parental Kidnapping / IPKCA)',
        countryPair: 'US', resourceType: 'Email Template',
        tags: ['us', 'fbi', 'ipkca', 'law_enforcement', 'urgent', 'missing_child', 'parental_abduction'],
        summary: 'Use this email to start a paper trail with your local FBI field office after you have filed a local police report. It requests case intake, preservation of evidence, and coordination with federal partners when a child has been wrongfully removed from or retained outside the U.S.',
        fullText: `Subject: URGENT — International Parental Kidnapping Report: [CHILD'S FULL NAME] (DOB [DOB]) — [CITY/STATE]

To: [FBI FIELD OFFICE PUBLIC EMAIL or TIP EMAIL] | CC: [LOCAL DETECTIVE EMAIL], [YOUR ATTORNEY EMAIL]
Attachments: (1) Photo of [CHILD] (2) Photo of [TAKING PARENT] (3) Court orders (4) Police report / incident number (5) Passport/ID info (6) Timeline (7) Contact/locator info

Hello,

I am reporting an international parental kidnapping / wrongful removal or retention involving my child, [CHILD'S FULL NAME], DOB [DOB]. I am the [LEFT-BEHIND PARENT / LEGAL GUARDIAN]. The taking parent/individual is [TAKING PARENT FULL NAME], DOB [DOB if known], passport/ID [# if known].

Summary of incident:
• Date/time last lawful custody/contact: [DATE/TIME]
• Type: [WRONGFUL REMOVAL / WRONGFUL RETENTION / ABDUCTION IN PROGRESS]
• Location last seen: [ADDRESS/CITY/STATE]
• Suspected destination country/city: [COUNTRY/CITY] (basis: [FLIGHT INFO / STATEMENTS / DIGITAL EVIDENCE])
• Local police report filed: [AGENCY], incident/case #[NUMBER], officer/detective [NAME], phone [PHONE]

Court / custody status:
• Current custody order (attached): [COURT], case #[CASE], dated [DATE]
• If no order: child's habitual residence is [CITY/STATE], and I have rights of custody under [STATE LAW / PARENTING PLAN / BIRTH CERTIFICATE]

Immediate requests:
1) Please open an FBI intake and advise next steps for federal involvement (including IPKCA evaluation where applicable).
2) Please coordinate with local law enforcement, DOJ (if appropriate), and relevant partners for international location efforts.
3) Please advise what evidence you need and how to transfer it securely. I can provide: phone records, iCloud/Google data exports, social media posts, banking/transaction logs, travel records, and witness statements.
4) If you cannot open a federal case at this time, please confirm the correct unit/point of contact and what additional facts are needed.

Child safety:
• Known risk factors: [THREATS / DV HISTORY / MENTAL HEALTH / SUBSTANCE / PRIOR ABDUCTION ATTEMPTS]
• Medical needs: [MEDS/CONDITIONS]
• Current passport status: [HAS U.S. PASSPORT / HAS FOREIGN PASSPORT / UNKNOWN]

My contact details:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
Current location/time zone: [CITY/COUNTRY]

Thank you for urgent assistance. This is time-sensitive, and I am available immediately for a call.

Respectfully,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_us_state_oci_inquiry_v1', entryType: 'template',
        name: 'U.S. State Department — Office of Children\'s Issues (OCI) Initial Inquiry Email',
        countryPair: 'US', resourceType: 'Email Template',
        tags: ['us', 'state_department', 'oci', 'hague', 'embassy', 'prevention', 'parental_abduction', 'urgent'],
        url: 'https://travel.state.gov/content/travel/en/contact-us/International-Parental-Child-Abduction.html',
        email: 'PreventAbduction1@state.gov',
        phone: '1-888-407-4747 / +1-202-501-4444',
        summary: 'Use this to initiate a case with the U.S. State Department Office of Children\'s Issues for prevention or active abduction/retention cases. It requests a case number, Hague guidance, and consular coordination.',
        fullText: `Subject: URGENT — International Parental Child Abduction Assistance Request: [CHILD'S FULL NAME] (DOB [DOB])

To: PreventAbduction1@state.gov
CC: [YOUR ATTORNEY EMAIL], [LOCAL DETECTIVE EMAIL]
Attachments: Court orders, birth certificate, passports (if available), photos, timeline, police report

Office of Children's Issues,

I am requesting immediate assistance regarding an international parental child abduction / wrongful retention involving my child, [CHILD'S FULL NAME], DOB [DOB]. Child's habitual residence is [CITY/STATE]. The taking parent/individual is [TAKING PARENT FULL NAME], DOB [DOB if known].

Case basics:
• Date of removal/retention: [DATE]
• Type: [WRONGFUL REMOVAL / WRONGFUL RETENTION / ABDUCTION IN PROGRESS / PREVENTION]
• Suspected destination: [COUNTRY/CITY]
• Current custody order: [YES/NO] (attached if yes)
• Local law enforcement report: [AGENCY], case #[NUMBER]

What I need from OCI:
1) Please open a case and provide a case number and assigned case officer.
2) Please advise whether the destination country is a Hague Abduction Convention partner with the U.S., and which process applies (Hague application vs non-Hague options).
3) If a Hague return application is appropriate, please confirm required forms/documents and where to submit them.
4) If prevention is still possible, please advise on immediate prevention actions (passport lookout, border alerts, consular notifications).
5) If the child is already abroad, please advise what consular welfare/whereabouts checks are feasible and how OCI coordinates with the U.S. Embassy/Consulate.

Key identifiers (if known):
• Child passport(s): [U.S. #] / [FOREIGN #] / [UNKNOWN]
• Taking parent passport(s): [#] / [UNKNOWN]
• Travel info: [AIRLINE/FLIGHT/PNR], [DATE/TIME], [ENTRY POINT]

Safety concerns:
• [LIST CONCERNS CLEARLY — threats, medical needs, prior attempts, DV allegations, etc.]
• Requested confidentiality: Please do not share my location/contact info with the taking parent without my written consent.

My contact information:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
[MAILING ADDRESS]
Best times to call: [WINDOWS], time zone [TZ]

Thank you for your urgent help. Please confirm receipt and next steps.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_hague_central_authority_cover_letter_v1', entryType: 'template',
        name: 'Hague Convention Return Application — Central Authority Cover Letter',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['hague', 'central_authority', 'return_application', 'international', 'urgent', 'legal'],
        summary: 'Use this cover letter when submitting a Hague 1980 Child Abduction Convention return application to your home country\'s Central Authority. It frames the request, lists attachments, and demands time-sensitive action.',
        fullText: `COVER LETTER — HAGUE CONVENTION 1980 RETURN APPLICATION

To: [YOUR COUNTRY'S CENTRAL AUTHORITY NAME AND ADDRESS]
From: [YOUR FULL NAME], Applicant / Left-Behind Parent
Date: [DATE]
Re: Application for Return of [CHILD'S FULL NAME], DOB [DOB]

Dear Central Authority,

I am submitting a formal application under the Hague Convention on the Civil Aspects of International Child Abduction (1980) for the return of my child, [CHILD'S FULL NAME], who was wrongfully [REMOVED FROM / RETAINED OUTSIDE] [HOME COUNTRY] by [TAKING PARENT FULL NAME] on or about [DATE].

1. SUMMARY OF FACTS:
• Child's habitual residence immediately before the wrongful removal/retention: [CITY, STATE/PROVINCE, COUNTRY]
• Destination country where child is now believed to be: [COUNTRY, CITY if known]
• Basis for my rights of custody: [COURT ORDER dated [DATE], case #[NUMBER] / OPERATION OF LAW under [STATUTE] / PARENTING AGREEMENT dated [DATE]]
• I was exercising my custody rights at the time of the removal/retention.
• I did NOT consent to the removal/retention.

2. ATTACHMENTS (enclosed):
□ Completed Hague Application Form (if your Central Authority provides one)
□ Certified copy of custody order (with certified translation if not in official language)
□ Child's birth certificate
□ Recent photograph of the child (within 6 months)
□ Recent photograph of the taking parent
□ Copy of relevant passport pages (child and taking parent, if available)
□ Police report / incident number from [AGENCY], case #[NUMBER]
□ Evidence of habitual residence (school enrollment, medical records, lease/mortgage, utility bills)
□ Evidence of the wrongful removal/retention (flight records, communications, witness statements)
□ Declaration / affidavit of the applicant (attached separately)
□ Any known address or location information for the taking parent abroad
□ Marriage certificate / divorce decree (if applicable)
□ Proof of nationality of the child

3. URGENCY:
This matter is extremely time-sensitive. Under Article 11 of the Convention, judicial or administrative authorities must act expeditiously, and Article 12 provides the strongest basis for return if proceedings commence within one year of the wrongful removal or retention. The one-year date in this case is [DATE]. I respectfully request that the Central Authority transmit this application to the Requested State's Central Authority without delay.

4. REQUESTS:
a) Please acknowledge receipt of this application in writing and provide a case/reference number.
b) Please transmit the application to the Central Authority of [DESTINATION COUNTRY] as soon as possible.
c) Please advise me of any additional documents or information required.
d) Please inform me of estimated processing times and any steps I can take to accelerate the process.
e) If there are concerns about the completeness of this application, please contact me immediately so I can remedy any deficiency.

5. CONTACT INFORMATION:
[YOUR FULL NAME]
[ADDRESS]
[PHONE — include country code]
[EMAIL]
Attorney (if any): [NAME], [FIRM], [PHONE], [EMAIL]

I am available at any time to provide additional information or attend any hearing. Thank you for your urgent attention to this matter.

Respectfully submitted,
[YOUR FULL NAME]
[SIGNATURE]
[DATE]`
    },
    {
        id: 'kb_embassy_welfare_check_request_email_v1', entryType: 'template',
        name: 'Embassy / Consulate Welfare and Whereabouts Check Request (Child Abroad)',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['embassy', 'consulate', 'welfare_check', 'whereabouts', 'urgent', 'international', 'hague'],
        summary: 'Use this email to request a welfare and whereabouts check through your embassy/consulate when your child is believed to be in a foreign country. It asks for consular limitations to be stated clearly and requests written confirmation of actions taken.',
        fullText: `Subject: URGENT — Welfare and Whereabouts Check Request: [CHILD'S FULL NAME] (DOB [DOB]) — [YOUR COUNTRY] Citizen

To: [EMBASSY/CONSULATE EMAIL — e.g., AmCitCity@state.gov or consular.cityname@fco.gov.uk]
CC: [CENTRAL AUTHORITY / OCI EMAIL], [YOUR ATTORNEY EMAIL]
Attachments: (1) Photo of child (2) Photo of taking parent (3) Court orders (4) Birth certificate (5) Police report (6) Privacy waiver (if required)

Dear Consular Officer,

I am the [MOTHER/FATHER/LEGAL GUARDIAN] of [CHILD'S FULL NAME], a [YOUR COUNTRY] citizen, DOB [DOB], passport #[NUMBER if known]. I am requesting an urgent welfare and whereabouts check.

1. SITUATION:
My child was [WRONGFULLY REMOVED / WRONGFULLY RETAINED] by [TAKING PARENT FULL NAME] on [DATE]. The child is believed to be located at or near: [ADDRESS / CITY / REGION, COUNTRY]. Basis for this belief: [EXPLAIN — e.g., phone records, social media, family contacts, flight records].

2. CONCERNS:
• Physical safety: [DESCRIBE — e.g., history of domestic violence, substance abuse, mental health, threats made]
• Medical needs: [DESCRIBE — e.g., child requires medication for asthma, ADHD, allergies; prescription attached]
• Psychological welfare: [DESCRIBE — e.g., child may be told the left-behind parent is dead/does not care; parental alienation suspected]
• Education: [DESCRIBE — e.g., child has not been enrolled in school; child was removed mid-term]

3. WHAT I AM REQUESTING:
a) Please attempt to locate the child and confirm the child's physical safety and living conditions.
b) If the child is located, please observe and report on the child's apparent health, emotional state, and environment.
c) Please deliver the following message to the child (if age-appropriate): "Your [mother/father] loves you very much and is working to [bring you home / see you soon]."
d) Please provide a written report of the visit, including date, time, location, persons present, observations, and any statements made by the taking parent.
e) Please advise me in writing of any limitations on what the consulate can and cannot do in this situation.
f) If the taking parent refuses access or is not found at the address, please document the attempt and advise on next steps.

4. LEGAL STATUS:
• Custody order: [YES — attached / NO — rights arise by operation of law under [STATUTE/COUNTRY]]
• Hague application filed: [YES — case #[NUMBER] with [CENTRAL AUTHORITY] / NO — in preparation]
• Police report: [AGENCY], case #[NUMBER]
• NCIC/missing persons entry: [YES/NO]

5. CONFIDENTIALITY:
Please do NOT share my current address, phone number, or location with the taking parent without my written consent. I have attached a signed privacy waiver authorizing the consulate to access my case file.

6. MY CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE — include country code and best times to reach]
[EMAIL]
[MAILING ADDRESS]
Attorney: [NAME], [PHONE], [EMAIL]

Thank you for your urgent attention. I understand consular officers cannot enforce custody orders or compel access, but I am requesting every action within consular authority. Please confirm receipt and advise on expected timeline.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_attorney_engagement_request_email_v1', entryType: 'template',
        name: 'Attorney Engagement Email (International Child Abduction / Hague / Cross-Border Custody)',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['legal', 'attorney', 'hague', 'retainer', 'urgent', 'cross_border', 'custody'],
        summary: 'Use this to rapidly retain counsel. It requests conflict check, fee structure, emergency hearing readiness, and deliverables in the first 72 hours.',
        fullText: `Subject: URGENT RETAINER INQUIRY — International Child Abduction / Hague Convention Matter

To: [ATTORNEY NAME / FIRM INTAKE EMAIL]
From: [YOUR FULL NAME]
Date: [DATE]

Dear [ATTORNEY NAME / Intake Team],

I am seeking immediate legal representation in an international parental child abduction matter. Time is critical. I am writing to request a conflict check, confirm availability, and understand your fee structure so we can proceed as quickly as possible.

1. CASE SUMMARY:
• My child, [CHILD'S FULL NAME], DOB [DOB], was [WRONGFULLY REMOVED FROM / WRONGFULLY RETAINED OUTSIDE] [HOME COUNTRY/STATE] by [TAKING PARENT FULL NAME] on [DATE].
• The child is believed to be in [DESTINATION COUNTRY/CITY].
• Hague Convention status of destination country: [HAGUE PARTNER / NON-HAGUE / UNKNOWN]
• Existing custody order: [YES — from [COURT], case #[NUMBER], dated [DATE] / NO — rights by operation of law]
• Police report filed: [YES — [AGENCY], case #[NUMBER] / NO — filing today]
• Central Authority application filed: [YES — case #[NUMBER] / NO — need help preparing]

2. WHAT I NEED IN THE FIRST 72 HOURS:
a) Conflict check clearance — please confirm no conflict with [TAKING PARENT FULL NAME] or their known counsel [NAME if known].
b) Emergency custody motion / ex parte filing in [HOME COURT] to establish or confirm sole custody and travel restrictions.
c) Guidance on Hague Convention return application (if applicable) or alternative legal strategy for non-Hague country.
d) Coordination with foreign counsel in [DESTINATION COUNTRY] — do you have contacts, or should I retain separately?
e) Advice on evidence preservation (digital, financial, travel records).
f) Advice on passport revocation / issuance prevention and border alerts.

3. FEE STRUCTURE:
Please provide:
• Retainer amount and hourly rate
• Estimated cost range for the first phase (emergency filings + Hague application)
• Whether you offer payment plans or accept legal aid referrals
• Whether fees include foreign counsel coordination or if that is billed separately

4. MY AVAILABILITY:
I am available immediately for a phone or video consultation. I can provide all documents (court orders, birth certificate, police report, evidence of habitual residence, communications) within 24 hours of engagement.

5. CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE — include country code]
[EMAIL]
[CITY/STATE/COUNTRY and TIME ZONE]

If you are unable to take this case, I would appreciate a referral to another attorney experienced in international child abduction / Hague Convention matters in this jurisdiction.

Thank you for your urgent attention.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_school_records_hold_request_v1', entryType: 'template',
        name: 'School / Childcare Records Hold + Release Restriction Request',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['school', 'records', 'privacy', 'custody', 'abduction_prevention', 'evidence'],
        summary: 'Use this to stop a taking parent from obtaining school records or changing enrollment, and to request immediate copies for your legal case. Adapt for daycare, pediatric office, sports clubs, and tutoring centers.',
        fullText: `Subject: URGENT — Records Hold and Release Restriction: [CHILD'S FULL NAME] (DOB [DOB])

To: [SCHOOL PRINCIPAL NAME], [SCHOOL REGISTRAR / RECORDS OFFICE]
CC: [YOUR ATTORNEY EMAIL]
Attachments: (1) Custody order (2) Photo ID of requesting parent (3) Police report (if filed) (4) Court order restricting release (if available)

Dear [PRINCIPAL / REGISTRAR],

I am writing regarding my child, [CHILD'S FULL NAME], DOB [DOB], currently [enrolled in / formerly enrolled in] [SCHOOL NAME], grade [GRADE].

I am the child's [MOTHER / FATHER / LEGAL GUARDIAN]. I hold [SOLE / JOINT] legal custody pursuant to the attached court order from [COURT], case #[NUMBER], dated [DATE]. [If no order: I have parental rights under [STATE/COUNTRY] law as the child's [biological/adoptive] parent, as evidenced by the attached birth certificate.]

1. RECORDS HOLD — IMMEDIATE ACTION REQUESTED:
Please place an immediate administrative hold on all records for [CHILD'S FULL NAME]. Specifically:
a) Do NOT release transcripts, immunization records, or any educational records to any person or institution without my prior written consent.
b) Do NOT process any enrollment withdrawal or school transfer request without my prior written consent and verification against the attached custody order.
c) If any person (including [TAKING PARENT FULL NAME]) requests records or attempts to withdraw the child, please:
   - Deny the request pending verification
   - Record the name, contact information, and stated reason of the requesting party
   - Notify me immediately at [PHONE] and [EMAIL]
   - Notify the police if a police report has been filed (case #[NUMBER], [AGENCY], detective [NAME])

2. COPIES FOR MY LEGAL CASE:
Please provide me with certified copies of the following as soon as possible:
a) Complete cumulative file / educational records
b) Attendance records for the current and prior school year
c) Emergency contact cards (showing who is listed and when changes were made)
d) Any records of communication from [TAKING PARENT FULL NAME] regarding the child's enrollment, pickup authorization, or address changes
e) Any records requests received from other schools (domestic or international)

3. LEGAL BASIS:
Under [FERPA (US) / equivalent local privacy law], I am entitled to access my child's educational records as a parent with legal custody. The attached court order [does / does not] restrict the other parent's access. [If restricted: The other parent, [TAKING PARENT FULL NAME], is NOT authorized to receive records under the terms of the attached order.]

4. ONGOING NOTIFICATION:
If at any future date a records request is received from any school — especially from [SUSPECTED DESTINATION COUNTRY/CITY] — please treat this as an urgent lead and notify me and the police immediately. This may be the only way to locate my child.

5. CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
[ADDRESS]
Attorney: [NAME], [PHONE], [EMAIL]

Thank you for your cooperation. This is a child safety matter, and I appreciate your prompt attention.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_us_passport_prevent_issuance_email_v1', entryType: 'template',
        name: 'U.S. Passport Lookout / Prevent Issuance Request Email (CPIAP)',
        countryPair: 'US', resourceType: 'Email Template',
        tags: ['us', 'passport', 'cpiap', 'prevention', 'state_department', 'hague', 'urgent'],
        url: 'https://www.cbp.gov/travel/international-child-abduction-prevention-and-return-act',
        email: 'PreventAbduction1@state.gov',
        phone: '1-888-407-4747',
        summary: 'Use this to request abduction prevention actions related to U.S. passports and travel. It pairs with DS-3077 (Children\'s Passport Issuance Alert Program) and requests confirmation of receipt and instructions.',
        fullText: `Subject: URGENT — Passport Lookout / Prevent Issuance Request: [CHILD'S FULL NAME] (DOB [DOB])

To: PreventAbduction1@state.gov
CC: [YOUR ATTORNEY EMAIL]
Attachments: (1) Completed DS-3077 form (if available) (2) Custody order (3) Child's birth certificate (4) Photo of child (5) Police report (if filed) (6) Your photo ID

Office of Children's Issues / Passport Services,

I am requesting immediate action to prevent the issuance of a U.S. passport to my minor child and/or to place a lookout on any existing passport. This is an abduction prevention matter.

1. CHILD INFORMATION:
• Full legal name: [CHILD'S FULL NAME]
• Date of birth: [DOB]
• Place of birth: [CITY, STATE]
• Social Security Number (last 4): [XXXX] (full number available upon secure request)
• Current U.S. passport: [YES — #[NUMBER], issued [DATE], expires [DATE] / NO / UNKNOWN]
• Foreign passport: [YES — [COUNTRY], #[NUMBER] / NO / UNKNOWN]

2. TAKING PARENT / PERSON OF CONCERN:
• Full name: [TAKING PARENT FULL NAME]
• DOB: [DOB if known]
• Relationship to child: [MOTHER / FATHER / OTHER]
• Citizenship(s): [LIST]
• Current location: [IF KNOWN]

3. WHAT I AM REQUESTING:
a) CPIAP Enrollment: Please enroll [CHILD'S FULL NAME] in the Children's Passport Issuance Alert Program (CPIAP) so that I am notified before any passport is issued or renewed.
b) Prevent Issuance: If a passport application is currently pending or is submitted for [CHILD], please deny or hold the application and notify me immediately.
c) Passport Lookout: If the child already has a U.S. passport, please place a lookout so that any attempt to use it at a port of entry triggers an alert.
d) Revocation Guidance: If circumstances warrant revocation of the child's existing U.S. passport, please advise on the process and what court orders or documentation are needed.

4. LEGAL BASIS:
• I hold [SOLE / JOINT] legal custody pursuant to [COURT ORDER from [COURT], case #[NUMBER], dated [DATE]].
• Under 22 CFR 51.28, both parents must consent to passport issuance for a minor under 16. I have NOT consented and do NOT consent to passport issuance.
• [If applicable: The custody order specifically prohibits international travel without my consent / requires passport surrender to the court.]

5. URGENCY:
[Explain why this is urgent — e.g., "The other parent has stated an intent to leave the country," "The other parent has purchased tickets," "A foreign passport has already been obtained," "I have reason to believe the other parent is at or traveling to a passport agency."]

6. CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
[MAILING ADDRESS]
Attorney: [NAME], [PHONE], [EMAIL]

Please confirm receipt of this request, confirm enrollment in CPIAP, and advise on any additional steps. I am available immediately.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_interpol_yellow_notice_request_via_police_v1', entryType: 'template',
        name: 'INTERPOL Yellow Notice Request Template (To Your Police / National Central Bureau)',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['interpol', 'yellow_notice', 'law_enforcement', 'missing_child', 'parental_abduction', 'international'],
        url: 'https://www.interpol.int/en/How-we-work/Notices/Yellow-Notices',
        summary: 'Use this to ask your local detective/prosecutor to pursue an INTERPOL Yellow Notice. Individuals typically cannot request notices directly; law enforcement submits through the country\'s National Central Bureau.',
        fullText: `Subject: REQUEST — INTERPOL Yellow Notice for Missing/Abducted Child: [CHILD'S FULL NAME] (DOB [DOB])

To: [DETECTIVE NAME / INVESTIGATING OFFICER], [POLICE DEPARTMENT / AGENCY]
CC: [YOUR ATTORNEY EMAIL], [NATIONAL CENTRAL BUREAU EMAIL if known]
Attachments: (1) High-resolution photo of child (within 6 months) (2) Photo of taking parent (3) Police report / case number (4) Custody order (5) Passport copies (6) Flight/travel info (7) Timeline of events

Dear [DETECTIVE / OFFICER NAME],

I am writing in connection with the active investigation into the international parental abduction of my child, [CHILD'S FULL NAME], DOB [DOB], your case/incident #[NUMBER].

I am requesting that your department submit a request for an INTERPOL Yellow Notice (Missing Person — Minor) through [YOUR COUNTRY]'s National Central Bureau (NCB). The purpose of a Yellow Notice is to alert law enforcement agencies worldwide to help locate a missing person, in this case a child believed to have been wrongfully removed to or retained in a foreign country.

1. WHY A YELLOW NOTICE IS APPROPRIATE:
• The child's location is unknown or unconfirmed, believed to be in [COUNTRY/REGION].
• The child was wrongfully [REMOVED / RETAINED] on [DATE] by [TAKING PARENT FULL NAME].
• Domestic missing person entries (e.g., NCIC in the US, PNC in the UK) do not reach law enforcement in the destination country.
• A Yellow Notice would enable border checks, local police awareness, and coordination with INTERPOL member countries.

2. DATA I CAN PROVIDE FOR THE NOTICE:
• Child's full name, DOB, nationality, passport number(s), physical description, recent photo
• Taking parent's full name, DOB, nationality, passport number(s), photo
• Circumstances of disappearance: date, location, suspected destination, method of travel
• Case reference numbers (police, court, Central Authority)
• Any known aliases, addresses, or contacts abroad

3. WHAT I AM ASKING YOU TO DO:
a) Please submit the Yellow Notice request to the NCB ([NCB name/agency in your country]) with the supporting data and documentation I have provided.
b) If a Red Notice (for the taking parent) is also warranted based on an outstanding arrest warrant, please advise whether that can be submitted concurrently.
c) Please confirm the timeline for submission and expected processing time.
d) If there are any barriers to submission (e.g., no arrest warrant, jurisdictional issues), please advise what is needed so I can work with my attorney to address them.

4. LEGAL CONTEXT:
• Custody order: [COURT], case #[NUMBER], dated [DATE] — attached
• [Hague application filed: YES/NO — case #[NUMBER]]
• [Arrest warrant issued: YES/NO — if yes, warrant #[NUMBER] from [COURT/JURISDICTION]]

5. URGENCY:
Every day that passes without international law enforcement awareness increases the risk that the child will be moved to a third country, enrolled under a different name, or otherwise become harder to locate. I respectfully ask that this be treated as a priority.

6. MY CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
Attorney: [NAME], [PHONE], [EMAIL]

Thank you for your continued work on this case. I am available at any time to provide additional information.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_foreign_attorney_outreach_email_v1', entryType: 'template',
        name: 'Foreign Attorney Outreach Email (Destination Country Counsel)',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['foreign_counsel', 'destination_country', 'hague', 'non_hague', 'injunction', 'urgent'],
        summary: 'Use this to contact attorneys in the destination country for Hague filings, local custody motions, injunctions, or enforcement. It requests rapid intake, translator support, and a concrete first-week plan.',
        fullText: `Subject: URGENT — International Child Abduction / Hague Convention — Seeking Immediate Representation in [DESTINATION COUNTRY]

To: [FOREIGN ATTORNEY NAME / FIRM EMAIL]
From: [YOUR FULL NAME]
Date: [DATE]

Dear [ATTORNEY NAME / Firm],

I am a [YOUR COUNTRY] national seeking urgent legal representation in [DESTINATION COUNTRY] in connection with the international parental abduction of my child.

1. CASE SUMMARY:
• Child: [CHILD'S FULL NAME], DOB [DOB], nationality [NATIONALITY/IES]
• Taking parent: [TAKING PARENT FULL NAME], DOB [DOB if known], nationality [NATIONALITY/IES]
• Date of wrongful removal/retention: [DATE]
• Believed location: [CITY/REGION, DESTINATION COUNTRY]
• Hague Convention status: [DESTINATION COUNTRY is / is not a Hague partner with [YOUR COUNTRY]]
• Current legal proceedings: [Hague application filed with [CENTRAL AUTHORITY], case #[NUMBER] / Custody order from [HOME COURT], case #[NUMBER] / None yet]

2. WHAT I NEED FROM YOU:
a) Conflict check — please confirm no conflict with [TAKING PARENT FULL NAME] or their known counsel.
b) If Hague applies: Representation in the Hague return proceedings before [COURT TYPE in DESTINATION COUNTRY]. Please advise on local procedure, expected timeline, and whether legal aid is available.
c) If non-Hague: Advice on the best legal mechanism to seek return or custody (e.g., habeas corpus, local custody filing, wardship application, injunction against removal to a third country).
d) Emergency injunctive relief: Can we obtain an immediate order preventing the taking parent from moving the child out of [CITY/COUNTRY] or changing the child's name/passport?
e) Translator/interpreter: I [DO / DO NOT] speak [LANGUAGE]. Please confirm whether your firm can conduct business in English or provide translation support.
f) Coordination with my home-country attorney: My attorney in [HOME COUNTRY] is [NAME], [FIRM], [EMAIL], [PHONE]. Please coordinate directly as needed.

3. FIRST-WEEK DELIVERABLES I AM HOPING FOR:
• Day 1-2: Conflict check, engagement letter, initial case assessment
• Day 2-3: Emergency filing (injunction, travel ban, border alert) if warranted
• Day 3-5: Begin Hague return application locally or file custody/habeas petition
• Ongoing: Regular updates (at least 2x/week) by email with copies to my home attorney

4. FEE STRUCTURE:
Please provide:
• Retainer amount and hourly/flat fee structure
• Estimated total cost for the first phase (emergency + return hearing)
• Accepted payment methods (wire, credit card, escrow)
• Whether legal aid or pro bono referral is available for international abduction cases

5. MY CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE — include country code]
[EMAIL]
[TIME ZONE]

I can provide all supporting documents (custody order, birth certificate, police report, Hague application, evidence of habitual residence, communications) within 24 hours of engagement.

Thank you for your urgent consideration. If you are unable to take this case, I would be grateful for a referral to a colleague experienced in child abduction / Hague Convention matters.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_court_expedite_hearing_letter_v1', entryType: 'template',
        name: 'Judge/Court Letter Requesting Expedited Hearing (Emergency Custody / Travel Restriction)',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['court', 'expedite', 'emergency', 'ne_exeat', 'custody', 'abduction_prevention', 'legal'],
        summary: 'Use this as a cover letter when filing an emergency motion to expedite a hearing due to credible international flight risk or active abduction. It focuses on urgency and procedural requests rather than arguing the full case.',
        fullText: `[YOUR NAME or ATTORNEY NAME]
[ADDRESS]
[PHONE] | [EMAIL]
[DATE]

The Honorable [JUDGE NAME]
[COURT NAME]
[COURT ADDRESS]

Re: [CASE NAME], Case No. [NUMBER]
LETTER REQUESTING EXPEDITED HEARING — EMERGENCY CUSTODY / TRAVEL RESTRICTION

Dear Judge [NAME],

I am writing on behalf of [PETITIONER NAME] to respectfully request that this Court schedule an expedited hearing on the Emergency Motion for [TEMPORARY SOLE CUSTODY / TRAVEL RESTRICTION / NE EXEAT ORDER / PASSPORT SURRENDER] filed [TODAY / on DATE].

1. REASON FOR URGENCY:
There is a credible and imminent risk that the Respondent, [RESPONDENT NAME], will [REMOVE THE CHILD FROM THE JURISDICTION / FLEE TO A FOREIGN COUNTRY / FAIL TO RETURN THE CHILD FROM TRAVEL]. The basis for this belief includes:
• [SPECIFIC FACTS — e.g., one-way tickets purchased, employment terminated, assets liquidated, explicit threats, prior abduction attempts, foreign passport obtained without consent]
• [ADDITIONAL FACTS — e.g., family in [COUNTRY] prepared to receive, child's school records requested for transfer, social media posts indicating relocation]

2. CURRENT STATUS:
• The child, [CHILD'S FULL NAME], DOB [DOB], currently resides in this jurisdiction.
• [Existing custody order: YES / NO — if yes, describe. If no, describe custody rights.]
• [Police report filed: YES — [AGENCY], case #[NUMBER] / NO]
• [Other agencies involved: e.g., State Department, Central Authority, FBI]

3. WHAT WE ARE REQUESTING AT THE HEARING:
a) Temporary sole legal and physical custody to the Petitioner pending a full hearing.
b) An order prohibiting the Respondent from removing the child from [STATE / COUNTRY].
c) Surrender of all passports (child's and Respondent's) to the Clerk of Court or Petitioner's counsel within 24 hours.
d) Entry of the child into relevant alert systems (e.g., NCIC, CPIAP, port alerts).
e) A finding that removal would be wrongful under [APPLICABLE LAW — e.g., Hague Convention, UCCJEA, UCAPA, state statute].
f) Authorization for law enforcement to assist with enforcement of this order.

4. PROPOSED SCHEDULE:
We respectfully request a hearing within [24-72 HOURS / AS SOON AS PRACTICABLE]. We are prepared to proceed on any date and time convenient to the Court. We can appear [IN PERSON / BY VIDEO / BY PHONE].

5. SERVICE:
[We have served / will serve the Respondent by [METHOD] on [DATE].] [If ex parte is requested: We request that notice be waived due to the risk that alerting the Respondent will cause immediate flight.]

Thank you for the Court's urgent attention to this matter. The safety of a child is at stake, and every day of delay increases the risk of irreversible harm.

Respectfully submitted,
[YOUR NAME / ATTORNEY NAME]
[BAR NUMBER if applicable]
[FIRM NAME if applicable]`
    },
    {
        id: 'kb_bank_asset_freeze_request_v1', entryType: 'template',
        name: 'Bank / Financial Institution Notification + Account Freeze Request',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['bank', 'fraud', 'asset_freeze', 'evidence_preservation', 'legal', 'urgent'],
        summary: 'Use this to notify a bank of suspected fraud/theft related to an abduction (unauthorized withdrawals, joint account draining) and to request an immediate hold pending investigation and court orders.',
        fullText: `Subject: URGENT — Fraud Alert / Account Freeze Request — Account #[LAST 4 DIGITS] — Active Criminal Investigation

To: [BANK NAME] — Fraud Department / Security Department
CC: [YOUR ATTORNEY EMAIL]
Attachments: (1) Your photo ID (2) Police report (3) Custody/court order (if available) (4) Proof of account ownership/joint holder status

Dear Fraud/Security Team,

I am a [JOINT ACCOUNT HOLDER / AUTHORIZED SIGNER / ACCOUNT HOLDER] on account(s) ending in [LAST 4 DIGITS]. I am writing to report suspected unauthorized activity and to request an immediate freeze on the account(s) pending investigation.

1. WHAT HAPPENED:
On or about [DATE], [TAKING PARENT FULL NAME], who is [JOINT HOLDER / AUTHORIZED USER / HAS NO AUTHORIZATION], [WITHDREW / TRANSFERRED / LIQUIDATED] approximately $[AMOUNT] from the account without my knowledge or consent. I believe these funds are being used to facilitate the international abduction of our child, [CHILD'S FULL NAME].

2. ACTIVE INVESTIGATION:
A police report has been filed: [AGENCY], case/incident #[NUMBER], officer/detective [NAME], phone [PHONE]. [If applicable: An FBI investigation has also been opened, reference #[NUMBER].]

3. IMMEDIATE ACTIONS REQUESTED:
a) FREEZE: Place an immediate hard hold on all accounts where [TAKING PARENT FULL NAME] is listed as a joint holder, authorized signer, or beneficiary. No withdrawals, transfers, or card transactions should be permitted until further notice or court order.
b) EVIDENCE PRESERVATION: Preserve all records for the past [6-12] months, including:
   - Wire transfer details (SWIFT codes, IBAN numbers, recipient bank/country)
   - ATM withdrawal locations (including international locations and IP addresses for online banking)
   - Credit/debit card transaction details (merchant names, locations, dates, amounts)
   - Online banking login records (IP addresses, device identifiers, timestamps)
   - Any new accounts opened, beneficiary changes, or address changes
c) FOREIGN TRANSACTION ALERT: If any attempt is made to access these funds from [SUSPECTED COUNTRY] or any international location, please deny the transaction and log all location data.
d) STATEMENTS: Please provide me with certified copies of all account statements for the past [6-12] months.

4. LEGAL BASIS:
As a joint account holder, I have the right to restrict access to the account. [If court order exists: I have attached a court order from [COURT], case #[NUMBER], dated [DATE], which [FREEZES ASSETS / RESTRICTS THE OTHER PARTY'S ACCESS / ORDERS DISCLOSURE].] [If no court order yet: A court order is being sought and will be provided as soon as it is issued.]

5. CONTACT FOR LAW ENFORCEMENT:
Investigating officer: [DETECTIVE NAME], [AGENCY], [PHONE], [EMAIL]
Please cooperate fully with any subpoenas or preservation requests from this officer.

6. MY CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
[ADDRESS]
Attorney: [NAME], [PHONE], [EMAIL]

Please confirm receipt of this request and the actions taken. I am available immediately for identity verification or to provide additional documentation.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_insurance_notification_template_v1', entryType: 'template',
        name: 'Insurance Company Notification (Coverage, Travel, Dependent, Legal Assistance Add-ons)',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['insurance', 'case_management', 'dependent', 'documentation', 'international', 'urgent'],
        summary: 'Use this to notify insurers (health, travel, life, legal assistance riders) that a dependent is missing/abducted and to trigger any benefits, case management, or documentation preservation.',
        fullText: `Subject: URGENT — Notification of Missing/Abducted Dependent: [CHILD'S FULL NAME] (DOB [DOB]) — Policy #[NUMBER]

To: [INSURANCE COMPANY] — Claims / Customer Service / Case Management
CC: [YOUR ATTORNEY EMAIL]
Attachments: (1) Policy documents (2) Police report (3) Custody order (if available) (4) Child's birth certificate (5) Photo of child

Dear Claims/Case Management Team,

I am writing to notify you that my dependent child, [CHILD'S FULL NAME], DOB [DOB], covered under policy #[NUMBER], has been [ABDUCTED / IS MISSING / HAS BEEN WRONGFULLY REMOVED TO A FOREIGN COUNTRY] as of [DATE].

1. POLICY INFORMATION:
• Policyholder: [YOUR FULL NAME]
• Policy number: [NUMBER]
• Type of coverage: [HEALTH / TRAVEL / LIFE / LEGAL EXPENSES / HOME / OTHER]
• Dependent covered: [CHILD'S FULL NAME], DOB [DOB]

2. WHAT HAPPENED:
On [DATE], [TAKING PARENT FULL NAME] [REMOVED THE CHILD FROM / FAILED TO RETURN THE CHILD TO] [HOME COUNTRY/STATE]. The child is believed to be in [DESTINATION COUNTRY/CITY]. A police report has been filed ([AGENCY], case #[NUMBER]).

3. WHAT I AM REQUESTING:
a) COVERAGE CONFIRMATION: Please confirm what coverage applies to this situation, including:
   - Medical coverage for the child while abroad (emergency treatment, ongoing prescriptions)
   - Travel insurance benefits (trip interruption, emergency travel for recovery)
   - Legal expense coverage or legal assistance rider (attorney fees, court costs, Hague Convention proceedings)
   - Kidnap and ransom coverage (if applicable under the policy)
   - Counseling/therapy coverage for the child upon return and for the left-behind parent
b) CASE MANAGEMENT: If your policy includes case management or crisis assistance services, please activate them immediately and assign a case manager.
c) DOCUMENTATION PRESERVATION: Please preserve all records related to claims, communications, and policy changes involving [TAKING PARENT FULL NAME] for the past [12-24] months.
d) BENEFICIARY/POLICY CHANGE FREEZE: Please do NOT process any policy changes (beneficiary changes, cancellations, coverage modifications) requested by [TAKING PARENT FULL NAME] without my written consent.
e) CLAIMS HISTORY: Please provide me with a complete claims history for the child for the past [12-24] months, including any claims filed from foreign medical providers.

4. MEDICAL NEEDS:
The child has the following medical conditions/needs that may require urgent attention:
• [CONDITION — e.g., asthma, allergies, ADHD, diabetes]
• Current medications: [LIST]
• Prescribing physician: [NAME, PHONE]
• [If applicable: The child's medication supply would have run out approximately [DATE].]

5. CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
[ADDRESS]
Attorney: [NAME], [PHONE], [EMAIL]

Please confirm receipt and advise on next steps, required forms, and any applicable benefits or services. I am available immediately.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_hague_return_application_step_by_step_v1', entryType: 'procedure',
        name: 'How to File a Hague 1980 Return Application (Step-by-Step)',
        countryPair: 'General', resourceType: 'Legal Filing Guide',
        tags: ['hague', 'legal', 'return_application', 'central_authority', 'habitual_residence', 'procedure'],
        url: 'https://www.hcch.net/en/instruments/conventions/status-table/?cid=24',
        summary: 'A step-by-step guide for filing a Hague Convention return application through your home country Central Authority, including what documents to gather, how to frame habitual residence, and how to avoid common delays.',
        fullText: `HOW TO FILE A HAGUE 1980 RETURN APPLICATION — STEP-BY-STEP GUIDE

This guide walks you through the process of filing a Hague Convention return application when your child has been wrongfully removed to or retained in another country that is a Hague partner.

STEP 1: CONFIRM HAGUE APPLICABILITY
• Is the destination country a Hague Convention partner with your country? Check the HCCH status table: https://www.hcch.net/en/instruments/conventions/status-table/?cid=24
• Was the child under 16 at the time of removal/retention? (The Convention only applies to children under 16.)
• Did the removal/retention breach your custody rights under the law of the child's habitual residence?
• Were you actually exercising those custody rights at the time? (Even if you were away for work, that counts.)
• If YES to all: proceed. If NO to any: you may need a non-Hague strategy (local custody filing, habeas corpus, diplomatic channels).

STEP 2: IDENTIFY YOUR CENTRAL AUTHORITY
• Every Hague signatory has a "Central Authority" — the government agency responsible for processing applications.
• In the US: Office of Children's Issues (OCI), U.S. Department of State.
• In the UK: International Child Abduction and Contact Unit (ICACU).
• In Australia: Attorney-General's Department, Commonwealth Central Authority.
• Find yours: https://www.hcch.net/en/states/authorities
• You file with YOUR country's Central Authority (the "Requesting State"). They transmit it to the destination country's Central Authority (the "Requested State").

STEP 3: GATHER YOUR DOCUMENTS
Essential documents (provide originals or certified copies where possible):
□ Completed application form (your Central Authority may have a specific form, or use the model Hague application)
□ Custody order — certified copy, with certified translation if not in the language of the destination country
□ If no custody order: evidence of custody rights by operation of law (birth certificate showing parentage, proof of habitual residence, relevant statute citations)
□ Child's birth certificate
□ Recent photograph of the child (within 6 months, clear face)
□ Recent photograph of the taking parent
□ Passport copies — child and taking parent (if available)
□ Police report — with case/incident number
□ Evidence of habitual residence: school enrollment, medical records, lease/mortgage, utility bills, tax filings, daycare contracts, extracurricular registrations
□ Evidence of the wrongful removal/retention: flight records, communications (texts, emails, voicemails), witness statements, social media posts
□ Marriage certificate / divorce decree (if applicable)
□ Any previous court orders (protection orders, visitation orders, travel restriction orders)
□ Affidavit / declaration of the applicant (a sworn statement of facts)
□ If applicable: evidence of domestic violence, substance abuse, or safety concerns (this helps you prepare for a 13(b) defense)

STEP 4: ESTABLISH HABITUAL RESIDENCE
This is the single most important legal concept. "Habitual residence" means where the child was actually living and integrated before the removal.
• Strong evidence: school enrollment, medical provider visits, social activities, duration of residence (usually 6+ months), parental intent to remain
• Weak arguments to avoid: "The child has my country's passport" (not enough), "I wanted to move there eventually" (intent without action), "The child visited once" (visits are not habitual residence)
• If you recently moved countries together: this is complex. Courts look at shared parental intent and the child's degree of acclimatization.

STEP 5: FRAME YOUR APPLICATION
Your application should clearly state:
a) WHO: Applicant (you), child, respondent (taking parent)
b) WHAT: The wrongful removal or retention
c) WHEN: The date it occurred
d) WHERE: From the child's habitual residence to the destination country
e) WHY IT IS WRONGFUL: It breaches your custody rights under the law of the habitual residence, and you did not consent
f) WHAT YOU WANT: The return of the child to the country of habitual residence

STEP 6: SUBMIT AND FOLLOW UP
• Submit to your Central Authority by the method they require (some accept email, some require physical mail, some have online portals).
• Request written confirmation of receipt and a case/reference number.
• Ask for the name and contact details of your assigned case officer.
• Ask for the estimated timeline for transmission to the destination country.
• Mark your calendar: Under Article 11, if no decision has been made within 6 weeks, you (or your Central Authority) can request a statement of reasons for the delay.

STEP 7: AVOID COMMON DELAYS
• Missing translations: Get all documents translated and certified BEFORE submitting. This is the #1 cause of delay.
• Incomplete application: Fill in every field. If you do not know something, write "unknown" rather than leaving it blank.
• No evidence of habitual residence: Gather this proactively. Do not assume the court will take your word for it.
• Waiting too long: The one-year clock under Article 12 starts on the date of wrongful removal/retention. File as soon as possible — ideally within weeks, not months.
• Not retaining local counsel in the destination country: Your Central Authority transmits the application, but you may need a lawyer in the destination country to represent you in court. Start looking immediately.

STEP 8: PREPARE FOR DEFENSES
The taking parent will likely raise one or more of these defenses:
• Article 13(a): You consented or acquiesced to the removal. Counter: gather evidence showing you did NOT consent (texts, emails, police report).
• Article 13(b): Return would expose the child to grave risk. Counter: prepare "undertakings" (enforceable promises) and evidence that your home country can protect the child.
• Article 13 (child's objection): The child objects to return and is mature enough to be heard. Counter: argue the child has been coached/alienated; request independent psychological evaluation.
• Article 12 (settled): If more than one year has passed, the child is settled. Counter: argue the abductor concealed the child (tolling the clock) and the settlement is precarious (immigration status, frequent moves).

TIMELINE EXPECTATIONS:
• Central Authority processing: 1-4 weeks (varies widely by country)
• Transmission to destination country: 1-2 weeks after processing
• Court proceedings in destination country: 4-12 weeks (should be 6 weeks per Article 11, but many countries are slower)
• Total from filing to decision: 2-6 months in efficient countries; 6-18 months in slower ones
• If return is ordered: enforcement may take additional weeks depending on the country`
    },
    {
        id: 'kb_police_report_international_abduction_guide_v1', entryType: 'procedure',
        name: 'How to File a Police Report for International Parental Abduction',
        countryPair: 'General', resourceType: 'Legal Filing Guide',
        tags: ['police_report', 'law_enforcement', 'missing_child', 'interpol', 'evidence', 'procedure'],
        summary: 'A practical guide for creating a high-quality police report that supports cross-border actions (alerts, border checks, INTERPOL, Hague filings). Includes what to bring, what to insist on, and exact language to request.',
        fullText: `HOW TO FILE A POLICE REPORT FOR INTERNATIONAL PARENTAL ABDUCTION — PRACTICAL GUIDE

Filing a police report is often the first official step. A well-documented report supports every subsequent action: border alerts, NCIC entry, INTERPOL notices, Hague applications, and court filings. A poor report can set you back weeks.

BEFORE YOU GO TO THE STATION — PREPARE THESE:
□ Child's birth certificate (original or certified copy)
□ Custody order (if you have one) — certified copy
□ Recent photo of the child (clear face, within 6 months) — printed and digital
□ Recent photo of the taking parent — printed and digital
□ Child's passport information (number, issuing country, expiration) — or a note that the passport is missing/unknown
□ Taking parent's passport information (if known)
□ Travel information: airline, flight number, date, time, departure/arrival cities, PNR/booking reference
□ Timeline: a written, chronological summary of events (when you last saw the child, when you realized they were gone, what you have done since)
□ Evidence of premeditation (if any): screenshots of texts/emails, records of asset liquidation, employment resignation, passport applications
□ List of addresses where the taking parent might be found abroad (family, friends, former addresses)
□ Your identification (driver's license, passport)

AT THE STATION — WHAT TO SAY:
1. State clearly: "I am here to report an international parental child abduction. My child has been taken out of the country without my consent."
2. If the officer says "This is a civil matter" or "We cannot help with custody disputes":
   - Respond: "Under [APPLICABLE LAW — e.g., 18 U.S.C. § 1204 (IPKCA) in the US, Child Abduction Act 1984 in the UK, relevant state/national statute], taking a child across international borders in violation of custody rights is a criminal offense. I am requesting that a report be taken and the child be entered into [NCIC / the national missing persons database]."
   - If they still refuse: ask for the watch commander or duty sergeant. You have a right to file a report.
3. Use the word "ABDUCTION" not "custody dispute." Use "MISSING CHILD" not "taken by the other parent."
4. Provide all documents. Ask the officer to note each document in the report.

WHAT TO INSIST ON:
a) A written report with a case/incident number — do not leave without this number.
b) Entry into the national missing persons database:
   - US: NCIC (National Crime Information Center) — specifically the Missing Person File. Under Suzanne's Law (if child is under 21) and the PROTECT Act, law enforcement MUST enter the child into NCIC within 2 hours.
   - UK: PNC (Police National Computer)
   - Other countries: the equivalent national database
c) A port alert / border alert: Request that the child and taking parent be flagged at all ports of exit. In the US, this means CBP (Customs and Border Protection) notification.
d) Assignment of a detective/investigator: Ask who the assigned detective will be and get their direct phone number and email.
e) Classification: Insist the report be classified as a MISSING CHILD / PARENTAL ABDUCTION, not as a "civil dispute" or "family matter."

AFTER FILING — IMMEDIATE FOLLOW-UP:
1. Get a certified copy of the report (you will need it for court, Central Authority, embassy, FBI, etc.)
2. Confirm the NCIC/database entry was actually made (some officers say they will do it and forget — call back within 24 hours to verify).
3. Provide the case number to:
   - Your attorney
   - The Central Authority (if filing a Hague application)
   - The embassy/consulate
   - The school, pediatrician, and any other relevant institution
4. If the child may still be in transit or has just left: call the airport police and CBP (US) / Border Force (UK) / equivalent agency directly. Do not wait for the local police to relay the information.

COMMON MISTAKES TO AVOID:
• Waiting "a few days to see if they come back" — file IMMEDIATELY. Every hour matters for border alerts and flight interception.
• Accepting "we'll call you" — get a case number and detective assignment before you leave.
• Not bringing documents — the more you bring, the more seriously you are taken.
• Being emotional instead of factual — write your timeline in advance so you can present facts clearly.
• Not asking for NCIC entry (US) — this is your RIGHT, not a favor. Cite Suzanne's Law if needed.
• Filing only in the city where you live — if the child was taken from a different jurisdiction (e.g., from school in another city), file there too.`
    },
    {
        id: 'kb_us_ncic_entry_request_guide_v1', entryType: 'procedure',
        name: 'US: How to Request an NCIC Entry for a Missing/Abducted Child',
        countryPair: 'US', resourceType: 'Legal Filing Guide',
        tags: ['us', 'ncic', 'law_enforcement', 'ncmec', 'state_department', 'missing_child', 'procedure'],
        url: 'https://www.missingkids.org/footer/contactus',
        phone: '1-800-843-5678',
        summary: 'Explains how NCIC entry works, who can request it, and how to press for it through local law enforcement when a child is at risk of leaving the U.S. or already missing.',
        fullText: `US: HOW TO REQUEST AN NCIC ENTRY FOR A MISSING/ABDUCTED CHILD

WHAT IS NCIC?
The National Crime Information Center (NCIC) is the FBI's centralized database used by law enforcement agencies nationwide (and internationally through INTERPOL). When a child is entered into NCIC as a missing person, any law enforcement officer in the US (and many abroad) who encounters the child or the taking parent during a traffic stop, border crossing, or other interaction will receive an alert.

WHY IT MATTERS:
• NCIC is the backbone of US missing persons alerts. Without an entry, your child is invisible to law enforcement systems.
• CBP (Customs and Border Protection) uses NCIC to flag travelers at airports and land borders.
• NCIC entries are shared with INTERPOL, enabling international alerts.
• NCMEC (National Center for Missing & Exploited Children) receives NCIC data and can activate additional resources.

WHO CAN REQUEST AN NCIC ENTRY?
• Only law enforcement can enter a person into NCIC. You (as a parent) cannot do it directly.
• You request it through the police officer or detective handling your case.
• Under Suzanne's Law (42 U.S.C. § 5779) and the PROTECT Act, law enforcement MUST enter a missing child (under 21) into NCIC within 2 HOURS of receiving the report. There is NO waiting period.

HOW TO REQUEST IT — STEP BY STEP:

STEP 1: FILE A POLICE REPORT
• Go to your local police department (or the department with jurisdiction where the child was last seen).
• State: "My child has been abducted / is missing. I need to file a report and have the child entered into NCIC immediately."
• Provide: child's full name, DOB, physical description, photo, passport info, custody order, and all details about the taking parent and suspected destination.

STEP 2: SPECIFICALLY REQUEST NCIC ENTRY
• Say: "I am requesting that [CHILD'S NAME] be entered into the NCIC Missing Person File as a missing child — category: Involuntary (parental abduction)."
• NCIC categories for missing children:
  - Endangered Missing (EMC)
  - Involuntary Missing (parental abduction falls here)
  - Disabled Missing
  - Catastrophe Missing
• For parental abduction, request the "Involuntary" category, but if there are safety concerns (threats, DV, medical needs), also argue for "Endangered" to trigger a higher alert level.

STEP 3: VERIFY THE ENTRY WAS MADE
• Ask the officer: "Can you confirm the NCIC entry number and the date/time it was entered?"
• If they say they will "do it later," cite Suzanne's Law: under federal law, the entry must be made within 2 hours.
• Call back within 24 hours and ask to speak with the records division to confirm the entry is active.

STEP 4: REQUEST ADDITIONAL FLAGS
Once the NCIC entry is made, request:
a) TECS/CBP Alert: Ask the officer to also notify CBP (Customs and Border Protection) to flag the child and taking parent at all US ports of entry/exit. NCIC alone may not immediately trigger a CBP stop — a separate TECS entry may be needed.
b) State Department Notification: Notify the Office of Children's Issues (OCI) at 1-888-407-4747 and ask them to coordinate with CBP and passport services.
c) NCMEC Report: Call NCMEC at 1-800-843-5678 (1-800-THE-LOST) to file a report. NCMEC works with NCIC data and can provide additional support including posters, tip lines, and international outreach.

IF LAW ENFORCEMENT REFUSES OR DELAYS:
• Cite the law: "Under 42 U.S.C. § 5779 (Suzanne's Law), you are required to enter a missing child into NCIC within 2 hours. There is no waiting period for children."
• Ask for the watch commander, duty sergeant, or shift supervisor.
• If still refused: contact the FBI field office directly and report the abduction. The FBI can initiate its own NCIC entry and investigation.
• Contact NCMEC (1-800-843-5678) — they can also intervene and pressure local law enforcement to make the entry.
• Contact your state's Attorney General office if local police are uncooperative.

AFTER THE NCIC ENTRY:
• Provide the NCIC case number to your attorney, the Central Authority (if filing Hague), and the State Department.
• Update the entry if you get new information (new address, new travel plans, sightings).
• The entry must be renewed periodically — confirm with the entering agency how long the entry remains active and when it needs to be refreshed.`
    },
    {
        id: 'kb_emergency_custody_order_guide_v1', entryType: 'procedure',
        name: 'How to Get an Emergency Custody Order After Abduction (Quick Court Path)',
        countryPair: 'General', resourceType: 'Legal Filing Guide',
        tags: ['emergency_order', 'custody', 'travel_ban', 'ne_exeat', 'court', 'procedure', 'international'],
        summary: 'A jurisdiction-neutral guide to obtaining emergency custody and enforcement language that helps across borders, including passport surrender, travel bans, and law enforcement assistance.',
        fullText: `HOW TO GET AN EMERGENCY CUSTODY ORDER AFTER ABDUCTION — QUICK COURT PATH

When your child has been abducted or is at imminent risk of being taken, you need a court order FAST. This guide explains the general process across jurisdictions.

WHY YOU NEED THIS ORDER:
1. It establishes your custody rights on paper — critical for Hague applications, police enforcement, and embassy requests.
2. It can include travel restrictions, passport surrender, and law enforcement authorization.
3. It creates a "wrongful removal" finding that strengthens your Hague case (Article 3/15).
4. Without it, many agencies (police, border control, embassies) will say "this is a civil matter" and refuse to help.

STEP 1: DETERMINE THE RIGHT COURT
• File in the court that has jurisdiction over the child's habitual residence (where the child was living before the abduction).
• In the US: this is typically the Family Court or Superior Court in the county where the child lived. Under the UCCJEA, "home state" is the state where the child lived for at least 6 consecutive months before the abduction.
• In the UK: the Family Court or, for urgent international matters, the High Court (Family Division).
• In other countries: consult a local family law attorney. The key principle is the same — file where the child was living.

STEP 2: FILE AN EMERGENCY MOTION (EX PARTE IF NECESSARY)
• An "ex parte" motion is heard without the other parent present. Courts allow this when giving notice would cause the other parent to flee or hide the child.
• Your motion should request:
  a) TEMPORARY SOLE LEGAL AND PHYSICAL CUSTODY — to you, pending a full hearing.
  b) TRAVEL RESTRICTION / NE EXEAT ORDER — prohibiting the taking parent from removing the child from [STATE/COUNTRY].
  c) PASSPORT SURRENDER — all passports (child's and taking parent's) to be surrendered to the court clerk, your attorney, or a designated third party within 24 hours.
  d) LAW ENFORCEMENT ASSISTANCE — authorization for police to locate, recover, and return the child to you (sometimes called a "writ of assistance" or "collection order").
  e) BORDER ALERT — direction that the child be entered into relevant alert databases (NCIC, CPIAP, port alerts).
  f) FINDING OF WRONGFUL REMOVAL — a specific judicial finding that the removal was wrongful and in violation of your custody rights. This is critical for Hague Article 3 and Article 15 purposes.

STEP 3: WHAT YOUR MOTION MUST INCLUDE
• A sworn affidavit or declaration setting out the facts: who, what, when, where, and why it is an emergency.
• Evidence of habitual residence (school records, medical records, lease, utilities).
• Evidence of the abduction or flight risk (travel records, communications, witness statements, premeditation evidence).
• The custody order (if one exists) or a citation to the law that gives you custody rights.
• A statement explaining why notice to the other parent should be waived (if seeking ex parte relief).

STEP 4: GET IT HEARD FAST
• Call the court clerk and ask for the procedure for emergency/ex parte filings. Many courts have a specific "emergency motion" process or a duty judge available same-day.
• If the clerk says the next available hearing is weeks away, file a "letter to the judge" requesting expedited scheduling (see the Expedited Hearing Letter template in this knowledge base).
• In many jurisdictions, emergency custody motions in abduction cases can be heard within 24-72 hours.

STEP 5: SERVE THE ORDER
• Once the order is signed, it must be served on the taking parent (unless the judge waives service for ex parte orders).
• If the taking parent is abroad, service may be accomplished through:
  - The Hague Service Convention (if the destination country is a partner)
  - The embassy/consulate
  - Alternative service (email, social media) if the court permits
• Get certified copies of the signed order immediately — you will need multiple copies for police, embassy, airline, Central Authority, and your own records.

STEP 6: ENFORCE THE ORDER
• Provide certified copies to local police and border agencies.
• If the child is still in your country: law enforcement can execute the writ of assistance to recover the child.
• If the child is already abroad: the order supports your Hague application, embassy welfare checks, and INTERPOL requests.
• Consider getting the order "apostilled" (authenticated for international use) — many foreign courts and agencies require this.

KEY LANGUAGE TO INCLUDE IN YOUR ORDER:
• "The Court finds that the removal/retention of [CHILD] by [TAKING PARENT] was wrongful within the meaning of the Hague Convention on the Civil Aspects of International Child Abduction."
• "All law enforcement agencies are directed to assist in the recovery and return of the child."
• "All passports and travel documents for [CHILD] and [TAKING PARENT] shall be surrendered to [RECIPIENT] within 24 hours."
• "Neither parent shall remove the child from the jurisdiction of [STATE/COUNTRY] without prior written consent of the other parent or further order of this Court."`
    },
    {
        id: 'kb_us_ne_exeat_order_guide_v1', entryType: 'procedure',
        name: 'US: Ne Exeat / Travel Restriction Order Guide (Prevent Removal)',
        countryPair: 'US', resourceType: 'Legal Filing Guide',
        tags: ['us', 'ne_exeat', 'travel_restriction', 'court', 'passport', 'abduction_prevention', 'legal'],
        summary: 'Explains how to request a ne exeat-style order (or equivalent) in U.S. family court to restrict international travel, require passport surrender, and create enforceable consequences for attempted removal.',
        fullText: `US: NE EXEAT / TRAVEL RESTRICTION ORDER GUIDE — PREVENT REMOVAL

WHAT IS A NE EXEAT ORDER?
"Ne exeat" is Latin for "let them not leave." It is a court order that prohibits a person (typically a parent) from removing a child from the jurisdiction. In the US, while the term "ne exeat" is used in some states, the functional equivalent exists in every state through emergency travel restriction orders, UCAPA (Uniform Child Abduction Prevention Act) petitions, and standard custody orders with travel provisions.

WHEN TO SEEK THIS ORDER:
• You have credible evidence that the other parent is planning to take the child out of the country.
• The other parent has a history of non-compliance with court orders.
• The other parent has strong ties to a foreign country (citizenship, family, property) and weak ties to the US.
• The other parent has made threats to take the child.
• The other parent has obtained or applied for a foreign passport for the child without your consent.
• The other parent has liquidated assets, resigned from employment, or terminated a lease.
• Any UCAPA risk factors are present (see below).

UCAPA RISK FACTORS (Section 7):
The Uniform Child Abduction Prevention Act provides a specific framework. Many states have adopted it. Key risk factors include:
□ The parent has previously abducted or attempted to abduct the child
□ The parent has threatened to abduct the child
□ The parent has recently engaged in activities that may indicate a planned abduction (abandoned employment, sold home, terminated lease, liquidated assets, obtained travel documents, applied for passport)
□ The parent has a history of domestic violence, stalking, or child abuse
□ The parent has strong familial, emotional, or cultural ties to another country
□ The parent has no financial reason to stay in the US
□ The parent is not a US citizen and has no immigration status tying them here
□ The parent has a foreign custody order or proceeding pending
□ The destination country is not a Hague Convention partner, or has a poor enforcement record

WHAT YOUR PETITION SHOULD REQUEST:
a) TRAVEL RESTRICTION: An order prohibiting the respondent from removing the child from [STATE] and/or the United States without prior written consent of the petitioner or court order.
b) PASSPORT SURRENDER: All passports (US and foreign) for the child and the respondent to be surrendered to the court clerk, petitioner's attorney, or other designated custodian within [24-48] hours.
c) CPIAP ENROLLMENT: An order directing enrollment of the child in the Children's Passport Issuance Alert Program (CPIAP) through the U.S. Department of State, so that the petitioner is notified before any new passport is issued.
d) NCIC / BORDER ALERT: An order directing law enforcement to enter the child into NCIC and notify CBP of the travel restriction.
e) BOND: An order requiring the respondent to post a bond (cash or surety) in an amount sufficient to cover the petitioner's anticipated costs of international legal proceedings if the child is removed ($[AMOUNT — typically $25,000-$100,000+]).
f) SUPERVISED VISITATION: If the risk is high, restrict the respondent's visitation to supervised settings only, with no overnight stays.
g) GEOGRAPHIC RESTRICTION ON RESIDENCE: An order prohibiting the respondent from relocating beyond [DISTANCE] miles without court approval.
h) LAW ENFORCEMENT AUTHORIZATION: An order authorizing all law enforcement officers to enforce the travel restriction and recover the child if found in violation.

HOW TO FILE:
1. Consult an attorney experienced in international custody / abduction prevention. If you cannot afford one, contact your local legal aid society or the ABA's family law resources.
2. File the petition in the family court with jurisdiction (typically where the child currently resides).
3. If this is an emergency, file an ex parte motion (without notice to the other parent) explaining that giving notice would cause the other parent to flee.
4. Attach all supporting evidence: affidavit, custody order, evidence of risk factors, communications, travel records, etc.
5. Request an expedited hearing (see the Expedited Hearing Letter template in this knowledge base).

AFTER THE ORDER IS GRANTED:
• Serve the respondent immediately (personal service preferred).
• Provide certified copies to:
  - Local police
  - CBP (Customs and Border Protection)
  - The child's school and daycare
  - The child's pediatrician
  - Your attorney
  - OCI / State Department (for CPIAP enrollment)
• Collect all passports as directed by the order.
• If the respondent violates the order: call police immediately, file a motion for contempt, and consider requesting criminal charges.

IMPORTANT NOTES:
• A travel restriction order is only as good as its enforcement. Make sure every relevant agency has a copy.
• Foreign passports are the biggest gap. If the other parent has obtained a foreign passport for the child, the US court order does not bind the foreign government. You may need to contact that country's embassy to request cancellation or a lookout.
• If the child is a dual national, both passports must be addressed in the order.`
    },
    {
        id: 'kb_us_passport_revocation_guide_v1', entryType: 'procedure',
        name: 'US: Passport Revocation / Cancellation vs Prevention (What Actually Works)',
        countryPair: 'US', resourceType: 'Legal Filing Guide',
        tags: ['us', 'passport', 'prevention', 'state_department', 'cpiap', 'legal', 'urgent'],
        url: 'https://travel.state.gov/content/travel/en/International-Parental-Child-Abduction.html',
        email: 'PreventAbduction1@state.gov',
        phone: '1-888-407-4747',
        summary: 'Clarifies the difference between preventing issuance, revoking an existing passport, and requesting alerts. Includes the practical path most parents can execute quickly.',
        fullText: `US: PASSPORT REVOCATION / CANCELLATION vs PREVENTION — WHAT ACTUALLY WORKS

Understanding the difference between these tools is critical. Many parents waste time pursuing the wrong action.

TOOL 1: PREVENT ISSUANCE (BEFORE A PASSPORT EXISTS)
What it does: Stops a new US passport from being issued to your child.
How it works:
• Under 22 CFR 51.28, BOTH parents must consent to passport issuance for a child under 16.
• If the other parent applies for a passport without your consent, the application should be denied — but ONLY if the State Department knows to look for it.
• Enroll in CPIAP (Children's Passport Issuance Alert Program) by submitting Form DS-3077 to the Office of Children's Issues.
Action steps:
1. Download and complete Form DS-3077 from travel.state.gov.
2. Submit it to: PreventAbduction1@state.gov or by mail/fax to OCI.
3. Include: your ID, child's birth certificate, custody order (if any).
4. Request written confirmation of enrollment.
Limitations:
• CPIAP only covers US passports. It does NOT prevent a foreign passport from being issued by another country's embassy.
• CPIAP is a NOTIFICATION system — it alerts you that an application has been received. In theory, the passport should not be issued without your consent, but processing errors can occur. Follow up aggressively.

TOOL 2: REVOKE / CANCEL AN EXISTING US PASSPORT (AFTER IT HAS BEEN ISSUED)
What it does: Makes an existing US passport invalid, so it cannot be used for travel.
How it works:
• The State Department CAN revoke a child's passport, but this is rare and typically requires a court order specifically directing revocation.
• A family court judge can order the passport surrendered to the court, but the physical passport may still scan as "valid" at a border if the State Department has not flagged it in its system.
Action steps:
1. Obtain a court order that SPECIFICALLY directs the US Department of State to revoke or cancel the child's passport. Generic language like "surrender passports" is not enough for State Department action.
2. Send the court order to OCI (PreventAbduction1@state.gov) and request that they flag the passport number in the State Department system.
3. If you physically possess the passport, surrender it to the court clerk as directed by the order. If you do not possess it, the court order should direct the other parent to surrender it and authorize law enforcement to seize it.
4. Request written confirmation from OCI that the passport has been flagged/revoked.
Limitations:
• Revocation does not physically retrieve the passport. If the taking parent has it, they may attempt to use it at a border where systems are not updated.
• Some countries accept expired or revoked US passports for entry if the traveler also holds that country's nationality.

TOOL 3: PASSPORT LOOKOUT (ALERT AT PORTS OF ENTRY/EXIT)
What it does: Flags the child and/or taking parent so that CBP (Customs and Border Protection) is alerted when the passport is scanned at a US port of entry or exit.
How it works:
• This is separate from CPIAP (which covers new issuance).
• A lookout can be placed through law enforcement (police, FBI) or through OCI coordination with CBP.
Action steps:
1. Ask your detective to request a CBP lookout for the child and taking parent.
2. Contact OCI and request they coordinate a lookout with CBP.
3. If you have a court order with a travel restriction, provide it to CBP through your detective or OCI.
Limitations:
• A lookout is only effective at US ports. If the child has already left the US, the lookout will only trigger if they attempt to re-enter or transit through the US.
• Private charter flights, land border crossings to Mexico/Canada, and boat departures may not be covered by standard lookouts.

TOOL 4: FOREIGN PASSPORT PREVENTION
What it does: Prevents the other country from issuing a passport to your child.
How it works:
• This is the HARDEST to achieve, because the US has no authority over foreign governments.
• You must contact the foreign country's embassy or consulate directly and request that no passport be issued to your child without your consent.
• Some countries will honor a US court order; many will not.
Action steps:
1. Send a letter (with certified translation if needed) to the foreign embassy/consulate in the US, attaching your custody order and requesting a hold on passport issuance.
2. Ask your attorney to contact the foreign Central Authority or Ministry of Foreign Affairs.
3. If the other parent has dual nationality and the child is entitled to that country's passport, this is your biggest vulnerability. Address it proactively.
Limitations:
• Many countries consider the child a national regardless of the US court order and will issue a passport to any parent who requests one.
• Some countries have no mechanism for a "hold" on passport issuance.

THE PRACTICAL PATH (WHAT TO DO RIGHT NOW):
1. IMMEDIATELY: Enroll in CPIAP (Form DS-3077) — takes 10 minutes to submit.
2. IMMEDIATELY: Request your detective place a CBP lookout.
3. WITHIN 24 HOURS: File for a court order requiring passport surrender and directing State Department revocation.
4. WITHIN 48 HOURS: Contact the foreign embassy to request a hold on foreign passport issuance.
5. ONGOING: Follow up with OCI weekly until you have written confirmation of all actions taken.

CONTACT:
• OCI: PreventAbduction1@state.gov | 1-888-407-4747 (US) | +1-202-501-4444 (overseas)
• CPIAP Form DS-3077: https://travel.state.gov
• CBP: Contact through your local FBI field office or detective`
    },
    {
        id: 'kb_us_uccjea_jurisdiction_motion_guide_v1', entryType: 'procedure',
        name: 'US: UCCJEA Jurisdiction Motion Guide (Protect Home-State Jurisdiction)',
        countryPair: 'US', resourceType: 'Legal Filing Guide',
        tags: ['us', 'uccjea', 'jurisdiction', 'custody', 'court', 'legal', 'abduction'],
        summary: 'Shows how to use the UCCJEA to confirm home-state jurisdiction, stop competing filings, and support cross-border enforcement. Focuses on what your filing should seek and what facts matter most.',
        fullText: `US: UCCJEA JURISDICTION MOTION GUIDE — PROTECT HOME-STATE JURISDICTION

WHAT IS THE UCCJEA?
The Uniform Child Custody Jurisdiction and Enforcement Act (UCCJEA) is adopted in all 50 US states plus DC. It determines which state (and in international cases, which country) has jurisdiction to make custody decisions. Securing jurisdiction in YOUR home state is critical — it prevents the taking parent from filing in a more favorable forum (whether another US state or a foreign country).

WHY THIS MATTERS IN ABDUCTION CASES:
• If you do not assert jurisdiction quickly, the taking parent may file for custody in the destination country, creating a competing proceeding.
• Under the UCCJEA, the "home state" has priority jurisdiction. But if you wait too long without filing, you risk losing home-state status.
• A UCCJEA jurisdiction finding from your home court supports Hague applications, international enforcement, and prevents "forum shopping."

KEY UCCJEA CONCEPTS:

1. HOME STATE (Section 201(a)(1)):
The state where the child lived with a parent for at least 6 consecutive months immediately before the abduction. This is the PRIMARY basis for jurisdiction.
• If the child was taken 3 months ago and lived in California for 2 years before that: California is the home state.
• Temporary absences (vacations, visits to the other parent) do not change the home state.

2. SIGNIFICANT CONNECTION (Section 201(a)(2)):
If no state qualifies as the home state, jurisdiction goes to a state with a significant connection to the child AND where substantial evidence is available.

3. EXCLUSIVE CONTINUING JURISDICTION (Section 202):
Once a court makes a custody determination, that court retains exclusive jurisdiction UNTIL:
• The court determines that neither the child nor any parent has a significant connection with the state, OR
• All parties have moved away.
• This means: if you already have a custody order from State X, State X retains jurisdiction even if the child has been taken elsewhere.

4. UCCJEA AND INTERNATIONAL APPLICATION (Section 105):
The UCCJEA treats a foreign country as if it were a US state for jurisdictional purposes. This means:
• A foreign custody order can be recognized — but so can your US order.
• If your US court has home-state jurisdiction, it takes priority over a foreign filing (in the eyes of US courts).
• This section is your tool to argue that the foreign court should defer to the US court.

WHAT YOUR MOTION SHOULD REQUEST:
a) A judicial finding that [STATE] is the child's home state under UCCJEA Section 201(a)(1) or that this Court has exclusive continuing jurisdiction under Section 202.
b) A declaration that any custody proceeding initiated by the taking parent in [FOREIGN COUNTRY / OTHER STATE] should not be recognized because this Court has prior and proper jurisdiction.
c) An order communicating with the foreign court (under Section 110 — interstate/international communication between courts) to inform them that this Court asserts jurisdiction.
d) Emergency temporary jurisdiction (Section 204) if immediate protection is needed (this is a backup if home-state jurisdiction is debatable).
e) All relief from the emergency custody motion (sole custody, travel restriction, passport surrender — see the Emergency Custody Order guide in this knowledge base).

WHAT FACTS TO EMPHASIZE:
• Duration of the child's residence in your state (the longer, the stronger).
• The child's connections: school, doctor, dentist, therapist, friends, extracurriculars, church/community.
• YOUR connections: employment, home, extended family, community ties.
• That the child's absence is due to the wrongful removal/retention — not a voluntary relocation.
• Any existing court orders from this jurisdiction.
• That the taking parent's filing abroad (if any) was made AFTER the wrongful removal and should not be given effect under the UCCJEA.

COMMON MISTAKES:
• Waiting too long to file: If you delay months without asserting jurisdiction, the taking parent may argue the child has acquired a new habitual residence. File IMMEDIATELY.
• Filing in the wrong state: File where the child lived, not where you live now (if different).
• Not addressing the foreign proceeding: If you know the taking parent has filed abroad, you must address it in your motion and ask the court to assert priority jurisdiction.
• Not requesting court-to-court communication: Section 110 allows (and encourages) your judge to communicate directly with the foreign judge. This can be powerful — request it.

INTERNATIONAL ENFORCEMENT:
• A UCCJEA custody order from your home state is the foundation for everything else: Hague applications, embassy requests, INTERPOL coordination, and foreign court recognition.
• Get it apostilled (authenticated for international use) as soon as it is entered.
• Provide certified copies to every agency involved in your case.`
    },
    {
        id: 'kb_uk_icacu_hague_application_guide_v1', entryType: 'procedure',
        name: 'UK: How to Apply Through ICACU (Hague Return / Contact / Enforcement)',
        countryPair: 'UK', resourceType: 'Legal Filing Guide',
        tags: ['uk', 'icacu', 'hague', 'central_authority', 'reunite', 'legal', 'procedure'],
        url: 'https://www.hcch.net/en/instruments/conventions/status-table/?cid=24',
        email: 'ICACU@ospt.gov.uk',
        phone: '+44 (203) 681 2756',
        summary: 'Step-by-step guide for UK (England & Wales) parents to apply through the International Child Abduction and Contact Unit (ICACU), including what to prepare and how to coordinate with police and Reunite.',
        fullText: `UK: HOW TO APPLY THROUGH ICACU — HAGUE RETURN / CONTACT / ENFORCEMENT

WHAT IS ICACU?
The International Child Abduction and Contact Unit (ICACU) is the Central Authority for England and Wales under the Hague Convention on International Child Abduction (1980). It processes applications from left-behind parents seeking the return of children wrongfully removed from or retained outside England and Wales, and also handles incoming applications where a child has been brought TO England and Wales.

For Scotland: the Central Authority is the Scottish Government (Justice Directorate).
For Northern Ireland: the Central Authority is the Northern Ireland Courts and Tribunals Service.

CONTACT DETAILS:
• ICACU Email: ICACU@ospt.gov.uk
• ICACU Phone: +44 (203) 681 2756
• Address: International Child Abduction and Contact Unit, Official Solicitor and Public Trustee, Victory House, 30-34 Kingsway, London WC2B 6EX

STEP 1: CONFIRM ELIGIBILITY
• Is the destination country a Hague Convention partner with the UK? Check the HCCH status table.
• Was the child under 16 at the time of removal/retention?
• Was the child habitually resident in England and Wales (or Scotland/NI) immediately before the removal?
• Do you have rights of custody (by court order or by operation of law)?
• Were you exercising those rights at the time?

STEP 2: CONTACT ICACU
• Call or email ICACU as soon as possible. They will guide you through the process and send you the application form.
• You can also contact Reunite International (a UK charity specializing in international child abduction) for free advice and support: https://www.reunite.org | Advice line: +44 (0)116 255 6234.

STEP 3: GATHER YOUR DOCUMENTS
□ Completed ICACU application form
□ Certified copy of any court order relating to custody, residence, or contact
□ Child's birth certificate
□ Recent photograph of the child (within 6 months)
□ Photograph of the taking parent
□ Passport copies (child and taking parent)
□ Marriage certificate / divorce decree (if applicable)
□ Police report (if filed — include crime reference number)
□ Evidence of habitual residence: school records, GP registration, council tax records, tenancy/mortgage, benefit records, nursery enrollment
□ Evidence of the abduction: flight records, communications (texts, WhatsApp, emails), witness statements, social media posts
□ Proof of your custody rights (if no court order: a letter from a solicitor confirming your rights under the Children Act 1989, where both parents with parental responsibility have equal custody rights unless a court orders otherwise)
□ Any evidence of the taking parent's current address or location abroad

STEP 4: SUBMIT YOUR APPLICATION
• Send the completed application and all supporting documents to ICACU by email (ICACU@ospt.gov.uk) and/or post.
• ICACU will review the application for completeness and may request additional information.
• Once satisfied, ICACU will transmit the application to the Central Authority in the destination country.

STEP 5: WHAT HAPPENS NEXT
• The destination country's Central Authority receives the application and initiates proceedings.
• In many countries, the Central Authority will attempt to locate the child and the taking parent, and may attempt mediation before court proceedings begin.
• Court proceedings will be conducted in the destination country. You may need a lawyer there — ICACU or Reunite can help you find one. Legal aid may be available in some countries for Hague cases.
• You may be asked to testify (often by video link).
• Under Article 11, a decision should be made within 6 weeks. If not, you (or ICACU) can request a statement of reasons for the delay.

STEP 6: COORDINATE WITH OTHER AGENCIES
• Police: Report the abduction to your local police force. Request a crime reference number. Ask them to enter the child on the PNC (Police National Computer) as a missing person. If applicable, ask about an INTERPOL Yellow Notice.
• Passport Office: Contact HM Passport Office to request that no new UK passport be issued to the child without your consent. If the child already has a UK passport and you do not have it, report it as lost/stolen to prevent its use.
• Foreign & Commonwealth Development Office (FCDO): If ICACU is handling the Hague application, they will coordinate with the FCDO and the relevant British Embassy/Consulate. You can also contact the FCDO directly for consular assistance.
• Reunite International: Free advice line, mediation services, and support for parents. They can explain the process, help you prepare your application, and connect you with legal resources: https://www.reunite.org | +44 (0)116 255 6234.

STEP 7: IF THE HAGUE DOES NOT APPLY
If the destination country is NOT a Hague partner with the UK:
• ICACU cannot process a Hague application, but they may still be able to offer limited advice.
• Contact Reunite for guidance on non-Hague options (diplomatic channels, local custody filings, mediation, wardship in the High Court).
• Consider applying to the High Court to make the child a Ward of Court — this gives the court broad powers and makes removal from the jurisdiction a contempt of court.
• Contact the FCDO for consular assistance — they may be able to conduct welfare checks and provide information about local legal options.

TIMELINE EXPECTATIONS (UK OUTGOING APPLICATIONS):
• ICACU processing: 1-2 weeks (assuming complete application)
• Transmission to destination country: 1-2 weeks after processing
• Destination country proceedings: highly variable — 4 weeks to 12+ months depending on country
• If return is ordered: enforcement timelines vary by country

KEY TIPS:
• File FAST. The one-year clock under Article 12 is ticking from the date of removal/retention.
• Be thorough with your application. Missing documents cause delays.
• Get legal advice early — Reunite can provide free initial advice, and many solicitors specializing in international child abduction offer urgent consultations.
• Keep a detailed log of all communications, dates, and actions taken.
• Do not attempt "self-help" (re-abducting the child). This is a criminal offense and will destroy your legal case.`
    },
    {
        id: 'kb_eu_brussels_ii_ter_urgent_return_guide_v1', entryType: 'procedure',
        name: 'EU-General: Brussels II ter (Brussels IIb) — Urgent Return & Enforcement Quick Guide',
        countryPair: 'EU-General', resourceType: 'Legal Filing Guide',
        tags: ['eu', 'brussels_iib', 'brussels_ii_ter', 'hague', 'enforcement', 'jurisdiction', 'procedure'],
        url: 'https://online-forms.e-justice.europa.eu/online-forms/matrimonial-matters-forms_en',
        summary: 'For abductions between EU Member States (excluding Denmark), Brussels II ter interacts with Hague and provides additional tools for enforcement and cooperation. Use this to understand what to ask your lawyer/court to do fast.',
        fullText: `EU-GENERAL: BRUSSELS II TER (BRUSSELS IIb) — URGENT RETURN & ENFORCEMENT QUICK GUIDE

WHAT IS BRUSSELS II TER?
Brussels II ter (formally: Council Regulation (EU) 2019/1111, also known as "Brussels IIb" or "the Recast") replaced Brussels IIa (Regulation 2201/2003) on 1 August 2022. It governs jurisdiction, recognition, and enforcement of decisions in matrimonial matters and matters of parental responsibility across EU Member States (excluding Denmark).

For child abduction cases WITHIN the EU, Brussels II ter works ALONGSIDE the Hague Convention 1980 and provides ADDITIONAL tools that make it harder for an abductor to prevent return.

WHO DOES IT APPLY TO?
• Abductions between EU Member States (all EU countries except Denmark).
• It does NOT apply to abductions to/from non-EU countries — those are governed by the Hague Convention alone (or non-Hague strategies if the country is not a Hague partner).
• Post-Brexit: It does NOT apply to UK-EU abductions. The UK is now treated as a non-EU Hague partner.

KEY ADVANTAGES OVER HAGUE ALONE:

1. STRICTER ARTICLE 13(b) — HARDER TO REFUSE RETURN (Article 27(3)):
Under Brussels II ter, a court in the destination EU country CANNOT refuse return under Article 13(b) (grave risk) if "adequate arrangements have been made to ensure the protection of the child after return." This means: if you offer undertakings (safe harbor measures) and show that your home country has protective mechanisms, the 13(b) defense is much harder for the abductor to win.

2. THE "OVERRIDE" MECHANISM — HOME COURT GETS FINAL SAY (Article 29):
If the destination country court REFUSES to return the child (e.g., under Article 13(b)):
• That court MUST transmit the case file to the court of the child's habitual residence (your home country) within ONE MONTH.
• Your home country court then examines the case and can ORDER THE RETURN — issuing a "certified decision" under Article 47.
• This certified decision is DIRECTLY ENFORCEABLE in the destination country. The destination country courts CANNOT refuse to enforce it.
• This is the "trump card" — even if you lose in the destination country, your home court can override.

3. FASTER TIMELINES (Article 24):
• First-instance court in the destination country: must decide within 6 WEEKS of the application being lodged with the court.
• Appellate court (if the decision is appealed): must decide within 6 WEEKS.
• These are hard deadlines. If they are missed, either party (or the Central Authority) can request a statement of reasons for the delay.

4. HEARING THE CHILD (Article 26):
• The child must be given the opportunity to express their views during the proceedings, unless it is inappropriate having regard to their age or degree of maturity.
• This is a right of the child, not a tool for the abductor. Courts should ensure the child is not coached.

5. DIRECT ENFORCEMENT — NO EXEQUATUR (Article 34-35):
• Decisions certified under Brussels II ter are enforceable in other EU Member States WITHOUT a declaration of enforceability (no exequatur required).
• This means: once your home court issues a certified return order, you take it directly to the enforcement authority in the destination country.

WHAT TO ASK YOUR LAWYER / COURT TO DO:

PHASE 1: IMMEDIATE (First 48 Hours)
a) File the Hague return application through your Central Authority as normal.
b) Simultaneously, ensure your lawyer in the destination country CITES Brussels II ter (not just Hague) in all filings.
c) Request provisional/protective measures under Article 15: the destination court can order measures to protect the child pending the return decision (e.g., supervised contact, travel ban, passport surrender).

PHASE 2: AT THE HEARING (Within 6 Weeks)
a) Argue that Article 13(b) cannot succeed because adequate protective measures are available in your home country (Article 27(3)). Prepare undertakings.
b) Request that the court comply with the 6-week timeline (Article 24).
c) If the child is heard, request independent assessment to prevent coaching influence.

PHASE 3: IF YOU WIN — ENFORCEMENT
a) Request immediate enforcement. Under Brussels II ter, the decision is directly enforceable.
b) If the abductor does not comply, request enforcement measures available under the destination country's law (e.g., in Germany: Ordnungsgeld, Zwangshaft; in France: astreinte, huissier de justice).
c) Request that the court set a specific date for handover and designate the method (e.g., at a specific location, with police presence).

PHASE 4: IF YOU LOSE — THE OVERRIDE
a) If the destination court refuses return: your lawyer in the HOME country must be ready to act immediately.
b) Under Article 29, the destination court must transmit the file to your home court within 1 month.
c) Your home court examines the case, hears from both parties, and may order the return.
d) If return is ordered: the home court issues a "Certificate" under Article 47.
e) This Certificate is directly enforceable in the destination country — no further court proceedings needed.
f) Take the Certificate to the destination country's enforcement authority.

IMPORTANT FORMS:
• Brussels II ter includes standardized forms (Annexes) for certificates, enforcement requests, and information exchange between courts.
• Access them at: https://online-forms.e-justice.europa.eu/online-forms/matrimonial-matters-forms_en
• Your lawyer should use these forms to ensure the decision is immediately recognized and enforceable across the EU.

CENTRAL AUTHORITY COOPERATION (Article 76-84):
• Central Authorities in EU Member States have enhanced cooperation obligations under Brussels II ter.
• They must assist in locating the child, facilitating mediation, exchanging information, and coordinating with courts.
• If your Central Authority is slow, you can request court-to-court direct communication under Article 86.

COMMON PITFALLS:
• Not citing Brussels II ter: Many lawyers still file under Hague alone. Brussels II ter gives you stronger tools — make sure it is cited.
• Accepting delay: The 6-week deadlines are binding. If they are not met, formally request a statement of reasons (Article 24(2)).
• Not preparing for the override: If you lose in the destination country, you must act FAST in your home country. Have your home lawyer on standby from day one.
• Not using provisional measures: Article 15 allows protective measures even before the return decision. Use them to prevent the abductor from moving the child again.`
    }
];
