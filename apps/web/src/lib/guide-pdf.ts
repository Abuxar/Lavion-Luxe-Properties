import "server-only";
import PDFDocument from "pdfkit";
import { MARKETS, type Market } from "@lavion/schema";
import type { GuideWithRules } from "./guides";

/**
 * Renders a guide to PDF from the same ComplianceRule records the web page
 * uses, so the downloaded document and the page can never disagree — a PDF
 * that quietly goes stale while the site updates is worse than no PDF.
 *
 * Uses PDF's built-in fonts rather than embedding the brand faces: Bodoni and
 * Hanken would add roughly a megabyte per document for a file people mostly
 * skim once. Times and Helvetica keep the hierarchy without the weight.
 */

const INK = "#0f1d1f";
const SOFT = "#4a5654";
const FAINT = "#7d8785";
const BRASS = "#8c6a32";
const RULE = "#d8d4ca";

const M = 56; // page margin

export async function buildGuidePdf(
  guide: GuideWithRules,
  market: Market,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: M, bottom: M, left: M, right: M },
    info: {
      Title: guide.title,
      Author: "Lavion Luxe Properties",
      Subject: guide.standfirst,
      Keywords: `property, ${MARKETS[market].label}, investment`,
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const W = doc.page.width - M * 2;
  const rule = (y?: number, width = W, colour = RULE) => {
    const yy = y ?? doc.y;
    doc.save().moveTo(M, yy).lineTo(M + width, yy).lineWidth(0.75).strokeColor(colour).stroke().restore();
  };

  /* ---------- masthead ---------- */
  doc.fillColor(FAINT).font("Helvetica").fontSize(8).text("LAVION LUXE PROPERTIES", { characterSpacing: 2 });
  doc.moveDown(0.4);
  doc.fillColor(FAINT).fontSize(8).text(MARKETS[market].label.toUpperCase(), { characterSpacing: 2 });

  doc.moveDown(1.6);
  doc.fillColor(INK).font("Times-Roman").fontSize(28).text(guide.title, { width: W, lineGap: 3 });

  doc.moveDown(0.8);
  rule(doc.y, 110, BRASS);
  doc.moveDown(1.2);

  doc.fillColor(SOFT).font("Helvetica").fontSize(11.5).text(guide.standfirst, { width: W, lineGap: 3.5 });

  doc.moveDown(1);
  doc
    .fillColor(FAINT)
    .fontSize(8)
    .text(
      `For ${guide.audience}  ·  Last reviewed ${guide.lastReviewedAt.toISOString().slice(0, 10)}`,
      { width: W, characterSpacing: 0.6 },
    );

  /* ---------- intro ---------- */
  doc.moveDown(1.8);
  doc.fillColor(INK).font("Helvetica").fontSize(10.5).text(guide.intro, { width: W, lineGap: 4, align: "left" });

  /* ---------- the rules ---------- */
  doc.moveDown(1.8);
  doc.fillColor(BRASS).font("Helvetica-Bold").fontSize(8).text("WHAT THE RULES SAY", { characterSpacing: 1.6 });
  doc.moveDown(0.6);
  rule();
  doc.moveDown(1.2);

  for (const r of guide.rules) {
    // Keep a rule block together where possible rather than orphaning a
    // heading at the foot of a page.
    if (doc.y > doc.page.height - M - 170) doc.addPage();

    doc.fillColor(INK).font("Times-Roman").fontSize(15).text(r.title, { width: W, lineGap: 2 });
    doc.moveDown(0.6);
    doc.fillColor(SOFT).font("Helvetica").fontSize(10).text(r.summary, { width: W, lineGap: 3.5 });

    doc.moveDown(0.8);
    doc.fillColor(FAINT).font("Helvetica").fontSize(8);
    doc.text(`Authority: ${r.source.authority}`, { width: W });
    doc.text(r.source.url, { width: W, link: r.source.url, underline: false });
    doc.text(
      `In force since ${r.effectiveFrom.toISOString().slice(0, 10)}  ·  Last reviewed ${r.lastReviewedAt
        .toISOString()
        .slice(0, 10)}`,
      { width: W },
    );

    doc.moveDown(1);
    rule();
    doc.moveDown(1.2);
  }

  /* ---------- disclaimer ---------- */
  if (doc.y > doc.page.height - M - 150) doc.addPage();

  doc.moveDown(0.5);
  doc.fillColor(BRASS).font("Helvetica-Bold").fontSize(8).text("GENERAL INFORMATION, NOT ADVICE", { characterSpacing: 1.6 });
  doc.moveDown(0.6);
  doc
    .fillColor(SOFT)
    .font("Helvetica")
    .fontSize(9)
    .text(
      "This document explains how published rules work. It is not legal, tax or financial advice, and it does not recommend any particular investment. Thresholds and rates change, often at budget cycles, so confirm anything you intend to act on with a qualified adviser in the relevant jurisdiction before relying on it.",
      { width: W, lineGap: 3 },
    );

  doc.moveDown(1.4);
  doc
    .fillColor(FAINT)
    .fontSize(8)
    .text(
      `Prepared for ${MARKETS[market].label}  ·  lavionluxe.com  ·  Generated ${new Date()
        .toISOString()
        .slice(0, 10)}`,
      { width: W },
    );

  doc.end();
  return done;
}
