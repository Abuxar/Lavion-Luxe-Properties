import type { Market } from "@lavion/schema";

/**
 * How a purchase actually goes through, per market.
 *
 * Checked against primary sources where they exist (September 2026):
 *   UK   GOV.UK "Buying a home: transferring ownership" and "Stamp Duty Land
 *        Tax"; MoneyHelper "Contract exchange and completion".
 *   UAE  Dubai Land Department "Property sale registration" fee schedule;
 *        RERA Form F practice; UAE Central Bank mortgage lending caps.
 *   PK   FBR overseas FAQ on 236C/236K filer rates; DHA transfer practice
 *        (verification, NDC, bayana on stamp paper, transfer in person).
 *
 * Deliberately general. Practice varies by city, scheme, emirate and nation,
 * and this is orientation, not a legal checklist — every market says so.
 * Rendered by a server component, so none of it ships to the browser.
 */

export interface BuyingStep {
  title: string;
  body: string;
}

export interface BuyingSystem {
  title: string;
  summary: string;
  steps: BuyingStep[];
  /** Shown only on off-plan listings, where the money moves differently. */
  offPlan: string;
  note: string;
}

export const BUYING: Record<Market, BuyingSystem> = {
  pk: {
    title: "How buying works in Pakistan",
    summary:
      "No mortgage and no interest. The buyer checks the property first, pays the seller an advance (bayana), and pays the balance in full on a date agreed at the outset.",
    steps: [
      {
        title: "Verify before any money moves",
        body: "At the DHA or society office, verify the file and the seller's ownership, and ask for a no-demand certificate (NDC) confirming there are no outstanding dues or disputes.",
      },
      {
        title: "Token, then bayana",
        body: "A small token — often PKR 25,000 to 100,000 — holds the property while you check it. The bayana, commonly around 25% of the price in DHA, is then paid under a written agreement on stamp paper that fixes the price, the balance date and what happens if either side withdraws.",
      },
      {
        title: "Balance on the fixed date",
        body: "The remaining amount is paid in full on the agreed date, at transfer. There is no interest: the price agreed is the price paid.",
      },
      {
        title: "Transfer in person",
        body: "Buyer and seller both attend the DHA or society transfer office — or the sub-registrar for other property. The transfer fee and advance taxes are settled there (236K for the buyer, 236C for the seller) and the file is issued in the buyer's name.",
      },
    ],
    offPlan:
      "For a new project the developer usually sets an instalment plan instead of bayana-and-balance. Check exactly what is due when, and what transferring the file involves.",
    note: "Overseas Pakistanis holding NICOP or POC pay advance tax at the filer rate (FBR). Practice varies by city and scheme. General information, not legal advice — have the documents checked by a lawyer before paying the bayana.",
  },

  uk: {
    title: "How buying works in the UK",
    summary:
      "Buyer and seller each appoint a solicitor. The solicitors check the property and the paperwork and agree the contract, and the deal only becomes binding when contracts are exchanged.",
    steps: [
      {
        title: "Offer accepted — not yet binding",
        body: "In England and Wales an accepted offer does not commit either side. Either can still withdraw until contracts are exchanged.",
      },
      {
        title: "Solicitors on both sides",
        body: "Each side instructs a solicitor or licensed conveyancer. The seller's drafts the contract; the buyer's checks the title, runs local searches, reviews the seller's property information and raises enquiries.",
      },
      {
        title: "Exchange of contracts",
        body: "When both are satisfied, the signed contracts are exchanged and the buyer pays a deposit — often 10%. The deal is now legally binding and the completion date is set, usually a few weeks later. In Scotland the equivalent is concluding missives.",
      },
      {
        title: "Completion",
        body: "The buyer's solicitor sends the balance and the keys are released. The solicitor usually files the purchase tax return and pays it, due within 14 days — Stamp Duty in England and Northern Ireland, LBTT in Scotland, LTT in Wales — and registers the new owner.",
      },
    ],
    offPlan:
      "Buying a new-build off-plan, contracts are exchanged early with a deposit, and completion follows once the building is finished — sometimes many months later.",
    note: "Withdrawing after exchange can cost the deposit and the seller's losses. General information, not legal advice.",
  },

  ae: {
    title: "How buying works in the UAE",
    summary:
      "A deposit secures the property on signing, and the balance is paid at transfer — from your own funds or a UAE mortgage, within the Central Bank's lending caps.",
    steps: [
      {
        title: "Sign the MOU (Form F)",
        body: "Buyer and seller sign a memorandum of understanding — Form F in Dubai — setting the price, the transfer date and any conditions such as mortgage approval. Once signed it is binding.",
      },
      {
        title: "Pay the 10% security deposit",
        body: "The buyer lodges a deposit, normally 10% of the price, usually as a cheque held by the agent until transfer. A buyer who walks away without a valid reason can forfeit it.",
      },
      {
        title: "Mortgage approval and developer NOC",
        body: "If borrowing, the bank values the property and issues its final offer, within the Central Bank's caps on how much can be lent. The seller obtains a no-objection certificate from the developer confirming nothing is owed.",
      },
      {
        title: "Transfer at the land department",
        body: "At a registration trustee office the balance is paid by manager's cheque and the title deed is issued in the buyer's name. In Dubai the transfer fee is 4% of the price — 2% buyer and 2% seller on the Land Department's schedule, though buyers often pay all of it.",
      },
    ],
    offPlan:
      "Off-plan purchases are paid into the developer's escrow account in instalments until handover, and registered on an interim basis (Oqood in Dubai), rather than bought outright with a mortgage.",
    note: "Fees and procedures differ between emirates. General information, not legal advice.",
  },
};
