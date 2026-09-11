import type { Market } from "@lavion/schema";

/**
 * How a purchase actually goes through, per market.
 *
 * The listing page used to show one mortgage calculator in every market. That
 * describes a UAE or UK purchase and misdescribes a Pakistani one, where the
 * buyer verifies the property, pays the seller a token, and pays the balance
 * in full on a fixed date — no loan and no interest. The steps below are what
 * the numbers panel is then shaped around.
 *
 * Kept general on purpose. Practice varies by city, scheme, emirate and
 * nation, and this is orientation for a buyer, not a legal checklist; every
 * market carries a note saying so.
 *
 * Rendered by a server component, so none of this ships to the browser.
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
      "No mortgage and no interest. The buyer checks the property first, pays the seller a token, and pays the balance in full on a date agreed at the outset.",
    steps: [
      {
        title: "Verify before any money moves",
        body: "Confirm the seller's title and ask the society or DHA to verify the file and issue a no-demand certificate, so you know it is genuine and clear of dues and disputes.",
      },
      {
        title: "Pay the token (bayana)",
        body: "The buyer pays the seller a token — often around 10% of the price, sometimes more — recorded in a written sale agreement (iqrarnama) that fixes the price, the balance date and what happens if either side withdraws.",
      },
      {
        title: "Pay the balance on the fixed date",
        body: "The remaining amount is paid in full on the agreed date, commonly 30 to 60 days later. There is no interest: the price agreed is the price paid.",
      },
      {
        title: "Transfer",
        body: "Ownership moves at the society or DHA transfer office, or the sub-registrar for other property. The transfer fee and advance taxes (236K for the buyer, 236C for the seller) are settled here.",
      },
    ],
    offPlan:
      "For a new project the developer usually sets an instalment plan instead of token-and-balance. Check exactly what is due when, and what transferring the file involves.",
    note: "Practice varies by city and scheme. General information, not legal advice — have the documents checked by a lawyer before paying the token.",
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
        body: "Each side instructs a solicitor or licensed conveyancer. The buyer's solicitor checks the title at the Land Registry, runs local searches, reviews the seller's property information and raises enquiries.",
      },
      {
        title: "Exchange of contracts",
        body: "When both solicitors are satisfied, contracts are exchanged and the buyer pays a deposit, usually 10%. The deal is now legally binding and the completion date is set. In Scotland the equivalent is concluding missives.",
      },
      {
        title: "Completion",
        body: "The buyer's solicitor sends the balance, the keys are released, and the solicitor pays the purchase tax — Stamp Duty in England and Northern Ireland, LBTT in Scotland, LTT in Wales — and registers the new owner.",
      },
    ],
    offPlan:
      "Buying a new-build off-plan, contracts are exchanged early with a deposit, and completion follows once the building is finished — sometimes many months later.",
    note: "A mortgage has to be in place before exchange, because exchange commits you to complete. General information, not legal advice.",
  },

  ae: {
    title: "How buying works in the UAE",
    summary:
      "A deposit secures the property, and the balance is paid at transfer — from your own funds or a UAE mortgage.",
    steps: [
      {
        title: "Agree terms and sign the MOU",
        body: "Buyer and seller sign a memorandum of understanding (Form F in Dubai) setting the price, the transfer date and any conditions, such as mortgage approval.",
      },
      {
        title: "Pay the security deposit",
        body: "The buyer lodges a deposit, commonly 10% of the price, usually as a cheque held by the brokerage until transfer.",
      },
      {
        title: "Mortgage approval and developer NOC",
        body: "If you are borrowing, the bank values the property and issues its final offer. The seller obtains a no-objection certificate from the developer confirming nothing is owed.",
      },
      {
        title: "Transfer at the land department",
        body: "At the land department — a DLD trustee office in Dubai — the balance is paid by manager's cheque, the transfer fee is settled (4% of the price in Dubai) and the title deed is issued in the buyer's name.",
      },
    ],
    offPlan:
      "Off-plan purchases are paid into the developer's escrow account in instalments until handover, and registered on an interim basis (Oqood in Dubai), rather than bought outright with a mortgage.",
    note: "Rules differ between emirates. General information, not legal advice.",
  },
};
