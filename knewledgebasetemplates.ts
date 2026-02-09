// Knowledge Base Templates — Comprehensive Global Library
// Separated from index.tsx for maintainability

export interface KBTemplate {
    id: string;
    entryType: string;
    name: string;
    countryPair: string;
    resourceType: string;
    summary: string;
    fullText: string;
    tags: string[];
    phone?: string;
    url?: string;
    email?: string;
}

export const knowledgeBaseTemplates: KBTemplate[] = [
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
    }
];
