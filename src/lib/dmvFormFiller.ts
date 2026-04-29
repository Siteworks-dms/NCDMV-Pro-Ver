/**
 * NC DMV Form Filler
 * Uses pdf-lib to load official NC DMV PDF forms and populate them with deal data.
 *
 * SETUP: Download the official PDFs from NC DMV and place them in /public/forms/
 * See /public/forms/README.md for download URLs.
 *
 * HOW IT WORKS:
 * 1. Fetches the blank official PDF from /public/forms/
 * 2. Loads it with pdf-lib
 * 3. Inspects AcroForm fields and fills them with deal data
 * 4. Falls back to coordinate-based text overlay if fields are not found
 * 5. Returns a Uint8Array which is converted to a blob URL for display
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { DealSummary } from '@/types/database'

// ── Types ────────────────────────────────────────────────────────────────────

export type DMVFormId = 'MVR-1' | 'MVR-180' | 'MVR-181' | 'MVR-2'

export interface FillResult {
  blob: Blob
  url: string
  formId: DMVFormId
  fieldsFilled: string[]
  fieldsNotFound: string[]
  usedFallback: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined) =>
  v != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v) : ''

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''

/** Safely set a text field — returns true if found */
function setField(form: ReturnType<PDFDocument['getForm']>, name: string, value: string, filled: string[], notFound: string[]): boolean {
  try {
    const field = form.getTextField(name)
    field.setText(value ?? '')
    filled.push(name)
    return true
  } catch {
    notFound.push(name)
    return false
  }
}

/** Safely check a checkbox */
function checkBox(form: ReturnType<PDFDocument['getForm']>, name: string, check: boolean, filled: string[], notFound: string[]) {
  try {
    const field = form.getCheckBox(name)
    if (check) field.check()
    else field.uncheck()
    filled.push(name)
  } catch {
    notFound.push(name)
  }
}

/** Draw text overlay at a specific position (fallback for flat PDFs) */
async function drawText(
  page: ReturnType<PDFDocument['getPage']>,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  text: string,
  x: number,
  y: number,
  size = 9
) {
  page.drawText(text ?? '', { x, y, size, font, color: rgb(0, 0, 0) })
}

// ── Discover fields (dev utility) ────────────────────────────────────────────
/** Call this in the browser console to see all AcroForm field names in a PDF */
export async function discoverFields(formId: DMVFormId): Promise<string[]> {
  const res = await fetch(`/forms/${formId}.pdf`)
  if (!res.ok) throw new Error(`${formId}.pdf not found in /public/forms/`)
  const bytes = await res.arrayBuffer()
  const doc   = await PDFDocument.load(bytes)
  const form  = doc.getForm()
  return form.getFields().map(f => `${f.constructor.name}: ${f.getName()}`)
}


/** 
 * DEBUG: Draw a coordinate grid overlay on a PDF page.
 * Call this in the browser console to find exact field positions:
 *   import { debugGrid } from '@/lib/dmvFormFiller'
 *   debugGrid('MVR-180').then(url => window.open(url))
 */
export async function debugGrid(formId: DMVFormId): Promise<string> {
  const res = await fetch(`/forms/${formId}.pdf`)
  const bytes = await res.arrayBuffer()
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.getPage(0)
  const { width, height } = page.getSize()

  // Draw grid lines every 50 pts
  for (let y = 50; y < height; y += 50) {
    page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness: 0.3, color: rgb(0.8, 0.8, 1) })
    page.drawText(String(Math.round(height - y)), { x: 2, y: y + 1, size: 6, font, color: rgb(0, 0, 0.8) })
  }
  for (let x = 50; x < width; x += 50) {
    page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness: 0.3, color: rgb(1, 0.8, 0.8) })
    page.drawText(String(x), { x: x + 1, y: height - 10, size: 6, font, color: rgb(0.8, 0, 0) })
  }

  const saved = await doc.save()
  const blob = new Blob([new Uint8Array(saved).buffer as ArrayBuffer], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}

