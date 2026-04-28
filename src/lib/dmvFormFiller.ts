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

    // Coordinates tuned for NC DMV MVR-180 form (Letter size, 72 pts/inch)
    // These are approximate — use discoverFields() to fine-tune
    await drawText(page, font, deal.vin,                   200, H - 192, 10)
    await drawText(page, font, String(deal.year),           72, H - 220,  9)
    await drawText(page, font, deal.make,                  130, H - 220,  9)
    await drawText(page, font, deal.model,                 280, H - 220,  9)
    await drawText(page, font, String(deal.odometer?.toLocaleString()), 72, H - 295, 11)
    await drawText(page, font, deal.buyer_name,             72, H - 380,  9)
    await drawText(page, font, deal.address_line1 ?? '',    72, H - 395,  9)
    await drawText(page, font, `${deal.city ?? ''}, ${deal.state ?? 'NC'} ${deal.zip ?? ''}`, 72, H - 410, 9)
    await drawText(page, font, fmtDate(deal.sale_date),    400, H - 410,  9)
  }

  const pdfBytes = await doc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
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

    await drawText(page, font, deal.vin,           200, H - 192, 10)
    await drawText(page, font, String(deal.year),   72, H - 220,  9)
    await drawText(page, font, deal.make,          130, H - 220,  9)
    await drawText(page, font, deal.model,         280, H - 220,  9)
    await drawText(page, font, deal.color_exterior ?? '', 380, H - 220, 9)
    await drawText(page, font, deal.buyer_name,     72, H - 350,  9)
    await drawText(page, font, fmtDate(deal.sale_date), 400, H - 350, 9)
  }

  const pdfBytes = await doc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
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

    await drawText(page, font, deal.vin,                   200, H - 180, 10)
    await drawText(page, font, String(deal.year),           72, H - 208,  9)
    await drawText(page, font, deal.make,                  130, H - 208,  9)
    await drawText(page, font, deal.model,                 280, H - 208,  9)
    await drawText(page, font, String(deal.odometer?.toLocaleString()), 380, H - 208, 9)
    await drawText(page, font, fmt(deal.sale_price),        72, H - 236,  9)
    await drawText(page, font, fmt(deal.hut_amount),       220, H - 236,  9)
    await drawText(page, font, deal.buyer_name,             72, H - 290,  9)
    await drawText(page, font, deal.address_line1 ?? '',    72, H - 305,  9)
    await drawText(page, font, `${deal.city ?? ''}, ${deal.state ?? 'NC'} ${deal.zip ?? ''}`, 72, H - 320, 9)
    await drawText(page, font, fmtDate(deal.sale_date),    400, H - 320,  9)
  }

  const pdfBytes = await doc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
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

    await drawText(page, font, deal.vin,           200, H - 180, 10)
    await drawText(page, font, String(deal.year),   72, H - 208,  9)
    await drawText(page, font, deal.make,          130, H - 208,  9)
    await drawText(page, font, deal.buyer_name,     72, H - 260,  9)
    await drawText(page, font, deal.address_line1 ?? '', 72, H - 275, 9)
    await drawText(page, font, `${deal.city ?? ''}, ${deal.state ?? 'NC'} ${deal.zip ?? ''}`, 72, H - 290, 9)
    await drawText(page, font, fmt(deal.sale_price),  350, H - 260, 9)
    await drawText(page, font, fmtDate(deal.sale_date), 400, H - 290, 9)
  }

  const pdfBytes = await doc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
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
