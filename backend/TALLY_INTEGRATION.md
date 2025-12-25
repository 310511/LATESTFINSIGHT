# Tally Software Integration Guide

This guide explains how to use the Tally integration features in FinSight.

## Overview

The Tally integration module allows you to:
1. **Export processed documents to Tally XML format** - Convert bank statements, invoices, and other documents into Tally vouchers
2. **Import data into Tally ERP/TallyPrime** - Generate XML files that can be imported directly into Tally

## Supported Document Types

Currently supported for Tally export:
- **Bank Statements** → Payment/Receipt vouchers
- **Invoices** → Sales vouchers
- *More document types coming soon...*

## API Endpoints

### 1. Export to Tally XML

**Endpoint:** `POST /export/tally`

Export already-processed document data to Tally XML format.

**Request Body:**
```json
{
  "data": {
    // Processed document data (from /process endpoint)
    "transactions": [...],
    // ... other fields
  },
  "document_type": "bank_statement",
  "company_name": "Your Company Name" // Optional
}
```

**Response:**
- XML file download
- File name: `tally_export_{document_type}_{timestamp}.xml`

### 2. Process and Export to Tally (Combined)

**Endpoint:** `POST /process/export-tally`

Process a document and export directly to Tally XML in one step.

**Request:**
- Form data with file upload
- `file`: Document file (PDF, Excel, etc.)
- `document_type`: Type of document (e.g., "bank_statement", "invoice")
- `company_name`: Optional Tally company name

**Response:**
- XML file ready for import into Tally

**Example using curl:**
```bash
curl -X POST "http://localhost:8000/process/export-tally" \
  -F "file=@bank_statement.pdf" \
  -F "document_type=bank_statement" \
  -F "company_name=My Company"
```

## How to Import into Tally

### Method 1: Direct XML Import

1. **Generate XML file** using the API endpoints above
2. **Open Tally ERP/TallyPrime**
3. **Go to:** Gateway of Tally → Import of Data → XML Files
4. **Select** the generated XML file
5. **Click Import**
6. **Verify** vouchers are created in Tally

### Method 2: Using Tally Gateway

1. **Enable Gateway Server** in Tally:
   - Press F11 → Set "Enable Tally Gateway Server" to Yes
   - Set port (default: 9000)

2. **Send XML via HTTP** (if implementing HTTP integration)

## Voucher Types Generated

### Bank Statement → Payment/Receipt Vouchers

- **Credit transactions** → Receipt Vouchers
  - Dr: Bank Account
  - Cr: Party (transaction description)
  
- **Debit transactions** → Payment Vouchers
  - Dr: Party (transaction description)
  - Cr: Bank Account

### Invoice → Sales Voucher

- **Sales Voucher** with:
  - Party: Buyer name
  - Items: Invoice line items
  - Sales Account: Credit
  - Party Account: Debit

## Example Workflow

### Step 1: Process Bank Statement
```bash
curl -X POST "http://localhost:8000/process" \
  -F "file=@bank_statement.pdf" \
  -F "document_type=bank_statement"
```

### Step 2: Export to Tally
```python
import requests

# Process document
response = requests.post(
    "http://localhost:8000/process",
    files={"file": open("bank_statement.pdf", "rb")},
    data={"document_type": "bank_statement"}
)
data = response.json()

# Export to Tally
tally_response = requests.post(
    "http://localhost:8000/export/tally",
    json={
        "data": data,
        "document_type": "bank_statement",
        "company_name": "My Company"
    }
)

# Save XML file
with open("tally_export.xml", "wb") as f:
    f.write(tally_response.content)
```

### Step 3: Import into Tally
1. Open Tally
2. Gateway of Tally → Import of Data → XML Files
3. Select `tally_export.xml`
4. Click Import

## Advanced Usage

### Custom Ledger Mapping

You can customize ledger names by modifying the voucher creation functions in `tally_integration.py`:

```python
# Example: Custom bank account name
voucher = generator.create_payment_voucher(
    voucher_date="2024-01-15",
    party_name="Supplier Name",
    amount=5000.00,
    ledger_name="ICICI Bank"  # Custom ledger
)
```

### Multiple Vouchers

The system automatically creates separate vouchers for each transaction:
- Each bank transaction = 1 voucher
- Each invoice = 1 sales voucher

## Troubleshooting

### Issue: XML file not importing in Tally

**Solutions:**
1. **Check company name** - Ensure it matches exactly with your Tally company name
2. **Verify ledger names** - Ledgers must exist in Tally (e.g., "Cash", "Bank Account")
3. **Check date format** - Dates should be in valid format
4. **Validate XML** - Ensure XML is well-formed

### Issue: Ledgers not found

**Solutions:**
1. Create required ledgers in Tally first:
   - Cash
   - Bank Account
   - Sales Account
   - Party ledgers (can be auto-created)
2. Or modify ledger names in the code to match your Tally setup

### Issue: Amount mismatch

**Solutions:**
1. Check if amounts are properly extracted from documents
2. Verify decimal formatting
3. Ensure credit/debit logic is correct

## Future Enhancements

Planned features:
- Purchase voucher support
- Journal voucher support for trial balance
- GST voucher support
- Multi-company support
- Direct Tally API integration (if available)
- Bidirectional sync (import FROM Tally)

## Support

For issues or questions:
1. Check Tally documentation: https://help.tallysolutions.com
2. Review XML structure in generated files
3. Verify Tally version compatibility (Tally ERP 9, TallyPrime)

## Notes

- **Tally Version Compatibility:** Works with Tally ERP 9 and TallyPrime
- **Ledger Creation:** Party ledgers may be auto-created by Tally if they don't exist
- **XML Format:** Uses standard Tally XML import format
- **Character Encoding:** XML files use UTF-8 encoding