// ── MVR-180: Odometer Disclosure ─────────────────────────────────────────────
async function fillMVR180(deal: DealSummary): Promise<FillResult> {
  const res = await fetch('/forms/MVR-180.pdf')
  if (!res.ok) throw new Error('MVR-180.pdf not found. Download from NC DMV and place in /public/forms/')

  const bytes  = await res.arrayBuffer()
  const doc    = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form   = doc.getForm()
  const filled: string[] = []
  const notFound: string[] = []

  // ── Try AcroForm fields first ──
  // Field names vary by PDF version — we try common naming patterns
  const vehicleFields: [string[], string][] = [
    [['VIN', 'Vin', 'VehicleID', 'Vehicle ID Number', 'VIN Number'], deal.vin],
    [['Year', 'ModelYear', 'Model Year', 'Veh Year'], String(deal.year)],
    [['Make', 'VehicleMake', 'Vehicle Make'], deal.make],
    [['Model', 'VehicleModel', 'Vehicle Model'], deal.model],
    [['Odometer', 'OdometerReading', 'Odometer Reading', 'Miles'], String(deal.odometer?.toLocaleString())],
    [['BuyerName', 'Buyer Name', 'Transferee', 'TransfereeName'], deal.buyer_name],
    [['BuyerAddress', 'Buyer Address', 'TransfereeAddress'], deal.address_line1 ?? ''],
    [['BuyerCity', 'City'], deal.city ?? ''],
    [['BuyerState', 'State'], deal.state ?? 'NC'],
    [['BuyerZip', 'Zip', 'ZipCode'], deal.zip ?? ''],
    [['Date', 'SaleDate', 'Sale Date', 'DateOfSale'], fmtDate(deal.sale_date)],
  ]

  for (const [names, value] of vehicleFields) {
    let found = false
    for (const name of names) {
      if (setField(form, name, value, filled, [])) { found = true; break }
    }
    if (!found) notFound.push(names[0])
  }

  // Odometer accuracy checkbox
  checkBox(form, 'ActualMileage', true, filled, notFound)
  checkBox(form, 'Actual', true, filled, notFound)

  // ── Fallback: if few fields found, use coordinate overlay ──
  let usedFallback = false
  if (filled.length < 3) {
    usedFallback = true
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.getPage(0)
    const { height } = page.getSize()
    const H = height

    // MVR-180 coordinates — Letter 612x792 pts, origin bottom-left
    // VEHICLE SECTION table row
    await drawText(page, font, String(deal.year),           38, H - 222,  9) // YEAR column
    await drawText(page, font, deal.make,                   95, H - 222,  9) // MAKE column
    await drawText(page, font, deal.model ?? '',           168, H - 222,  9) // BODY STYLE/MODEL column
    await drawText(page, font, deal.vin,                   305, H - 222, 10) // VIN column (far right)
    // DISCLOSURE SECTION — "odometer now reads ___ miles"
    await drawText(page, font, String(deal.odometer?.toLocaleString() ?? ''), 218, H - 299, 10)
    // SELLER SECTION (dealer fills name/signature — leave those blank, add date only)
    await drawText(page, font, fmtDate(deal.sale_date),     72, H - 418,  9) // Date of certification
    // BUYER SECTION
    await drawText(page, font, deal.buyer_name,             72, H - 488,  9) // Buyer printed name
    await drawText(page, font, deal.address_line1 ?? '',    72, H - 508,  9) // Buyer address
    await drawText(page, font, deal.city ?? '',             72, H - 528,  9) // City
    await drawText(page, font, deal.state ?? 'NC',         310, H - 528,  9) // State
    await drawText(page, font, deal.zip ?? '',             430, H - 528,  9) // Zip
    await drawText(page, font, fmtDate(deal.sale_date),     72, H - 548,  9) // Buyer date
  }

  const pdfBytes = await doc.save()
  const blob = new Blob([new Uint8Array(pdfBytes).buffer as ArrayBuffer], { type: 'application/pdf' })
  return { blob, url: URL.createObjectURL(blob), formId: 'MVR-180', fieldsFilled: filled, fieldsNotFound: notFound, usedFallback }
}

