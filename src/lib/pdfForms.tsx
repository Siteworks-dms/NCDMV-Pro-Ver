import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Font,
  PDFDownloadLink, pdf,
} from '@react-pdf/renderer'
import type { DealSummary } from '@/types/database'

// ── Shared styles ────────────────────────────────────────────────────────────
const BASE = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, padding: 36, color: '#111' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 8, textAlign: 'center', color: '#555', marginBottom: 14 },
  sectionHeader: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.8, color: '#444', marginTop: 10, marginBottom: 4, borderBottomWidth: 0.5, borderBottomColor: '#ccc', paddingBottom: 2 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 5 },
  field: { flex: 1 },
  label: { fontSize: 7, color: '#666', marginBottom: 1.5 },
  value: { fontSize: 9, borderBottomWidth: 0.5, borderBottomColor: '#888', paddingBottom: 2, minHeight: 14 },
  valueBox: { fontSize: 9, borderWidth: 0.5, borderColor: '#888', padding: '3 6', minHeight: 16 },
  sigBlock: { marginTop: 10, flexDirection: 'row', gap: 20 },
  sigLine: { flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#000', paddingBottom: 2, marginTop: 24, fontSize: 7, color: '#555' },
  ncBadge: { backgroundColor: '#FEF3DB', borderWidth: 0.5, borderColor: '#C67C0F', padding: '2 6', borderRadius: 3, fontSize: 7, color: '#7A4C00', alignSelf: 'flex-start' },
  warningBox: { backgroundColor: '#FBEAEA', borderWidth: 0.5, borderColor: '#B03030', padding: '5 8', borderRadius: 3, marginVertical: 6 },
  warningText: { fontSize: 7.5, color: '#B03030', fontFamily: 'Helvetica-Bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: '#e5e5e5' },
  totalLabel: { fontSize: 8, color: '#444' },
  totalValue: { fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#000', marginTop: 2 },
  grandLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  grandValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  pageNum: { position: 'absolute', bottom: 20, right: 36, fontSize: 7, color: '#999' },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 120, fontSize: 6.5, color: '#999' },
  checkbox: { width: 10, height: 10, borderWidth: 0.5, borderColor: '#000', marginRight: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  checkLabel: { fontSize: 8 },
})

const fmt = (val: number | null | undefined) =>
  val != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val) : '—'

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '________________'

// ── Helper components ────────────────────────────────────────────────────────
const F = ({ label, value, flex = 1 }: { label: string; value?: string | null; flex?: number }) => (
  <View style={[BASE.field, { flex }]}>
    <Text style={BASE.label}>{label}</Text>
    <Text style={BASE.value}>{value ?? ''}</Text>
  </View>
)

const SH = ({ children }: { children: string }) => <Text style={BASE.sectionHeader}>{children}</Text>