// ── MVR-181: Damage Disclosure ───────────────────────────────────────────────
async function fillMVR181(deal: DealSummary): Promise<FillResult> {
  const res = await fetch('/forms/MVR-181.pdf')
  if (!res.ok) throw new Error('MVR-181.pdf not found. Download from NC DMV and place in /public/forms/')

  const bytes = await res.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form  = doc.getForm()
  const filled: string[] = []
  const notFound: string[] = []

  const fields: [string[], string][] = [
    [['VIN', 'Vin', 'VehicleID'],                         deal.vin],
    [['Year', 'ModelYear'],                               String(deal.year)],
    [['Make', 'VehicleMake'],                             deal.make],
    [['Model', 'VehicleModel'],                           deal.model],
    [['Color', 'VehicleColor'],                           deal.color_exterior ?? ''],
    [['SellerName', 'Seller', 'TransferorName'],          ''],  // dealer fills manually
    [['BuyerName', 'Buyer', 'TransfereeName'],            deal.buyer_name],
    [['Date', 'SaleDate'],                                fmtDate(deal.sale_date)],
  ]

  for (const [names, value] of fields) {
    let found = false
    for (const name of names) {
      if (setField(form, name, value, filled, [])) { found = true; break }
    }
    if (!found) notFound.push(names[0])
  }

  let usedFallback = false
  if (filled.length < 3) {
    usedFallback = true
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.getPage(0)
    const { height } = page.getSize()
    const H = height

    // MVR-181 — Vehicle section
    await drawText(page, font, String(deal.year),           38, H - 185,  9)
    await drawText(page, font, deal.make,                   95, H - 185,  9)
    await drawText(page, font, deal.model ?? '',           200, H - 185,  9)
    await drawText(page, font, deal.vin,                   350, H - 185, 10)
    await drawText(page, font, deal.color_exterior ?? '',  500, H - 185,  9)
    // Seller/Buyer section
    await drawText(page, font, deal.buyer_name,             72, H - 490,  9)
    await drawText(page, font, deal.address_line1 ?? '',    72, H - 510,  9)
    await drawText(page, font, deal.city ?? '',             72, H - 530,  9)
    await drawText(page, font, deal.state ?? 'NC',         310, H - 530,  9)
    await drawText(page, font, deal.zip ?? '',             430, H - 530,  9)
    await drawText(page, font, fmtDate(deal.sale_date),    400, H - 490,  9)
  }

  const pdfBytes = await doc.save()
  const blob = new Blob([new Uint8Array(pdfBytes).buffer as ArrayBuffer], { type: 'application/pdf' })
  return { blob, url: URL.createObjectURL(blob), formId: 'MVR-181', fieldsFilled: filled, fieldsNotFound: notFound, usedFallback }
}

// ── MVR-1: Title Application ─────────────────────────────────────────────────
async function fillMVR1(deal: DealSummary): Promise<FillResult> {
  const res = await fetch('/forms/MVR-1.pdf')
  if (!res.ok) throw new Error('MVR-1.pdf not found. Download from NC DMV and place in /public/forms/')

  const bytes = await res.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form  = doc.getForm()
  const filled: string[] = []
  const notFound: string[] = []

  const fields: [string[], string][] = [
    [['VIN', 'Vin', 'VehicleID'],                  deal.vin],
    [['Year', 'ModelYear'],                        String(deal.year)],
    [['Make', 'VehicleMake'],                      deal.make],
    [['Model', 'VehicleModel'],                    deal.model],
    [['Odometer', 'OdometerReading'],              String(deal.odometer?.toLocaleString())],
    [['PurchasePrice', 'SalePrice', 'Price'],      fmt(deal.sale_price)],
    [['HUT', 'HighwayUseTax', 'TaxPaid'],          fmt(deal.hut_amount)],
    [['BuyerName', 'Buyer'],                       deal.buyer_name],
    [['BuyerAddress', 'Address'],                  deal.address_line1 ?? ''],
    [['BuyerCity', 'City'],                        deal.city ?? ''],
    [['BuyerState', 'State'],                      deal.state ?? 'NC'],
    [['BuyerZip', 'Zip'],                          deal.zip ?? ''],
    [['SaleDate', 'Date'],                         fmtDate(deal.sale_date)],
    [['TitleFilingDue', 'FilingDate'],             fmtDate(deal.title_filing_due)],
  ]

  for (const [names, value] of fields) {
    let found = false
    for (const name of names) {
      if (setField(form, name, value, filled, [])) { found = true; break }
    }
    if (!found) notFound.push(names[0])
  }

  let usedFallback = false
  if (filled.length < 3) {
    usedFallback = true
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.getPage(0)
    const { height } = page.getSize()
    const H = height

    // MVR-1 — Vehicle ID section (top of form)
    await drawText(page, font, deal.vin,                   290, H - 140, 10) // VIN field top area
    await drawText(page, font, String(deal.year),           38, H - 168,  9) // Year
    await drawText(page, font, deal.make,                  100, H - 168,  9) // Make
    await drawText(page, font, deal.model ?? '',           200, H - 168,  9) // Model
    await drawText(page, font, deal.color_exterior ?? '',  360, H - 168,  9) // Color
    await drawText(page, font, String(deal.odometer?.toLocaleString() ?? ''), 460, H - 168, 9)
    // Purchase price & HUT
    await drawText(page, font, fmt(deal.sale_price),        38, H - 210,  9)
    await drawText(page, font, fmt(deal.hut_amount),       180, H - 210,  9)
    await drawText(page, font, fmtDate(deal.sale_date),    350, H - 210,  9)
    // Buyer section
    await drawText(page, font, deal.buyer_name,             38, H - 310,  9)
    await drawText(page, font, deal.address_line1 ?? '',    38, H - 330,  9)
    await drawText(page, font, deal.city ?? '',             38, H - 350,  9)
    await drawText(page, font, deal.state ?? 'NC',         260, H - 350,  9)
    await drawText(page, font, deal.zip ?? '',             360, H - 350,  9)
    // Filing deadline reminder
    await drawText(page, font, `Title due: ${fmtDate(deal.title_filing_due)}`, 38, H - 375, 8)
  }

  const pdfBytes = await doc.save()
  const blob = new Blob([new Uint8Array(pdfBytes).buffer as ArrayBuffer], { type: 'application/pdf' })
  return { blob, url: URL.createObjectURL(blob), formId: 'MVR-1', fieldsFilled: filled, fieldsNotFound: notFound, usedFallback }
}