// ── BILL OF SALE / BUYER'S ORDER ─────────────────────────────────────────────
export function BillOfSalePDF({ deal }: { deal: DealSummary & { dealer?: { legal_name: string; trade_name: string; nc_dealer_license: string; address_line1: string; city: string; state: string; zip: string; phone: string } } }) {
  const d = deal
  const hutNote = d.hut_capped ? ' (CAPPED at $2,000.00)' : ''

  return (
    <Document title={`Bill of Sale — ${d.deal_number}`}>
      <Page size="LETTER" style={BASE.page}>
        {/* Header */}
        <Text style={BASE.title}>BILL OF SALE / BUYER'S ORDER</Text>
        <Text style={BASE.subtitle}>North Carolina — 19A N.C. Admin. Code 03D .0228 Compliant</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={BASE.ncBadge}><Text>NC DEALER COMPLIANT</Text></View>
          <Text style={{ fontSize: 8, color: '#555' }}>Deal #{d.deal_number} · Sale Date: {fmtDate(d.sale_date)}</Text>
        </View>

        {/* Dealer */}
        <SH>Seller (Dealer)</SH>
        <View style={BASE.row}>
          <F label="Dealer Legal Name" value={d.dealer?.legal_name ?? 'DEALER NAME'} flex={2} />
          <F label="NC Dealer License #" value={d.dealer?.nc_dealer_license} />
        </View>
        <View style={BASE.row}>
          <F label="Dealer Address" value={`${d.dealer?.address_line1 ?? ''}, ${d.dealer?.city ?? ''}, ${d.dealer?.state ?? 'NC'} ${d.dealer?.zip ?? ''}`} flex={2} />
          <F label="Phone" value={d.dealer?.phone} />
        </View>

        {/* Buyer */}
        <SH>Buyer Information</SH>
        <View style={BASE.row}>
          <F label="Buyer Full Legal Name" value={d.buyer_name} flex={2} />
        </View>
        <View style={BASE.row}>
          <F label="Buyer Address" value={d.address_line1} flex={2} />
          <F label="City" value={d.city} />
          <F label="State" value={d.state} />
          <F label="ZIP" value={d.zip} />
        </View>

        {/* Vehicle */}
        <SH>Vehicle Description</SH>
        <View style={BASE.row}>
          <F label="Year" value={String(d.year)} />
          <F label="Make" value={d.make} />
          <F label="Model" value={d.model} />
          <F label="Trim" value={d.trim} />
        </View>
        <View style={BASE.row}>
          <F label="VIN (17 Characters)" value={d.vin} flex={2} />
          <F label="Color" value={d.color_exterior} />
          <F label="Odometer" value={`${d.odometer?.toLocaleString()} mi`} />
        </View>
        <View style={BASE.row}>
          <F label="Warranty Type" value={d.warranty_type === 'as_is' ? 'AS IS — NO WARRANTY' : d.warranty_type.replace('_',' ').toUpperCase()} />
          <F label="Payment Method" value={d.payment_type.replace('_',' ').toUpperCase()} />
          <F label="Title #" value="" />
        </View>

        {/* Financial breakdown */}
        <SH>Financial Summary — Itemized per 19A NCAC 03D .0228</SH>
        <View style={{ marginTop: 4 }}>
          {[
            { label: '1.  Vehicle Sale Price',          value: fmt(d.sale_price) },
            { label: '2.  Less: Trade-In Allowance',   value: d.trade_allowance > 0 ? `(${fmt(d.trade_allowance)})` : '—' },
            { label: '3.  Adjusted Selling Price',      value: fmt((d.sale_price ?? 0) - (d.trade_allowance ?? 0)), bold: true },
          ].map(({ label, value, bold }) => (
            <View key={label} style={BASE.totalRow}>
              <Text style={[BASE.totalLabel, bold ? { fontFamily: 'Helvetica-Bold' } : {}]}>{label}</Text>
              <Text style={[BASE.totalValue, bold ? { fontFamily: 'Helvetica-Bold' } : {}]}>{value}</Text>
            </View>
          ))}
          <View style={[BASE.totalRow, { backgroundColor: '#FBEAEA' }]}>
            <Text style={[BASE.totalLabel, { color: '#B03030', fontFamily: 'Helvetica-Bold' }]}>
              4.  NC Highway-Use Tax (3.0%){hutNote}
            </Text>
            <Text style={[BASE.totalValue, { color: '#B03030', fontFamily: 'Helvetica-Bold' }]}>{fmt(d.hut_amount)}</Text>
          </View>
          {[
            { label: '5.  Title Fee',                  value: fmt(58) },
            { label: '6.  Registration Fee',           value: '—' },
            { label: '7.  Doc Prep Fee (max $599)',    value: fmt(d.doc_fee) },
          ].map(({ label, value }) => (
            <View key={label} style={BASE.totalRow}>
              <Text style={BASE.totalLabel}>{label}</Text>
              <Text style={BASE.totalValue}>{value}</Text>
            </View>
          ))}
          <View style={[BASE.grandTotal, { marginTop: 6 }]}>
            <Text style={BASE.grandLabel}>TOTAL AMOUNT DUE</Text>
            <Text style={BASE.grandValue}>{fmt(d.total_amount_due)}</Text>
          </View>
          <View style={BASE.totalRow}>
            <Text style={BASE.totalLabel}>Less: Cash Down Payment</Text>
            <Text style={BASE.totalValue}>{d.cash_down > 0 ? `(${fmt(d.cash_down)})` : '—'}</Text>
          </View>
          <View style={[BASE.totalRow, { borderBottomWidth: 0 }]}>
            <Text style={[BASE.totalLabel, { fontFamily: 'Helvetica-Bold' }]}>Amount Financed</Text>
            <Text style={[BASE.totalValue, { fontFamily: 'Helvetica-Bold' }]}>{fmt(d.amount_financed)}</Text>
          </View>
        </View>

        {/* HUT statutory note */}
        <View style={[BASE.warningBox, { marginTop: 8 }]}>
          <Text style={BASE.warningText}>
            NC HIGHWAY-USE TAX: {fmt(d.hut_amount)}{hutNote} — Calculated per N.C.G.S. §105-187.3 at 3% of adjusted selling price.
            Max $2,000.00 per transaction. Dealer is responsible for remitting to NCDOR.
          </Text>
        </View>

        {/* Signatures */}
        <SH>Signatures</SH>
        <Text style={{ fontSize: 7.5, color: '#555', marginBottom: 8 }}>
          By signing below, buyer acknowledges receipt of this Buyer's Order, the FTC Buyer's Guide, all required NC DMV forms,
          and that all information provided is accurate to the best of their knowledge.
        </Text>
        <View style={BASE.sigBlock}>
          <View style={{ flex: 1 }}>
            <Text style={BASE.sigLine}>Buyer Signature</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Date: _________________</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={BASE.sigLine}>Dealer Representative Signature</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Date: _________________</Text>
          </View>
        </View>

        <Text style={BASE.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        <Text style={BASE.footer} fixed>NC AutoDealer DMS Pro · Generated {new Date().toLocaleDateString()} · Deal {d.deal_number}</Text>
      </Page>
    </Document>
  )
}

// ── MVR-180: ODOMETER DISCLOSURE ─────────────────────────────────────────────
export function MVR180PDF({ deal }: { deal: DealSummary }) {
  return (
    <Document title={`MVR-180 — ${deal.deal_number}`}>
      <Page size="LETTER" style={BASE.page}>
        <Text style={BASE.title}>NORTH CAROLINA ODOMETER DISCLOSURE STATEMENT</Text>
        <Text style={BASE.subtitle}>Form MVR-180 · Federal Law 49 U.S.C. §32705 · NC GS §20-108</Text>

        <View style={[BASE.warningBox, { marginTop: 8, marginBottom: 12 }]}>
          <Text style={BASE.warningText}>
            FEDERAL LAW: Failure to complete or providing a false statement may result in fines and/or imprisonment.
            See 49 U.S.C. §32709. Required for vehicles under 10 model years old under 16,000 lbs GVWR.
          </Text>
        </View>

        <SH>Vehicle Description</SH>
        <View style={BASE.row}>
          <F label="Year" value={String(deal.year)} />
          <F label="Make" value={deal.make} />
          <F label="Model" value={deal.model} />
          <F label="Body Style" value="" />
        </View>
        <View style={BASE.row}>
          <F label="Vehicle Identification Number (VIN)" value={deal.vin} flex={2} />
          <F label="License Plate #" value="" />
          <F label="State" value="NC" />
        </View>

        <SH>Odometer Disclosure</SH>
        <View style={{ marginVertical: 8 }}>
          <Text style={{ fontSize: 9, marginBottom: 6 }}>
            I, the transferor (seller), state that the odometer of the above vehicle now reads:
          </Text>
          <View style={[BASE.valueBox, { marginBottom: 8, padding: '6 10' }]}>
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>
              {deal.odometer?.toLocaleString() ?? '____________'} MILES
            </Text>
          </View>
          <Text style={{ fontSize: 8, marginBottom: 6 }}>and to the best of my knowledge the odometer reading is:</Text>

          {[
            { id: 'actual',    label: '☑  ACTUAL MILEAGE — The odometer reading reflects the actual mileage of the vehicle.' },
            { id: 'warning',   label: '☐  WARNING: ODOMETER DISCREPANCY — The odometer reading is NOT actual mileage.' },
            { id: 'exceeds',   label: '☐  EXCEEDS MECHANICAL LIMITS — The odometer reading exceeds mechanical limits.' },
          ].map(opt => (
            <View key={opt.id} style={BASE.checkRow}>
              <Text style={{ fontSize: 8.5, marginBottom: 3 }}>{opt.label}</Text>
            </View>
          ))}
        </View>

        <SH>Transferor (Seller) Statement</SH>
        <View style={BASE.row}>
          <F label="Transferor (Dealer) Name" value="" flex={2} />
          <F label="NC Dealer License #" value="" />
        </View>
        <View style={BASE.sigBlock}>
          <View style={{ flex: 1 }}>
            <Text style={BASE.sigLine}>Transferor Signature</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Printed Name: _______________________</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Date: _________________</Text>
          </View>
        </View>

        <SH>Transferee (Buyer) Acknowledgment</SH>
        <View style={BASE.row}>
          <F label="Buyer Full Legal Name" value={deal.buyer_name} flex={2} />
        </View>
        <View style={BASE.row}>
          <F label="Buyer Address" value={deal.address_line1} flex={2} />
          <F label="City" value={deal.city} />
          <F label="State" value={deal.state} />
          <F label="ZIP" value={deal.zip} />
        </View>
        <View style={BASE.sigBlock}>
          <View style={{ flex: 1 }}>
            <Text style={BASE.sigLine}>Transferee (Buyer) Signature</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Date: _________________</Text>
          </View>
        </View>

        <Text style={BASE.footer} fixed>MVR-180 · NC AutoDealer DMS Pro · Deal {deal.deal_number} · {fmtDate(deal.sale_date)}</Text>
      </Page>
    </Document>
  )
}

// ── MVR-181: DAMAGE DISCLOSURE ───────────────────────────────────────────────
export function MVR181PDF({ deal }: { deal: DealSummary }) {
  return (
    <Document title={`MVR-181 — ${deal.deal_number}`}>
      <Page size="LETTER" style={BASE.page}>
        <Text style={BASE.title}>NORTH CAROLINA DAMAGE DISCLOSURE STATEMENT</Text>
        <Text style={BASE.subtitle}>Form MVR-181 · NC General Statute §20-71.4</Text>

        <View style={[BASE.warningBox, { marginTop: 8, marginBottom: 12 }]}>
          <Text style={BASE.warningText}>
            REQUIRED: This form is required when a vehicle has sustained damage exceeding 25% of its fair market value.
            Failure to disclose known damage is a Class I felony under NC GS §20-71.4.
          </Text>
        </View>

        <SH>Vehicle Description</SH>
        <View style={BASE.row}>
          <F label="Year" value={String(deal.year)} />
          <F label="Make" value={deal.make} />
          <F label="Model" value={deal.model} />
        </View>
        <View style={BASE.row}>
          <F label="VIN" value={deal.vin} flex={2} />
          <F label="Color" value={deal.color_exterior} />
        </View>

        <SH>Damage Disclosure</SH>
        <Text style={{ fontSize: 8, marginBottom: 8, color: '#555' }}>
          Check all that apply and provide details below:
        </Text>
        {[
          'Vehicle sustained damage exceeding 25% of fair market value',
          'Vehicle was declared a total loss by an insurance company',
          'Vehicle has a flood / water damage history',
          'Vehicle has a salvage or rebuilt title',
          'Airbag(s) were deployed and replaced',
          'Airbag(s) were deployed and NOT replaced',
          'Vehicle was involved in a prior accident (damage repaired)',
        ].map((item, i) => (
          <View key={i} style={[BASE.checkRow, { marginBottom: 5 }]}>
            <View style={BASE.checkbox} />
            <Text style={BASE.checkLabel}>{item}</Text>
          </View>
        ))}

        <View style={{ marginTop: 8 }}>
          <Text style={BASE.label}>Description of Damage, Repairs Made, and Repair Shops Used:</Text>
          <View style={[BASE.valueBox, { minHeight: 60, marginTop: 3 }]}>
            <Text> </Text>
          </View>
        </View>

        <View style={BASE.row}>
          <F label="Estimated Repair Cost" value="" />
          <F label="Fair Market Value at Time of Damage" value="" />
          <F label="% of FMV" value="" />
        </View>

        <SH>Seller Certification</SH>
        <Text style={{ fontSize: 8, color: '#555', marginBottom: 8 }}>
          I certify that the above information is true and accurate to the best of my knowledge.
          I understand that making a false statement on this form is a criminal offense.
        </Text>
        <View style={BASE.sigBlock}>
          <View style={{ flex: 1 }}>
            <Text style={BASE.sigLine}>Seller Signature</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Printed Name: _______________________ Date: __________</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={BASE.sigLine}>Buyer Acknowledgment Signature</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Printed Name: _______________________ Date: __________</Text>
          </View>
        </View>

        <Text style={BASE.footer} fixed>MVR-181 · NC AutoDealer DMS Pro · Deal {deal.deal_number}</Text>
      </Page>
    </Document>
  )
}

// ── FTC BUYER'S GUIDE ────────────────────────────────────────────────────────
export function FTCBuyersGuidePDF({ deal }: { deal: DealSummary }) {
  const isAsIs = deal.warranty_type === 'as_is'
  return (
    <Document title={`FTC Buyer's Guide — ${deal.deal_number}`}>
      <Page size="LETTER" style={BASE.page}>
        <Text style={[BASE.title, { fontSize: 16 }]}>BUYER'S GUIDE</Text>
        <Text style={[BASE.subtitle, { fontSize: 9, marginBottom: 6 }]}>
          IMPORTANT: Spoken promises are difficult to enforce. Ask the dealer to put all promises in writing.
          Keep this form. Federal Trade Commission Used Car Rule (16 CFR Part 455).
        </Text>

        <SH>Vehicle</SH>
        <View style={BASE.row}>
          <F label="Year" value={String(deal.year)} />
          <F label="Make" value={deal.make} />
          <F label="Model" value={deal.model} />
          <F label="VIN" value={deal.vin} />
        </View>

        <SH>Warranty</SH>
        {/* AS IS */}
        <View style={[BASE.checkRow, { marginTop: 6 }]}>
          <View style={[BASE.checkbox, isAsIs ? { backgroundColor: '#000' } : {}]} />
          <Text style={[BASE.checkLabel, { fontFamily: isAsIs ? 'Helvetica-Bold' : 'Helvetica', fontSize: 11 }]}>
            AS IS — NO WARRANTY
          </Text>
        </View>
        {isAsIs && (
          <View style={[BASE.warningBox, { marginLeft: 14, marginTop: 4 }]}>
            <Text style={[BASE.warningText, { fontFamily: 'Helvetica-Bold', fontSize: 9 }]}>
              YOU WILL PAY ALL COSTS FOR ANY REPAIRS. The dealer assumes no responsibility for any repairs
              regardless of any oral statements about the vehicle.
            </Text>
          </View>
        )}

        {/* WARRANTY */}
        <View style={[BASE.checkRow, { marginTop: 8 }]}>
          <View style={[BASE.checkbox, !isAsIs ? { backgroundColor: '#000' } : {}]} />
          <Text style={[BASE.checkLabel, { fontFamily: !isAsIs ? 'Helvetica-Bold' : 'Helvetica', fontSize: 11 }]}>
            WARRANTY
          </Text>
        </View>
        {!isAsIs && (
          <View style={{ marginLeft: 14, marginTop: 4 }}>
            <View style={BASE.row}>
              <F label="Full Warranty" value={deal.warranty_type === 'full_warranty' ? '✓' : '☐'} />
              <F label="Limited Warranty" value={deal.warranty_type === 'limited_warranty' ? '✓' : '☐'} flex={2} />
            </View>
            <F label="Systems Covered" value="" />
            <View style={BASE.row}>
              <F label="Duration" value="" />
              <F label="Dealer pays ___% of labor and parts" value="" flex={2} />
            </View>
          </View>
        )}

        <SH>Major Defects — This Vehicle May Have Problems With:</SH>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {['Engine', 'Transmission', 'Brakes', 'Electrical', 'Fuel System', 'Cooling System',
            'Drive Axle', 'Air Conditioning', 'Steering', 'Exhaust', 'Body / Paint', 'Frame / Unibody'].map(item => (
            <View key={item} style={[BASE.checkRow, { width: '30%' }]}>
              <View style={[BASE.checkbox, { width: 8, height: 8 }]} />
              <Text style={{ fontSize: 7.5 }}>{item}</Text>
            </View>
          ))}
        </View>

        <SH>NC Implied Warranty Notice</SH>
        <Text style={{ fontSize: 7.5, color: '#555', marginBottom: 6 }}>
          North Carolina law gives you some rights to recover damages if you buy a vehicle and it turns out to be defective.
          Contact a lawyer or the North Carolina Department of Justice for information about your legal rights.
          NC Attorney General Consumer Protection: (919) 716-6000.
        </Text>

        <SH>Pre-Purchase Inspection</SH>
        <Text style={{ fontSize: 7.5, color: '#555', marginBottom: 8 }}>
          ASK THE DEALER IF YOU MAY HAVE THIS VEHICLE INSPECTED BY YOUR MECHANIC EITHER ON OR OFF THE LOT.
        </Text>

        <View style={[BASE.sigBlock, { marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <F label="Dealer Name" value="" />
            <Text style={BASE.sigLine}>Dealer Signature</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Date: _________________</Text>
          </View>
          <View style={{ flex: 1 }}>
            <F label="Buyer Name" value={deal.buyer_name} />
            <Text style={BASE.sigLine}>Buyer Signature</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Date: _________________</Text>
          </View>
        </View>

        <Text style={[BASE.subtitle, { marginTop: 10, fontSize: 7 }]}>
          FTC Buyer's Guide — 16 CFR Part 455. WINDOW COPY: Post on vehicle window during display. BUYER COPY: Give to buyer at sale.
        </Text>
        <Text style={BASE.footer} fixed>FTC Buyer's Guide · NC AutoDealer DMS Pro · Deal {deal.deal_number}</Text>
      </Page>
    </Document>
  )
}

// ── MVR-1: TITLE APPLICATION (abbreviated — notarization block) ───────────────
export function MVR1PDF({ deal }: { deal: DealSummary }) {
  return (
    <Document title={`MVR-1 — ${deal.deal_number}`}>
      <Page size="LETTER" style={BASE.page}>
        <Text style={BASE.title}>APPLICATION FOR CERTIFICATE OF TITLE</Text>
        <Text style={BASE.subtitle}>Form MVR-1 · North Carolina Division of Motor Vehicles · NC GS §20-75</Text>

        <View style={[BASE.warningBox, { marginBottom: 10 }]}>
          <Text style={BASE.warningText}>
            ⚠ NOTARIZATION REQUIRED: This form must be signed in the presence of a Notary Public.
            NC dealers may use Remote Online Notarization (RON) per NC GS §10B-134.1 et seq.
            Title must be filed with NCDMV within 28 days of sale date: {fmtDate(deal.sale_date)}.
            DEADLINE: {fmtDate(deal.title_filing_due)}
          </Text>
        </View>

        <SH>Vehicle Information</SH>
        <View style={BASE.row}>
          <F label="Year" value={String(deal.year)} />
          <F label="Make" value={deal.make} />
          <F label="Model" value={deal.model} />
          <F label="Body Style" value="" />
        </View>
        <View style={BASE.row}>
          <F label="VIN (17 Characters)" value={deal.vin} flex={2} />
          <F label="Odometer" value={`${deal.odometer?.toLocaleString()} mi`} />
          <F label="Title #" value="" />
        </View>

        <SH>Seller (Dealer)</SH>
        <View style={BASE.row}>
          <F label="Dealer Name" value="" flex={2} />
          <F label="NC Dealer License #" value="" />
        </View>
        <View style={BASE.row}>
          <F label="Address" value="" flex={2} />
          <F label="City" value="" />
          <F label="ZIP" value="" />
        </View>

        <SH>Buyer</SH>
        <View style={BASE.row}>
          <F label="Buyer Full Legal Name" value={deal.buyer_name} flex={2} />
          <F label="Date of Birth" value="" />
        </View>
        <View style={BASE.row}>
          <F label="Address" value={deal.address_line1} flex={2} />
          <F label="City" value={deal.city} />
          <F label="State" value={deal.state} />
          <F label="ZIP" value={deal.zip} />
        </View>
        <View style={BASE.row}>
          <F label="Driver's License #" value="" />
          <F label="DL State" value="NC" />
          <F label="Purchase Price" value={fmt(deal.sale_price)} />
          <F label="NC HUT Paid" value={fmt(deal.hut_amount)} />
        </View>

        <SH>Lien Information (If Applicable)</SH>
        <View style={BASE.row}>
          <F label="First Lienholder Name" value="" flex={2} />
          <F label="ELT Lender Code" value="" />
        </View>
        <View style={BASE.row}>
          <F label="Lienholder Address" value="" flex={2} />
          <F label="City" value="" />
          <F label="State" value="" />
        </View>

        {/* Seller certification */}
        <SH>Seller Certification</SH>
        <Text style={{ fontSize: 8, color: '#555', marginBottom: 6 }}>
          I certify that the information above is true and accurate, that I have clear title to the above vehicle,
          and that the odometer reading is accurate to the best of my knowledge.
        </Text>
        <View style={BASE.sigBlock}>
          <View style={{ flex: 1 }}>
            <Text style={BASE.sigLine}>Seller / Dealer Signature</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Printed Name: _______________________  Date: __________</Text>
          </View>
        </View>

        {/* Notary block */}
        <View style={{ marginTop: 14, borderWidth: 1, borderColor: '#000', padding: 10, borderRadius: 3 }}>
          <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginBottom: 6 }}>NOTARIZATION — REQUIRED FOR MVR-1</Text>
          <Text style={{ fontSize: 8, marginBottom: 10 }}>
            State of North Carolina, County of _______________________________
          </Text>
          <Text style={{ fontSize: 8, marginBottom: 16 }}>
            Sworn to (or affirmed) and subscribed before me this _______ day of _________________, 20_____
          </Text>
          <View style={BASE.row}>
            <View style={{ flex: 1 }}>
              <Text style={BASE.sigLine}>Notary Public Signature</Text>
              <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Notary Commission Expires: _________________</Text>
            </View>
            <View style={{ width: 80, height: 60, borderWidth: 0.5, borderColor: '#888', borderRadius: 3, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 7, color: '#aaa', textAlign: 'center' }}>NOTARY{'\n'}SEAL</Text>
            </View>
          </View>
        </View>

        <Text style={BASE.footer} fixed>MVR-1 · NC AutoDealer DMS Pro · Deal {deal.deal_number} · TITLE DUE: {fmtDate(deal.title_filing_due)}</Text>
      </Page>
    </Document>
  )
}

// ── MVR-2: DEALER REASSIGNMENT ───────────────────────────────────────────────
export function MVR2PDF({ deal }: { deal: DealSummary }) {
  return (
    <Document title={`MVR-2 — ${deal.deal_number}`}>
      <Page size="LETTER" style={BASE.page}>
        <Text style={BASE.title}>DEALER'S REASSIGNMENT OF TITLE</Text>
        <Text style={BASE.subtitle}>Form MVR-2 · North Carolina Division of Motor Vehicles</Text>

        <SH>Vehicle</SH>
        <View style={BASE.row}>
          <F label="VIN" value={deal.vin} flex={2} />
          <F label="Year" value={String(deal.year)} />
          <F label="Make" value={deal.make} />
        </View>

        <SH>Dealer Information</SH>
        <View style={BASE.row}>
          <F label="Dealer Trade Name" value="" flex={2} />
          <F label="NC Dealer License #" value="" />
        </View>
        <View style={BASE.row}>
          <F label="Dealer Address" value="" flex={2} />
          <F label="City" value="" />
          <F label="State" value="NC" />
        </View>

        <SH>Reassignment</SH>
        <Text style={{ fontSize: 8.5, marginBottom: 6 }}>
          The above-described vehicle is hereby reassigned to:
        </Text>
        <View style={BASE.row}>
          <F label="Buyer Full Legal Name" value={deal.buyer_name} flex={2} />
        </View>
        <View style={BASE.row}>
          <F label="Buyer Address" value={deal.address_line1} flex={2} />
          <F label="City" value={deal.city} />
          <F label="State" value={deal.state} />
          <F label="ZIP" value={deal.zip} />
        </View>
        <View style={BASE.row}>
          <F label="Date of Reassignment" value={fmtDate(deal.sale_date)} />
          <F label="Reassignment Price" value={fmt(deal.sale_price)} />
          <F label="Odometer Reading" value={`${deal.odometer?.toLocaleString()} mi`} />
        </View>

        <SH>Dealer Certification</SH>
        <Text style={{ fontSize: 8, color: '#555', marginBottom: 8 }}>
          I certify that I am a licensed NC motor vehicle dealer and that the information above is true and accurate.
        </Text>
        <View style={BASE.sigBlock}>
          <View style={{ flex: 1 }}>
            <Text style={BASE.sigLine}>Authorized Dealer Representative Signature</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Printed Name: _______________________  Date: __________</Text>
          </View>
        </View>

        <Text style={BASE.footer} fixed>MVR-2 · NC AutoDealer DMS Pro · Deal {deal.deal_number}</Text>
      </Page>
    </Document>
  )
}

// ── PDF Generation utilities ─────────────────────────────────────────────────

export type PDFFormType = 'bill_of_sale' | 'mvr180' | 'mvr181' | 'ftc_buyers_guide' | 'mvr1' | 'mvr2'

/** Generate a PDF blob for a given form type */
export async function generatePDFBlob(formType: PDFFormType, deal: DealSummary): Promise<Blob> {
  let doc: React.ReactElement

  switch (formType) {
    case 'bill_of_sale':     doc = <BillOfSalePDF deal={deal} />; break
    case 'mvr180':           doc = <MVR180PDF deal={deal} />; break
    case 'mvr181':           doc = <MVR181PDF deal={deal} />; break
    case 'ftc_buyers_guide': doc = <FTCBuyersGuidePDF deal={deal} />; break
    case 'mvr1':             doc = <MVR1PDF deal={deal} />; break
    case 'mvr2':             doc = <MVR2PDF deal={deal} />; break
    default: throw new Error(`Unknown form type: ${formType}`)
  }

  return await pdf(doc).toBlob()
}

/** Download a PDF directly in the browser */
export async function downloadPDF(formType: PDFFormType, deal: DealSummary, fileName?: string) {
  const blob = await generatePDFBlob(formType, deal)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = fileName ?? `${formType}_${deal.deal_number}_${deal.vin}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Upload a generated PDF to Supabase Storage and return the public URL */
export async function uploadPDFToStorage(
  supabaseClient: ReturnType<typeof import('@supabase/supabase-js').createClient>,
  formType: PDFFormType,
  deal: DealSummary,
  dealerId: string
): Promise<string | null> {
  try {
    const blob = await generatePDFBlob(formType, deal)
    const path = `${dealerId}/${deal.id}/${formType}_${Date.now()}.pdf`
    const { error } = await supabaseClient.storage
      .from('nc-forms')
      .upload(path, blob, { contentType: 'application/pdf', upsert: true })
    if (error) throw error
    const { data } = supabaseClient.storage.from('nc-forms').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}

export { PDFDownloadLink }