// ── MVR-2: Dealer Reassignment ───────────────────────────────────────────────
async function fillMVR2(deal: DealSummary): Promise<FillResult> {
  const res = await fetch('/forms/MVR-2.pdf')
  if (!res.ok) throw new Error('MVR-2.pdf not found. Download from NC DMV and place in /public/forms/')

  const bytes = await res.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form  = doc.getForm()
  const filled: string[] = []
  const notFound: string[] = []

  const fields: [string[], string][] = [
    [['VIN', 'Vin'],                      deal.vin],
    [['Year', 'ModelYear'],               String(deal.year)],
    [['Make', 'VehicleMake'],             deal.make],
    [['BuyerName', 'Buyer', 'Purchaser'], deal.buyer_name],
    [['BuyerAddress', 'Address'],         deal.address_line1 ?? ''],
    [['BuyerCity', 'City'],               deal.city ?? ''],
    [['BuyerState', 'State'],             deal.state ?? 'NC'],
    [['BuyerZip', 'Zip'],                 deal.zip ?? ''],
    [['SalePrice', 'Price'],              fmt(deal.sale_price)],
    [['Odometer', 'OdometerReading'],     String(deal.odometer?.toLocaleString())],
    [['Date', 'SaleDate'],                fmtDate(deal.sale_date)],
  ]

  for (const [names, value] of fields) {
    let found = false
    for (const name of names) {
      if (setField(form, name, value, filled, [])) { found = true; break }
    }
    if (!found) notFound.push(names[0])
  }

  let usedFallback = false
  if (filled.length < 3) {
    usedFallback = true
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.getPage(0)
    const { height } = page.getSize()
    const H = height

    // MVR-2 — Vehicle section
    await drawText(page, font, deal.vin,                   290, H - 148, 10)
    await drawText(page, font, String(deal.year),           38, H - 175,  9)
    await drawText(page, font, deal.make,                  100, H - 175,  9)
    await drawText(page, font, deal.model ?? '',           200, H - 175,  9)
    await drawText(page, font, String(deal.odometer?.toLocaleString() ?? ''), 380, H - 175, 9)
    // Buyer / Purchaser section
    await drawText(page, font, deal.buyer_name,             38, H - 248,  9)
    await drawText(page, font, deal.address_line1 ?? '',    38, H - 268,  9)
    await drawText(page, font, deal.city ?? '',             38, H - 288,  9)
    await drawText(page, font, deal.state ?? 'NC',         260, H - 288,  9)
    await drawText(page, font, deal.zip ?? '',             360, H - 288,  9)
    await drawText(page, font, fmt(deal.sale_price),       420, H - 248,  9)
    await drawText(page, font, fmtDate(deal.sale_date),    420, H - 288,  9)
  }

  const pdfBytes = await doc.save()
  const blob = new Blob([new Uint8Array(pdfBytes).buffer as ArrayBuffer], { type: 'application/pdf' })
  return { blob, url: URL.createObjectURL(blob), formId: 'MVR-2', fieldsFilled: filled, fieldsNotFound: notFound, usedFallback }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fillDMVForm(formId: DMVFormId, deal: DealSummary): Promise<FillResult> {
  switch (formId) {
    case 'MVR-180': return fillMVR180(deal)
    case 'MVR-181': return fillMVR181(deal)
    case 'MVR-1':   return fillMVR1(deal)
    case 'MVR-2':   return fillMVR2(deal)
    default: throw new Error(`Unknown form: ${formId}`)
  }
}

/** Map NCFormType to DMVFormId */
export function toDMVFormId(formType: string): DMVFormId | null {
  const map: Record<string, DMVFormId> = {
    mvr1: 'MVR-1', mvr180: 'MVR-180', mvr181: 'MVR-181', mvr2: 'MVR-2',
  }
  return map[formType] ?? null
}

/** Check which official forms are available in /public/forms/ */
export async function checkFormsAvailable(): Promise<Record<DMVFormId, boolean>> {
  const results = await Promise.allSettled([
    fetch('/forms/MVR-1.pdf', { method: 'HEAD' }),
    fetch('/forms/MVR-180.pdf', { method: 'HEAD' }),
    fetch('/forms/MVR-181.pdf', { method: 'HEAD' }),
    fetch('/forms/MVR-2.pdf', { method: 'HEAD' }),
  ])
  return {
    'MVR-1':   results[0].status === 'fulfilled' && (results[0].value as Response).ok,
    'MVR-180': results[1].status === 'fulfilled' && (results[1].value as Response).ok,
    'MVR-181': results[2].status === 'fulfilled' && (results[2].value as Response).ok,
    'MVR-2':   results[3].status === 'fulfilled' && (results[3].value as Response).ok,
  }
}
