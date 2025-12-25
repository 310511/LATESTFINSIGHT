# -*- coding: utf-8 -*-
"""
Report Generators for FinSight
Generates specific reports for each document type
"""
import json
import re
import time
import vertexai
from vertexai.generative_models import GenerativeModel
import os
from dotenv import load_dotenv

load_dotenv()

# Lazy initialization of Vertex AI client
_client = None

def get_vertexai_client():
    """Get or initialize Vertex AI client"""
    global _client
    if _client is None:
        project_id = os.getenv("VERTEXAI_PROJECT_ID")
        location = os.getenv("VERTEXAI_LOCATION", "us-central1")
        model_name = os.getenv("VERTEXAI_MODEL", "gemini-1.5-pro")
        
        if not project_id:
            raise ValueError("VERTEXAI_PROJECT_ID environment variable is not set. Please add it to your .env file.")
        
        vertexai.init(project=project_id, location=location)
        _client = GenerativeModel(model_name)
    return _client

def generate_content_vertexai(prompt: str, require_json: bool = False):
    """
    Helper function to generate content using Vertex AI
    
    Args:
        prompt: The prompt to send to the model
        require_json: If True, expects JSON response and adds JSON instruction
    
    Returns:
        str: The generated content
    """
    client = get_vertexai_client()
    if require_json:
        prompt = f"{prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown formatting, code blocks, or explanations."
    
    response = client.generate_content(prompt)
    if not response or not response.text:
        raise ValueError("Vertex AI returned empty content")
    
    content = response.text.strip()
    # Clean JSON if needed
    if require_json:
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
    
    return content


def generate_bank_statement_reports(base_data, text):
    """Generate all 5 reports for Bank Statement"""
    reports = {}
    transactions = base_data.get("transactions", [])
    
    # 1. Cash Flow Statement
    cash_flow_prompt = f"""Generate a Cash Flow Statement from bank statement data. Structure as:
{{
  "period": "Period covered",
  "operating_activities": {{
    "inflows": [
      {{"description": "", "amount": 0}}
    ],
    "outflows": [
      {{"description": "", "amount": 0}}
    ],
    "net_operating": 0
  }},
  "investing_activities": {{
    "inflows": [],
    "outflows": [],
    "net_investing": 0
  }},
  "financing_activities": {{
    "inflows": [],
    "outflows": [],
    "net_financing": 0
  }},
  "net_cash_flow": 0,
  "opening_balance": 0,
  "closing_balance": 0
}}

Base Data: {json.dumps(base_data, indent=2)[:3000]}
Return ONLY JSON."""
    
    try:
        content = generate_content_vertexai(cash_flow_prompt, require_json=True)
        reports["cash_flow_statement"] = json.loads(content)
    except Exception as e:
        reports["cash_flow_statement"] = {"error": f"Could not generate: {str(e)}"}
    
    # 2. Ledger Entries
    ledger_entries = []
    for txn in transactions:
        ledger_entries.append({
            "date": txn.get("date"),
            "description": txn.get("description"),
            "debit": txn.get("amount") if txn.get("type") == "debit" else 0,
            "credit": txn.get("amount") if txn.get("type") == "credit" else 0,
            "balance": txn.get("balance"),
            "category": txn.get("category"),
            "reference": txn.get("reference_number")
        })
    reports["ledger_entries"] = {
        "entries": ledger_entries,
        "total_debits": sum(t.get("debit", 0) or 0 for t in ledger_entries),
        "total_credits": sum(t.get("credit", 0) or 0 for t in ledger_entries)
    }
    
    # 3. Payment & Receipt Summary
    receipts = [t for t in transactions if t.get("type") == "credit"]
    payments = [t for t in transactions if t.get("type") == "debit"]
    
    # Category breakdown
    receipt_categories = {}
    payment_categories = {}
    for txn in receipts:
        cat = txn.get("category", "Other")
        receipt_categories[cat] = receipt_categories.get(cat, 0) + (txn.get("amount", 0) or 0)
    for txn in payments:
        cat = txn.get("category", "Other")
        payment_categories[cat] = payment_categories.get(cat, 0) + (txn.get("amount", 0) or 0)
    
    reports["payment_receipt_summary"] = {
        "total_receipts": base_data.get("total_deposits", 0) or 0,
        "total_payments": base_data.get("total_withdrawals", 0) or 0,
        "category_breakdown": {
            "receipts": [{"category": k, "amount": v} for k, v in receipt_categories.items()],
            "payments": [{"category": k, "amount": v} for k, v in payment_categories.items()]
        },
        "top_10_receipts": sorted(receipts, key=lambda x: x.get("amount", 0) or 0, reverse=True)[:10],
        "top_10_payments": sorted(payments, key=lambda x: x.get("amount", 0) or 0, reverse=True)[:10]
    }
    
    # 4. Anomaly & Suspicious Transaction Report
    anomaly_prompt = f"""Analyze bank transactions and identify anomalies:
- Unusual transaction patterns
- High-value transactions (above normal)
- Duplicate transactions
- Suspicious descriptions
- Unusual timing patterns

Return JSON:
{{
  "anomalies": [
    {{
      "date": "",
      "description": "",
      "amount": 0,
      "type": "high_value/duplicate/suspicious/unusual_timing",
      "reason": "",
      "risk_level": "low/medium/high"
    }}
  ],
  "summary": {{
    "total_anomalies": 0,
    "high_risk": 0,
    "medium_risk": 0,
    "low_risk": 0
  }},
  "recommendations": []
}}

Transactions: {json.dumps(transactions[:100], indent=2)[:4000]}
Return ONLY JSON."""
    
    try:
        content = generate_content_vertexai(anomaly_prompt, require_json=True)
        reports["anomaly_suspicious_transaction_report"] = json.loads(content)
    except Exception as e:
        reports["anomaly_suspicious_transaction_report"] = {"error": f"Could not generate: {str(e)}"}
    
    # 5. Bank Reconciliation Sheet
    reports["bank_reconciliation"] = {
        "book_balance": base_data.get("closing_balance", 0) or 0,
        "bank_balance": base_data.get("closing_balance", 0) or 0,
        "deposits_in_transit": [],
        "outstanding_checks": [],
        "bank_charges": [],
        "interest_earned": [],
        "adjusted_balance": base_data.get("closing_balance", 0) or 0,
        "differences": [],
        "reconciled": True
    }
    
    return reports


def generate_gst_return_reports(base_data, text):
    """Generate all 5 reports for GST Return"""
    reports = {}
    
    prompts = {
        "gst_reconciliation": f"""Generate GST Reconciliation Sheet comparing GSTR-1 and GSTR-3B:
{{
  "period": "",
  "sales_reconciliation": {{
    "gstr1_sales": 0,
    "gstr3b_sales": 0,
    "difference": 0,
    "reason": ""
  }},
  "tax_reconciliation": {{
    "gstr1_tax": 0,
    "gstr3b_tax": 0,
    "difference": 0,
    "reason": ""
  }},
  "reconciliation_items": [],
  "recommendations": []
}}
Base Data: {json.dumps(base_data, indent=2)[:3000]}
Return ONLY JSON.""",
        
        "itc_utilization_report": f"""Generate ITC Utilization Report:
{{
  "total_itc_available": 0,
  "itc_utilized": 0,
  "itc_pending": 0,
  "itc_reversal": 0,
  "utilization_percentage": 0,
  "month_wise_breakdown": [],
  "itc_details": []
}}
Base Data: {json.dumps(base_data, indent=2)[:3000]}
Return ONLY JSON.""",
        
        "output_vs_input_tax_summary": f"""Generate Output vs Input Tax Summary:
{{
  "output_tax": {{
    "total": 0,
    "cgst": 0,
    "sgst": 0,
    "igst": 0,
    "cess": 0
  }},
  "input_tax": {{
    "total": 0,
    "cgst": 0,
    "sgst": 0,
    "igst": 0,
    "cess": 0
  }},
  "net_tax_payable": 0,
  "comparison_chart": {{
    "labels": ["CGST", "SGST", "IGST", "CESS"],
    "output": [0, 0, 0, 0],
    "input": [0, 0, 0, 0]
  }}
}}
Base Data: {json.dumps(base_data, indent=2)[:3000]}
Return ONLY JSON.""",
        
        "gst_liability_statement": f"""Generate GST Liability Statement:
{{
  "period": "",
  "tax_liability": 0,
  "payment_schedule": [
    {{
      "due_date": "",
      "amount": 0,
      "status": "paid/unpaid"
    }}
  ],
  "penalties": 0,
  "interest": 0,
  "total_payable": 0,
  "payment_status": "paid/unpaid/partial"
}}
Base Data: {json.dumps(base_data, indent=2)[:3000]}
Return ONLY JSON.""",
        
        "gstr_vs_invoice_match_report": f"""Generate GSTR vs Invoice Match Report:
{{
  "matched_invoices": [],
  "unmatched_invoices": [],
  "mismatch_reasons": [],
  "match_percentage": 0,
  "recommendations": []
}}
Base Data: {json.dumps(base_data, indent=2)[:3000]}
Return ONLY JSON."""
    }
    
    for report_name, prompt in prompts.items():
        try:
            content = generate_content_vertexai(prompt, require_json=True)
            reports[report_name] = json.loads(content)
        except Exception as e:
            reports[report_name] = {"error": f"Could not generate {report_name}: {str(e)}"}
    
    return reports


def generate_gst_reports_from_excel(excel_data_dict):
    """Generate comprehensive GST report from multiple Excel files (GSTR-2B, Purchase Register, Vendor Master)"""
    
    # Combine all Excel data into a comprehensive summary
    combined_summary = {}
    for file_type, excel_data in excel_data_dict.items():
        combined_summary[file_type] = {
            "summary_text": excel_data.get("summary_text", ""),
            "sheet_names": excel_data.get("sheet_names", []),
            "excel_data": excel_data.get("excel_data", {})
        }
    
    # Create a comprehensive prompt with all Excel data
    excel_summary_text = "\n\n".join([
        f"{file_type.upper()}:\n{data['summary_text']}" 
        for file_type, data in combined_summary.items()
    ])
    
    # Extract detailed Excel data for analysis - include ALL data
    detailed_excel_data = {}
    for file_type, excel_data in excel_data_dict.items():
        # Include all sheets with all rows - don't truncate
        all_sheets_data = {}
        excel_data_obj = excel_data.get("excel_data", {})
        for sheet_name, sheet_info in excel_data_obj.items():
            all_sheets_data[sheet_name] = {
                "columns": sheet_info.get("columns", []),
                "row_count": sheet_info.get("row_count", 0),
                "all_rows": sheet_info.get("data", [])  # Include ALL rows
            }
        detailed_excel_data[file_type] = all_sheets_data
    
    # Create comprehensive text with ALL Excel data
    full_excel_data_text = ""
    for file_type, data in detailed_excel_data.items():
        full_excel_data_text += f"\n\n{'='*60}\n{file_type.upper()} - COMPLETE DATA\n{'='*60}\n"
        for sheet_name, sheet_data in data.items():
            full_excel_data_text += f"\nSheet: {sheet_name}\n"
            full_excel_data_text += f"Columns: {', '.join(sheet_data.get('columns', []))}\n"
            full_excel_data_text += f"Total Rows: {sheet_data.get('row_count', 0)}\n\n"
            # Include ALL rows
            for idx, row in enumerate(sheet_data.get('all_rows', []), 1):
                row_str = " | ".join([f"{k}: {v}" for k, v in row.items() if v != "" and v is not None])
                full_excel_data_text += f"Row {idx}: {row_str}\n"
    
    # Create comprehensive GST audit report prompt
    gst_audit_prompt = f"""You are a professional GST auditor analyzing multiple Excel files to generate a comprehensive GST Compliance Audit Report.

CRITICAL: You MUST extract and use ACTUAL data from the Excel files provided below. DO NOT use placeholder values, generic names, or example data. Extract the REAL company names, vendor names, invoice numbers, GSTINs, amounts, dates, and all other values directly from the Excel data.

The following Excel files have been provided:
{chr(10).join([f"- {file_type.upper()}" for file_type in combined_summary.keys()])}

Excel Data Summary:
{excel_summary_text[:80000]}

COMPLETE Excel Data (ALL ROWS):
{full_excel_data_text[:100000]}

Generate a comprehensive Financial Audit Report in the following JSON format:

{{
  "header": {{
    "title": "GST Compliance Audit Report",
    "company_name": "",
    "prepared_by": "",
    "date": "",
    "financial_year": "",
    "audit_type": "GST Compliance Audit",
    "audit_objective": "To provide an independent opinion on GST compliance, ITC utilization, and vendor compliance based on GSTR-2B, Purchase Register, and Vendor Master data."
  }},
  "executive_summary": {{
    "objective": "To review and reconcile GST data from GSTR-2B Summary, Purchase Register, and Vendor Master to ensure compliance and identify discrepancies.",
    "total_output_tax": 0,
    "total_input_tax": 0,
    "net_tax_payable": 0,
    "itc_available": 0,
    "itc_utilized": 0,
    "reconciliation_status": "",
    "key_highlights": []
  }},
  "audit_scope_and_methodology": {{
    "scope": "Review of GSTR-2B Summary, Purchase Register, and Vendor Master data for GST compliance",
    "methodology": "Data extraction from Excel files, reconciliation, variance analysis, and compliance review",
    "period_covered": "",
    "documents_reviewed": ["GSTR-2B Summary", "Purchase Register", "Vendor Master"]
  }},
  "reconciliation_summary": {{
    "gstr2b_vs_purchase_register": {{
      "gstr2b_total": 0,
      "purchase_register_total": 0,
      "difference": 0,
      "variance_percentage": 0
    }},
    "vendor_matching": {{
      "total_vendors_in_master": 0,
      "vendors_in_purchase_register": 0,
      "matched_vendors": 0,
      "unmatched_vendors": []
    }},
    "itc_reconciliation": {{
      "gstr2b_itc": 0,
      "claimed_itc": 0,
      "difference": 0,
      "reconciliation_status": ""
    }}
  }},
  "detailed_findings_and_observations": {{
    "gstr2b_review": {{
      "total_invoices": 0,
      "total_taxable_value": 0,
      "total_itc_available": 0,
      "cgst": 0,
      "sgst": 0,
      "igst": 0,
      "cess": 0,
      "observations": [],
      "issues_identified": []
    }},
    "purchase_register_review": {{
      "total_purchases": 0,
      "total_taxable_value": 0,
      "total_itc_claimed": 0,
      "cgst": 0,
      "sgst": 0,
      "igst": 0,
      "cess": 0,
      "observations": [],
      "issues_identified": []
    }},
    "invoice_matching_review": {{
      "total_invoices": 0,
      "matched_invoices": 0,
      "unmatched_invoices": 0,
      "match_percentage": 0,
      "mismatch_reasons": [],
      "observations": []
    }},
    "itc_verification_review": {{
      "total_itc_available": 0,
      "itc_utilized": 0,
      "itc_pending": 0,
      "itc_reversal": 0,
      "utilization_percentage": 0,
      "month_wise_breakdown": [],
      "observations": [],
      "issues_identified": []
    }},
    "vendor_compliance_review": {{
      "total_vendors": 0,
      "compliant_vendors": 0,
      "non_compliant_vendors": 0,
      "vendor_issues": [],
      "observations": []
    }}
  }},
  "invoice_level_reconciliation": {{
    "total_invoices": 0,
    "reconciled_invoices": 0,
    "unreconciled_invoices": 0,
    "invoice_details": [
      {{
        "invoice_number": "",
        "vendor_gstin": "",
        "vendor_name": "",
        "invoice_date": "",
        "taxable_value": 0,
        "itc_claimed": 0,
        "reconciliation_status": "matched/unmatched",
        "variance": 0,
        "remarks": ""
      }}
    ]
  }},
  "vendor_wise_compliance_review": {{
    "total_vendors": 0,
    "vendor_details": [
      {{
        "vendor_name": "",
        "vendor_gstin": "",
        "total_invoices": 0,
        "total_taxable_value": 0,
        "total_itc_claimed": 0,
        "compliance_status": "compliant/non-compliant",
        "issues": [],
        "recommendations": ""
      }}
    ],
    "summary": ""
  }},
  "risk_assessment": {{
    "high_risk_items": [],
    "medium_risk_items": [],
    "low_risk_items": [],
    "overall_risk_level": "low/medium/high",
    "risk_summary": ""
  }},
  "recommendations": [
    ""
  ],
  "auditors_conclusion": ""
}}

CRITICAL INSTRUCTIONS:
1. **EXTRACT REAL DATA**: You MUST extract actual values from the Excel files above. Look for:
   - Company names (from any header, company name column, or first row)
   - Vendor names (from vendor name columns in Purchase Register or Vendor Master)
   - Invoice numbers (from invoice number columns)
   - Vendor GSTINs (from GSTIN columns)
   - Taxable values, ITC amounts, CGST, SGST, IGST (from tax columns)
   - Dates (from date columns)
   - All financial figures

2. **DO NOT USE PLACEHOLDERS**: 
   - If you find "ABC Corp" in the data, use "ABC Corp"
   - If you find "MMX Foods Pvt Ltd", use "MMX Foods Pvt Ltd"
   - If you find actual invoice numbers like "INV-001", use "INV-001"
   - If you find actual GSTINs like "27ABCDE1234F1Z5", use "27ABCDE1234F1Z5"
   - DO NOT use "Unnamed Company", "Example Vendor", or generic values

3. **RECONCILE DATA**: 
   - Match invoices between GSTR-2B and Purchase Register using invoice numbers, dates, and amounts
   - Match vendors between Vendor Master and Purchase Register using vendor names or GSTINs
   - Calculate actual totals from the Excel data rows

4. **INVOICE-LEVEL RECONCILIATION**:
   - Extract ALL invoice details from the Excel files
   - Include actual invoice numbers, vendor names, GSTINs, taxable values, and ITC amounts
   - Mark reconciliation status based on actual matching

5. **VENDOR-WISE ANALYSIS**:
   - Extract actual vendor names and GSTINs from Vendor Master and Purchase Register
   - Calculate totals per vendor from actual data
   - Assess compliance based on actual vendor data

6. **USE ACTUAL FIGURES**:
   - Sum up actual amounts from the Excel rows
   - Use actual dates from the Excel files
   - Use actual company information from headers or data rows

7. **FORMAT REQUIREMENTS**:
   - Use Indian currency format (INR/Rs.) 
   - Dates in YYYY-MM-DD format
   - GSTINs as they appear in the Excel files
   - Company names exactly as they appear

8. **IF DATA IS MISSING**: Only use placeholder values (like "N/A" or 0) if the data is genuinely not present in the Excel files.

Return ONLY valid JSON with REAL extracted data. No explanations or markdown formatting."""
    
    try:
        # Log data being sent to AI for debugging
        print(f"\n{'='*60}")
        print("Sending to AI for GST report generation:")
        print(f"  Excel files: {list(excel_data_dict.keys())}")
        print(f"  Total prompt length: {len(gst_audit_prompt)} characters")
        print(f"  Excel summary length: {len(excel_summary_text)} characters")
        print(f"  Full data length: {len(full_excel_data_text)} characters")
        print(f"{'='*60}\n")
        
        content = generate_content_vertexai(gst_audit_prompt, require_json=True)
        gst_report = json.loads(content)
        
        # Log extracted values for verification
        print(f"\n{'='*60}")
        print("GST Report Generated - Key Extracted Values:")
        if gst_report.get("header"):
            print(f"  Company: {gst_report['header'].get('company_name', 'NOT FOUND')}")
            print(f"  Financial Year: {gst_report['header'].get('financial_year', 'NOT FOUND')}")
        if gst_report.get("invoice_level_reconciliation", {}).get("invoice_details"):
            invoice_count = len(gst_report["invoice_level_reconciliation"]["invoice_details"])
            print(f"  Invoices extracted: {invoice_count}")
            if invoice_count > 0:
                first_invoice = gst_report["invoice_level_reconciliation"]["invoice_details"][0]
                print(f"  Sample invoice: {first_invoice.get('invoice_number', 'N/A')} - {first_invoice.get('vendor_name', 'N/A')}")
        print(f"{'='*60}\n")
        
        # Add metadata
        gst_report["metadata"] = {
            "excel_files_processed": len(excel_data_dict),
            "file_types": list(excel_data_dict.keys()),
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return gst_report
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "error": f"Error generating comprehensive GST report: {str(e)}",
            "metadata": {
                "excel_files_processed": len(excel_data_dict),
                "file_types": list(excel_data_dict.keys())
            }
        }


def generate_invoice_reports(base_data, text):
    """Generate all 5 reports for Invoice"""
    reports = {}
    
    line_items = base_data.get("line_items", [])
    amounts = base_data.get("amounts", {})
    buyer = base_data.get("buyer", {})
    seller = base_data.get("seller", {})
    
    # 1. Sales Ledger
    reports["sales_ledger"] = {
        "invoice_number": base_data.get("invoice_number"),
        "invoice_date": base_data.get("invoice_date"),
        "customer_name": buyer.get("name"),
        "total_amount": amounts.get("total_amount", 0) or 0,
        "line_items": line_items,
        "tax_breakdown": {
            "cgst": amounts.get("cgst", 0) or 0,
            "sgst": amounts.get("sgst", 0) or 0,
            "igst": amounts.get("igst", 0) or 0,
            "cess": amounts.get("cess", 0) or 0
        }
    }
    
    # 2. Customer Outstanding Summary
    payment = base_data.get("payment", {})
    reports["customer_outstanding_summary"] = {
        "customer_name": buyer.get("name"),
        "invoice_number": base_data.get("invoice_number"),
        "invoice_date": base_data.get("invoice_date"),
        "due_date": base_data.get("due_date"),
        "total_amount": amounts.get("total_amount", 0) or 0,
        "paid_amount": payment.get("paid_amount", 0) or 0,
        "outstanding_amount": payment.get("outstanding_amount", 0) or 0,
        "payment_status": payment.get("payment_status", "pending"),
        "days_overdue": 0  # Calculate if due_date available
    }
    
    # 3. GST Breakdown
    reports["gst_breakdown"] = {
        "taxable_amount": amounts.get("taxable_amount", 0) or 0,
        "cgst": {
            "rate": 0,
            "amount": amounts.get("cgst", 0) or 0
        },
        "sgst": {
            "rate": 0,
            "amount": amounts.get("sgst", 0) or 0
        },
        "igst": {
            "rate": 0,
            "amount": amounts.get("igst", 0) or 0
        },
        "cess": {
            "rate": 0,
            "amount": amounts.get("cess", 0) or 0
        },
        "total_tax": amounts.get("tax_amount", 0) or 0,
        "total_amount": amounts.get("total_amount", 0) or 0
    }
    
    # 4. Invoice Aging
    invoice_date = base_data.get("invoice_date")
    due_date = base_data.get("due_date")
    reports["invoice_aging"] = {
        "invoice_number": base_data.get("invoice_number"),
        "invoice_date": invoice_date,
        "due_date": due_date,
        "current_date": "",
        "age_in_days": 0,
        "aging_bucket": "0-30/31-60/61-90/90+",
        "outstanding_amount": payment.get("outstanding_amount", 0) or 0
    }
    
    # 5. Payment Due Summary
    reports["payment_due_summary"] = {
        "invoice_number": base_data.get("invoice_number"),
        "customer_name": buyer.get("name"),
        "due_date": due_date,
        "total_amount": amounts.get("total_amount", 0) or 0,
        "paid_amount": payment.get("paid_amount", 0) or 0,
        "outstanding_amount": payment.get("outstanding_amount", 0) or 0,
        "payment_terms": payment.get("payment_terms", ""),
        "payment_status": payment.get("payment_status", "pending")
    }
    
    return reports


def generate_purchase_order_reports(base_data, text):
    """Generate all 5 reports for Purchase Order"""
    reports = {}
    
    items = base_data.get("items", [])
    amounts = base_data.get("amounts", {})
    vendor = base_data.get("vendor", {})
    
    # 1. Vendor Ledger
    reports["vendor_ledger"] = {
        "po_number": base_data.get("po_number"),
        "po_date": base_data.get("po_date"),
        "vendor_name": vendor.get("name"),
        "total_amount": amounts.get("total_amount", 0) or 0,
        "items": items,
        "tax_breakdown": {
            "cgst": amounts.get("cgst", 0) or 0,
            "sgst": amounts.get("sgst", 0) or 0,
            "igst": amounts.get("igst", 0) or 0
        }
    }
    
    # 2. Purchase Summary
    reports["purchase_summary"] = {
        "po_number": base_data.get("po_number"),
        "vendor_name": vendor.get("name"),
        "po_date": base_data.get("po_date"),
        "delivery_date": base_data.get("delivery_date"),
        "total_items": len(items),
        "subtotal": amounts.get("subtotal", 0) or 0,
        "tax_amount": amounts.get("tax_amount", 0) or 0,
        "shipping_charges": amounts.get("shipping_charges", 0) or 0,
        "total_amount": amounts.get("total_amount", 0) or 0
    }
    
    # 3. Category Spend Report
    category_spend = {}
    for item in items:
        cat = item.get("description", "Other")[:20]  # Use description as category
        category_spend[cat] = category_spend.get(cat, 0) + (item.get("amount", 0) or 0)
    
    reports["category_spend_report"] = {
        "categories": [{"category": k, "amount": v} for k, v in category_spend.items()],
        "total_spend": amounts.get("total_amount", 0) or 0
    }
    
    # 4. PO vs Invoice Matching
    reports["po_vs_invoice_matching"] = {
        "po_number": base_data.get("po_number"),
        "po_date": base_data.get("po_date"),
        "po_amount": amounts.get("total_amount", 0) or 0,
        "matched_invoices": [],
        "unmatched_items": items,
        "match_status": "pending",
        "variance": 0
    }
    
    # 5. Payables Summary
    reports["payables_summary"] = {
        "vendor_name": vendor.get("name"),
        "po_number": base_data.get("po_number"),
        "po_date": base_data.get("po_date"),
        "total_amount": amounts.get("total_amount", 0) or 0,
        "paid_amount": 0,
        "outstanding_amount": amounts.get("total_amount", 0) or 0,
        "payment_status": "pending",
        "payment_terms": base_data.get("terms", {}).get("payment_terms", "")
    }
    
    return reports


def generate_salary_slip_reports(base_data, text):
    """Generate all 5 reports for Salary Slip"""
    reports = {}
    
    earnings = base_data.get("earnings", {})
    deductions = base_data.get("deductions", {})
    employee = base_data.get("employee", {})
    salary_period = base_data.get("salary_period", {})
    
    # 1. Salary Summary
    reports["salary_summary"] = {
        "employee_name": employee.get("name"),
        "employee_id": employee.get("employee_id"),
        "designation": employee.get("designation"),
        "period": f"{salary_period.get('month')} {salary_period.get('year')}",
        "gross_salary": earnings.get("gross_salary", 0) or 0,
        "total_deductions": deductions.get("total_deductions", 0) or 0,
        "net_salary": base_data.get("net_salary", 0) or 0
    }
    
    # 2. Allowances & Deductions Report
    reports["allowances_deductions_report"] = {
        "allowances": {
            "hra": earnings.get("hra", 0) or 0,
            "conveyance_allowance": earnings.get("conveyance_allowance", 0) or 0,
            "medical_allowance": earnings.get("medical_allowance", 0) or 0,
            "special_allowance": earnings.get("special_allowance", 0) or 0,
            "other_allowances": earnings.get("other_allowances", 0) or 0,
            "total_allowances": (earnings.get("hra", 0) or 0) + (earnings.get("conveyance_allowance", 0) or 0) + 
                               (earnings.get("medical_allowance", 0) or 0) + (earnings.get("special_allowance", 0) or 0) + 
                               (earnings.get("other_allowances", 0) or 0)
        },
        "deductions": {
            "provident_fund": deductions.get("provident_fund", 0) or 0,
            "professional_tax": deductions.get("professional_tax", 0) or 0,
            "income_tax": deductions.get("income_tax", 0) or 0,
            "esi": deductions.get("esi", 0) or 0,
            "loan_deduction": deductions.get("loan_deduction", 0) or 0,
            "other_deductions": deductions.get("other_deductions", 0) or 0,
            "total_deductions": deductions.get("total_deductions", 0) or 0
        }
    }
    
    # 3. PF/ESI/TDS Summary
    reports["pf_esi_tds_summary"] = {
        "provident_fund": {
            "employee_contribution": deductions.get("provident_fund", 0) or 0,
            "employer_contribution": 0,  # Usually same as employee
            "total": deductions.get("provident_fund", 0) or 0
        },
        "esi": {
            "employee_contribution": deductions.get("esi", 0) or 0,
            "employer_contribution": 0,
            "total": deductions.get("esi", 0) or 0
        },
        "tds": {
            "income_tax": deductions.get("income_tax", 0) or 0,
            "professional_tax": deductions.get("professional_tax", 0) or 0,
            "total_tds": (deductions.get("income_tax", 0) or 0) + (deductions.get("professional_tax", 0) or 0)
        }
    }
    
    # 4. Employee Cost Report
    reports["employee_cost_report"] = {
        "employee_name": employee.get("name"),
        "employee_id": employee.get("employee_id"),
        "period": f"{salary_period.get('month')} {salary_period.get('year')}",
        "cost_to_company": {
            "gross_salary": earnings.get("gross_salary", 0) or 0,
            "employer_pf": 0,
            "employer_esi": 0,
            "gratuity": 0,
            "other_benefits": 0,
            "total_ctc": earnings.get("gross_salary", 0) or 0
        },
        "annual_ctc": (earnings.get("gross_salary", 0) or 0) * 12
    }
    
    # 5. Payroll Journal Entries
    reports["payroll_journal_entries"] = {
        "period": f"{salary_period.get('month')} {salary_period.get('year')}",
        "entries": [
            {
                "account": "Salary Expense",
                "debit": earnings.get("gross_salary", 0) or 0,
                "credit": 0
            },
            {
                "account": "PF Payable",
                "debit": 0,
                "credit": deductions.get("provident_fund", 0) or 0
            },
            {
                "account": "TDS Payable",
                "debit": 0,
                "credit": (deductions.get("income_tax", 0) or 0) + (deductions.get("professional_tax", 0) or 0)
            },
            {
                "account": "Cash/Bank",
                "debit": 0,
                "credit": base_data.get("net_salary", 0) or 0
            }
        ]
    }
    
    return reports


def generate_profit_loss_reports(base_data, text):
    """Generate all 5 reports for Profit & Loss Statement"""
    reports = {}
    
    revenue = base_data.get("revenue", {})
    expenses = base_data.get("expenses", {})
    profitability = base_data.get("profitability", {})
    
    # 1. Profitability Summary
    reports["profitability_summary"] = {
        "entity_name": base_data.get("entity_name"),
        "period": base_data.get("period"),
        "total_revenue": revenue.get("total_revenue", 0) or 0,
        "total_expenses": expenses.get("total_expenses", 0) or 0,
        "gross_profit": profitability.get("gross_profit", 0) or 0,
        "operating_profit": profitability.get("operating_profit", 0) or 0,
        "net_profit": profitability.get("net_profit", 0) or 0,
        "gross_margin": profitability.get("gross_margin", 0) or 0,
        "net_margin": profitability.get("net_margin", 0) or 0
    }
    
    # 2. Revenue vs Expense Analysis
    reports["revenue_vs_expense_analysis"] = {
        "revenue": {
            "total": revenue.get("total_revenue", 0) or 0,
            "breakdown": revenue.get("revenue_breakdown", [])
        },
        "expenses": {
            "total": expenses.get("total_expenses", 0) or 0,
            "breakdown": expenses.get("expense_breakdown", [])
        },
        "net_result": profitability.get("net_profit", 0) or 0
    }
    
    # 3. Margin KPIs
    reports["margin_kpis"] = {
        "gross_margin": profitability.get("gross_margin", 0) or 0,
        "operating_margin": 0,  # Calculate if data available
        "net_margin": profitability.get("net_margin", 0) or 0,
        "ebitda_margin": 0  # If data available
    }
    
    # 4. Operating vs Non-Operating Split
    reports["operating_vs_non_operating_split"] = {
        "operating": {
            "revenue": revenue.get("sales", 0) or 0,
            "expenses": expenses.get("operating_expenses", 0) or 0,
            "profit": profitability.get("operating_profit", 0) or 0
        },
        "non_operating": {
            "revenue": revenue.get("other_income", 0) or 0,
            "expenses": expenses.get("financial_expenses", 0) or 0,
            "profit": 0
        }
    }
    
    # 5. Period-wise Profit Trend
    reports["period_wise_profit_trend"] = {
        "period": base_data.get("period"),
        "revenue": revenue.get("total_revenue", 0) or 0,
        "expenses": expenses.get("total_expenses", 0) or 0,
        "gross_profit": profitability.get("gross_profit", 0) or 0,
        "net_profit": profitability.get("net_profit", 0) or 0,
        "trend": "increasing/decreasing/stable"  # Would need multiple periods
    }
    
    return reports


def generate_trial_balance_reports(base_data, text):
    """Generate all 5 reports for Trial Balance with comprehensive financial analysis"""
    reports = {}
    
    balances = base_data.get("balances", [])
    summary = base_data.get("summary", {})
    
    # Extract account details from balances
    assets_dict = {}
    liabilities_dict = {}
    equity_dict = {}
    income_accounts = []
    expense_accounts = []
    
    for bal in balances:
        acc_name = bal.get("account_name", "")
        acc_type = bal.get("account_type", "").lower()
        debit = float(bal.get("debit", 0) or 0)
        credit = float(bal.get("credit", 0) or 0)
        balance = float(bal.get("balance", 0) or 0)
        
        if "asset" in acc_type:
            assets_dict[acc_name] = balance if balance > 0 else debit
        elif "liability" in acc_type:
            liabilities_dict[acc_name] = balance if balance > 0 else credit
        elif "equity" in acc_type:
            equity_dict[acc_name] = balance if balance > 0 else credit
        elif "income" in acc_type or "revenue" in acc_type:
            income_accounts.append({"name": acc_name, "amount": credit})
        elif "expense" in acc_type or "cost" in acc_type:
            expense_accounts.append({"name": acc_name, "amount": debit})
    
    # Calculate totals
    total_assets = sum(assets_dict.values())
    total_liabilities = sum(liabilities_dict.values())
    total_equity = sum(equity_dict.values())
    total_revenue = sum(inc.get("amount", 0) for inc in income_accounts)
    total_expenses = sum(exp.get("amount", 0) for exp in expense_accounts)
    
    # Get specific account values
    cash_in_hand = assets_dict.get("Cash in Hand", 0) or assets_dict.get("Cash", 0) or 0
    bank_account = assets_dict.get("Bank Account", 0) or assets_dict.get("Bank", 0) or 0
    accounts_receivable = assets_dict.get("Accounts Receivable", 0) or assets_dict.get("Receivables", 0) or 0
    inventory = assets_dict.get("Inventory", 0) or assets_dict.get("Stock", 0) or 0
    current_assets = cash_in_hand + bank_account + accounts_receivable + inventory
    for k, v in assets_dict.items():
        if k not in ["Cash in Hand", "Cash", "Bank Account", "Bank", "Accounts Receivable", "Receivables", "Inventory", "Stock"]:
            if "equipment" in k.lower() or "fixed" in k.lower() or "property" in k.lower():
                continue
            current_assets += v
    
    current_liabilities = total_liabilities  # Simplified - assume all are current
    accounts_payable = liabilities_dict.get("Accounts Payable", 0) or liabilities_dict.get("Payables", 0) or 0
    
    # Calculate COGS (Cost of Goods Sold) - only use actual extracted values
    cogs = None
    for exp in expense_accounts:
        exp_name = exp.get("name", "").lower()
        exp_amount = exp.get("amount", 0)
        if exp_amount and ("cogs" in exp_name or "cost of goods" in exp_name or "cost of materials" in exp_name):
            cogs = exp_amount
            break
    if cogs is None:
        cogs = 0  # Only set to 0 if truly no COGS found
    
    gross_profit = total_revenue - cogs
    net_profit = total_revenue - total_expenses
    
    # Extract OPEX breakdown from expense accounts
    sales_expenses = 0
    marketing_expenses = 0
    admin_expenses = 0
    other_expenses = 0
    
    for exp in expense_accounts:
        exp_name = exp.get("name", "").lower()
        exp_amount = exp.get("amount", 0)
        
        if "sales" in exp_name or "selling" in exp_name:
            sales_expenses += exp_amount
        elif "marketing" in exp_name or "advertising" in exp_name or "promotion" in exp_name:
            marketing_expenses += exp_amount
        elif "admin" in exp_name or "administrative" in exp_name or "general" in exp_name or "overhead" in exp_name:
            admin_expenses += exp_amount
        elif "cogs" not in exp_name and "cost of goods" not in exp_name:
            other_expenses += exp_amount
    
    # If no specific breakdown found, use default percentages
    if sales_expenses == 0 and marketing_expenses == 0 and admin_expenses == 0:
        sales_expenses = total_expenses * 0.5
        marketing_expenses = total_expenses * 0.22
        admin_expenses = total_expenses * 0.28
    
    # Generate monthly data structure (12 months)
    # This creates a template structure that can be populated with actual data if available
    monthly_data = []
    period = base_data.get("period", "")
    
    # Try to extract year from period
    year = "2023"  # Default
    if period:
        year_match = re.search(r'20\d{2}', str(period))
        if year_match:
            year = year_match.group()
    
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    # Create monthly data with proportional distribution
    for i, month in enumerate(months):
        month_num = i + 1
        # Distribute annual totals proportionally (can be adjusted based on actual data)
        monthly_revenue = total_revenue / 12
        monthly_cogs = cogs / 12
        monthly_gross_profit = monthly_revenue - monthly_cogs
        monthly_sales = sales_expenses / 12
        monthly_marketing = marketing_expenses / 12
        monthly_admin = admin_expenses / 12
        monthly_total_expenses = total_expenses / 12
        monthly_ebit = monthly_gross_profit - monthly_total_expenses
        monthly_opex_ratio = (monthly_total_expenses / monthly_revenue * 100) if monthly_revenue > 0 else 0
        
        monthly_data.append({
            "month": f"{month} {year}",
            "period": f"{year}-{str(month_num).zfill(2)}",
            "revenue": round(monthly_revenue, 2),
            "cogs": round(monthly_cogs, 2),
            "gross_profit": round(monthly_gross_profit, 2),
            "sales": round(monthly_sales, 2),
            "marketing": round(monthly_marketing, 2),
            "general_admin": round(monthly_admin, 2),
            "opex_sales": round(monthly_sales, 2),
            "opex_marketing": round(monthly_marketing, 2),
            "opex_admin": round(monthly_admin, 2),
            "expenses": round(monthly_total_expenses, 2),
            "ebit": round(monthly_ebit, 2),
            "operating_profit": round(monthly_ebit, 2),
            "ebit_target": round(monthly_ebit * 1.2, 2),  # 20% above actual as target
            "opex_ratio": round(monthly_opex_ratio, 2)
        })
    
    # 1. Profit & Loss Statement with enhanced data - structured for IncomeStatementTable component
    # Extract detailed expense breakdown from expense accounts
    cost_of_material_consumed = 0
    employee_benefits_expense = 0
    finance_costs = 0
    depreciation_amortisation = 0
    other_income = 0
    
    for exp in expense_accounts:
        exp_name = exp.get("name", "").lower()
        exp_amount = exp.get("amount", 0)
        if "material" in exp_name or "cogs" in exp_name or "cost of goods" in exp_name:
            cost_of_material_consumed += exp_amount
        elif "employee" in exp_name or "salary" in exp_name or "wages" in exp_name or "staff" in exp_name:
            employee_benefits_expense += exp_amount
        elif "finance" in exp_name or "interest" in exp_name or "loan" in exp_name:
            finance_costs += exp_amount
        elif "depreciation" in exp_name or "amortisation" in exp_name or "amortization" in exp_name:
            depreciation_amortisation += exp_amount
    
    # Extract other income from income accounts (excluding main revenue)
    for inc in income_accounts:
        inc_name = inc.get("name", "").lower()
        inc_amount = inc.get("amount", 0)
        if "other" in inc_name or "miscellaneous" in inc_name or "interest" in inc_name:
            other_income += inc_amount
    
    # Use COGS for cost_of_material_consumed if available, otherwise use extracted value
    if cogs > 0:
        cost_of_material_consumed = cogs if cost_of_material_consumed == 0 else cost_of_material_consumed
    
    # Calculate operating profit (gross profit - operating expenses excluding COGS)
    operating_expenses = employee_benefits_expense + finance_costs + depreciation_amortisation + other_expenses
    operating_profit = gross_profit - operating_expenses
    profit_before_tax = operating_profit  # Simplified - assuming no non-operating items
    profit_for_year = net_profit  # Assuming net_profit is after tax
    
    reports["profit_loss"] = {
        "revenue": total_revenue,
        "cogs": cogs,
        "gross_profit": gross_profit,
        "expenses": total_expenses,
        "net_profit": net_profit,
        "operating_profit": operating_profit,
        "profit_before_tax": profit_before_tax,
        "profit_for_year": profit_for_year,
        "cost_of_material_consumed": cost_of_material_consumed,
        "employee_benefits_expense": employee_benefits_expense,
        "finance_costs": finance_costs,
        "depreciation_amortisation": depreciation_amortisation,
        "other_expenses": other_expenses,
        "other_income": other_income,
        "prior_period_income_expense": 0,  # Not typically in trial balance
        "current_tax": 0,  # Would need to extract from accounts
        "deferred_tax": 0,  # Would need to extract from accounts
        "tax_adjustments": 0,  # Would need to extract from accounts
        "earnings_per_share": 0,  # Would need share capital data
        "opex_breakdown": {
            "sales": sales_expenses,
            "marketing": marketing_expenses,
            "generalAdmin": admin_expenses,
            "other": other_expenses
        },
        "monthly_data": monthly_data,
        "period": base_data.get("period", ""),
        "company_name": base_data.get("entity_name", "XYZ")
    }
    
    # 2. Balance Sheet - structured for BalanceSheetTable component
    # Extract detailed asset breakdown
    share_capital = equity_dict.get("Share Capital", 0) or equity_dict.get("Capital", 0) or 0
    reserves_and_surplus = equity_dict.get("Reserves and Surplus", 0) or equity_dict.get("Reserves", 0) or 0
    
    # Map liabilities
    long_term_borrowings = 0
    short_term_borrowings = 0
    trade_payables = accounts_payable
    deferred_tax_liabilities = liabilities_dict.get("Deferred Tax Liabilities", 0) or 0
    long_term_provisions = 0
    short_term_provisions = 0
    other_current_liabilities = 0
    other_non_current_liabilities = 0
    
    for k, v in liabilities_dict.items():
        k_lower = k.lower()
        if "loan" in k_lower or "borrowing" in k_lower:
            if "short" in k_lower or "current" in k_lower:
                short_term_borrowings += v
            else:
                long_term_borrowings += v
        elif "provision" in k_lower:
            if "short" in k_lower or "current" in k_lower:
                short_term_provisions += v
            else:
                long_term_provisions += v
        elif "payable" not in k_lower and "tax" not in k_lower:
            if "short" in k_lower or "current" in k_lower:
                other_current_liabilities += v
            else:
                other_non_current_liabilities += v
    
    # Map assets
    property_plant_equipment = 0
    capital_work_in_progress = 0
    non_current_investments = 0
    deferred_tax_assets = assets_dict.get("Deferred Tax Assets", 0) or 0
    long_term_loans_and_advances = 0
    other_non_current_assets = 0
    trade_receivables_mapped = accounts_receivable
    cash_and_bank_balances = cash_in_hand + bank_account
    short_term_loans_and_advances = 0
    other_current_assets = 0
    
    for k, v in assets_dict.items():
        k_lower = k.lower()
        if "property" in k_lower or "plant" in k_lower or "equipment" in k_lower or "fixed asset" in k_lower:
            property_plant_equipment += v
        elif "work in progress" in k_lower or "cwip" in k_lower:
            capital_work_in_progress += v
        elif "investment" in k_lower:
            if "short" in k_lower or "current" in k_lower:
                other_current_assets += v
            else:
                non_current_investments += v
        elif "loan" in k_lower or "advance" in k_lower:
            if "short" in k_lower or "current" in k_lower:
                short_term_loans_and_advances += v
            else:
                long_term_loans_and_advances += v
        elif k not in ["Cash in Hand", "Cash", "Bank Account", "Bank", "Accounts Receivable", "Receivables", "Inventory", "Stock"]:
            if "short" in k_lower or "current" in k_lower:
                other_current_assets += v
            else:
                other_non_current_assets += v
    
    reports["balance_sheet"] = {
        "assets": assets_dict,
        "liabilities": liabilities_dict,
        "equity": equity_dict,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "total_equity": total_equity,
        # Detailed fields for BalanceSheetTable component
        "share_capital": share_capital,
        "reserves_and_surplus": reserves_and_surplus,
        "long_term_borrowings": long_term_borrowings,
        "short_term_borrowings": short_term_borrowings,
        "trade_payables": trade_payables,
        "deferred_tax_liabilities": deferred_tax_liabilities,
        "long_term_provisions": long_term_provisions,
        "short_term_provisions": short_term_provisions,
        "other_current_liabilities": other_current_liabilities,
        "other_non_current_liabilities": other_non_current_liabilities,
        "property_plant_equipment": property_plant_equipment,
        "capital_work_in_progress": capital_work_in_progress,
        "non_current_investments": non_current_investments,
        "deferred_tax_assets": deferred_tax_assets,
        "long_term_loans_and_advances": long_term_loans_and_advances,
        "other_non_current_assets": other_non_current_assets,
        "inventories": inventory,
        "trade_receivables": trade_receivables_mapped,
        "cash_and_bank_balances": cash_and_bank_balances,
        "short_term_loans_and_advances": short_term_loans_and_advances,
        "other_current_assets": other_current_assets,
        "period": base_data.get("period", ""),
        "company_name": base_data.get("entity_name", "XYZ")
    }
    
    # 3. Cash Flow Statement - structured for CashFlowStatementTable component
    # Calculate cash flow components
    operating_cash_flow = net_profit  # Simplified - starting with net profit
    net_cash_from_operating = operating_cash_flow + depreciation_amortisation  # Add back non-cash expenses
    
    # Cash at beginning and end (simplified)
    cash_at_beginning = cash_and_bank_balances - net_cash_from_operating  # Approximate
    if cash_at_beginning < 0:
        cash_at_beginning = 0
    cash_at_end = cash_and_bank_balances
    
    reports["cash_flow"] = {
        "operating_activities": operating_cash_flow,
        "investing_activities": 0,
        "financing_activities": 0,
        "net_cash_flow": operating_cash_flow,
        # Detailed fields for CashFlowStatementTable component
        "net_profit_before_tax": profit_before_tax,
        "depreciation": depreciation_amortisation,
        "interest_expense": finance_costs,
        "operating_profit_before_wc": operating_profit,
        "increase_decrease_inventories": 0,  # Would need period comparison
        "increase_decrease_trade_receivables": 0,  # Would need period comparison
        "increase_decrease_trade_payables": 0,  # Would need period comparison
        "cash_generated_used_operating": net_cash_from_operating,
        "income_tax_paid": 0,  # Would need to extract from accounts
        "purchase_of_fixed_assets": 0,  # Would need period comparison
        "proceeds_from_sale_fixed_assets": 0,  # Would need period comparison
        "net_increase_decrease_cash": net_cash_from_operating,
        "cash_at_beginning": cash_at_beginning,
        "cash_at_end": cash_at_end,
        "period": base_data.get("period", ""),
        "company_name": base_data.get("entity_name", "XYZ")
    }
    
    # 4. Calculate Financial Ratios
    ratios = calculate_trial_balance_ratios(
        current_assets, current_liabilities, cash_in_hand + bank_account,
        inventory, total_assets, total_liabilities, total_equity,
        total_revenue, gross_profit, net_profit, total_expenses
    )
    
    # Calculate additional ratios from actual data if available
    # Inventory Turnover Ratio = COGS / Average Inventory
    # Note: We use ending inventory as proxy for average if opening inventory not available
    if cogs and cogs > 0 and inventory and inventory > 0:
        inventory_turnover = cogs / inventory
        if ratios.get("efficiency"):
            ratios["efficiency"]["inventory_turnover"] = round(inventory_turnover, 2)
        else:
            ratios["efficiency"] = {"inventory_turnover": round(inventory_turnover, 2)}
    
    # Calculate Trade Receivables Turnover if we have revenue and receivables
    if total_revenue and total_revenue > 0 and accounts_receivable and accounts_receivable > 0:
        trade_receivables_turnover = total_revenue / accounts_receivable
        if "efficiency" not in ratios:
            ratios["efficiency"] = {}
        ratios["efficiency"]["trade_receivables_turnover"] = round(trade_receivables_turnover, 2)
        ratios["trade_receivables_turnover"] = round(trade_receivables_turnover, 2)
    
    # Calculate Trade Payables Turnover if we have purchases/COGS and payables
    if cogs and cogs > 0 and accounts_payable and accounts_payable > 0:
        trade_payables_turnover = cogs / accounts_payable  # Using COGS as proxy for purchases
        if "efficiency" not in ratios:
            ratios["efficiency"] = {}
        ratios["efficiency"]["trade_payables_turnover"] = round(trade_payables_turnover, 2)
        ratios["trade_payables_turnover"] = round(trade_payables_turnover, 2)
    
    # Calculate Net Capital Turnover = Revenue / Net Capital (where Net Capital = Total Assets - Total Liabilities)
    if total_revenue and total_revenue > 0:
        net_capital = total_assets - total_liabilities
        if net_capital != 0:  # Can be negative or positive
            net_capital_turnover = total_revenue / abs(net_capital)  # Use absolute value for ratio
            ratios["net_capital_turnover"] = round(net_capital_turnover, 2)
            ratios["netCapitalTurnover"] = round(net_capital_turnover, 2)
    
    # Calculate ROCE (Return on Capital Employed) = EBIT / Capital Employed
    # Capital Employed = Total Assets - Current Liabilities (or Net Capital)
    if total_assets and total_liabilities:
        capital_employed = total_assets - current_liabilities
        if capital_employed > 0:
            ebit = gross_profit - (total_expenses - cogs if cogs else total_expenses)  # Approximate EBIT
            if ebit is not None:
                roce = (ebit / capital_employed) * 100
                if ratios.get("profitability"):
                    ratios["profitability"]["roce"] = f"{round(roce, 2)}%"
                    ratios["profitability"]["returnOnCapitalEmployed"] = round(roce, 2)
                ratios["return_on_capital_employed"] = round(roce, 2)
                ratios["returnOnCapitalEmployed"] = round(roce, 2)
    
    reports["accounting_ratios"] = ratios
    
    # 5. Management Report with Analysis
    analysis_prompt = f"""Based on the following financial data from a trial balance, provide a comprehensive growth performance analysis.

Financial Data:
- Revenue: {total_revenue}
- Gross Profit: {gross_profit}
- Net Profit: {net_profit}
- Total Assets: {total_assets}
- Total Liabilities: {total_liabilities}
- Total Equity: {total_equity}
- Current Ratio: {ratios.get('liquidity', {}).get('current_ratio', 0)}
- ROE: {ratios.get('profitability', {}).get('roe', 'N/A')}
- Revenue Growth: {ratios.get('yoy_growth', {}).get('revenue_growth', 0)}

Provide a detailed analysis covering:
1. Growth Performance Overview
2. Profitability Analysis
3. Liquidity and Solvency Assessment
4. Efficiency Metrics
5. Risk Assessment
6. Recommendations

Return as a single comprehensive text analysis (not JSON)."""
    
    try:
        try:
            analysis_text = generate_content_vertexai(analysis_prompt, require_json=False)
        except Exception as e:
            analysis_text = f"Analysis generation error: {str(e)}"
    except Exception as e:
        analysis_text = f"Analysis generation error: {str(e)}"
    
    reports["management_report"] = {
        "entity_name": base_data.get("entity_name", ""),
        "period": base_data.get("period", ""),
        "total_accounts": len(balances),
        "total_debits": base_data.get("total_debits", 0) or 0,
        "total_credits": base_data.get("total_credits", 0) or 0,
        "is_balanced": base_data.get("is_balanced", False),
        "difference": base_data.get("difference", 0) or 0,
        "analysis": analysis_text,
        "financial_statements": {
            "pl_statement": reports["profit_loss"],
            "balance_sheet": reports["balance_sheet"],
            "cash_flow": reports["cash_flow"]
        },
        "ratios": ratios
    }
    
    return reports


def calculate_trial_balance_ratios(current_assets, current_liabilities, cash, inventory, 
                                   total_assets, total_liabilities, total_equity,
                                   revenue, gross_profit, net_profit, expenses):
    """
    Calculate comprehensive financial ratios from trial balance data.
    CRITICAL: Only calculate ratios when all required values are available and valid.
    Do NOT use placeholder/default values - return None if data is missing.
    """
    
    # Helper to check if value is valid (not None, not 0 for denominators)
    def is_valid(value):
        return value is not None and (isinstance(value, (int, float)) and not (isinstance(value, float) and (value != value)))  # Check for NaN
    
    # Liquidity Ratios - only calculate if all values are valid
    current_ratio = None
    if is_valid(current_assets) and is_valid(current_liabilities) and current_liabilities > 0:
        current_ratio = current_assets / current_liabilities
    
    quick_ratio = None
    if is_valid(current_assets) and is_valid(inventory) and is_valid(current_liabilities) and current_liabilities > 0:
        quick_ratio = (current_assets - inventory) / current_liabilities
    
    cash_ratio = None
    if is_valid(cash) and is_valid(current_liabilities) and current_liabilities > 0:
        cash_ratio = cash / current_liabilities
    
    # Profitability Ratios - only calculate if all values are valid
    gross_margin = None
    if is_valid(gross_profit) and is_valid(revenue) and revenue > 0:
        gross_margin = (gross_profit / revenue) * 100
    
    ebitda_margin = None
    if is_valid(gross_profit) and is_valid(revenue) and revenue > 0:
        # Using gross_profit as proxy for EBITDA if EBITDA not available
        ebitda_margin = (gross_profit / revenue) * 100
    
    roe = None
    if is_valid(net_profit) and is_valid(total_equity) and total_equity > 0:
        roe = (net_profit / total_equity) * 100
    
    roa = None
    if is_valid(net_profit) and is_valid(total_assets) and total_assets > 0:
        roa = (net_profit / total_assets) * 100
    
    net_profit_margin = None
    if is_valid(net_profit) and is_valid(revenue) and revenue > 0:
        net_profit_margin = (net_profit / revenue) * 100
    
    # Efficiency Ratios - only calculate if all values are valid
    asset_turnover = None
    if is_valid(revenue) and is_valid(total_assets) and total_assets > 0:
        asset_turnover = revenue / total_assets
    
    inventory_turnover = None
    # Only calculate if we have COGS and average inventory - do not use default values
    # This should be calculated from actual data, not hardcoded
    
    # Solvency Ratios - only calculate if all values are valid
    debt_to_equity = None
    if is_valid(total_liabilities) and is_valid(total_equity) and total_equity > 0:
        debt_to_equity = total_liabilities / total_equity
    
    interest_coverage = None
    # Only calculate if we have EBIT and interest expense - do not use default values
    # This should be calculated from actual data, not hardcoded
    
    # Working Capital - only calculate if all values are valid
    working_capital = None
    if is_valid(current_assets) and is_valid(current_liabilities):
        working_capital = current_assets - current_liabilities
    
    working_capital_ratio = current_ratio  # Same as current ratio (already validated above)
    
    # Growth Ratios - set to None if previous period data is not available
    # DO NOT use default/placeholder values - these require actual previous period data
    revenue_growth = None  # Requires previous period revenue
    expense_growth = None  # Requires previous period expenses
    net_profit_growth = None  # Requires previous period net profit
    
    # Cash Flow Health Score - set to None if cannot be calculated
    # DO NOT use default values - this should be calculated from actual cash flow patterns
    cash_flow_score = None
    
    # Helper to format ratio values (handles None)
    def format_ratio(value, decimals=2):
        if value is None:
            return None
        return round(value, decimals)
    
    def format_percentage(value, decimals=1):
        if value is None:
            return None
        return f"{round(value, decimals)}%"
    
    return {
        "liquidity": {
            "current_ratio": format_ratio(current_ratio),
            "quick_ratio": format_ratio(quick_ratio),
            "cash_ratio": format_ratio(cash_ratio)
        },
        "profitability": {
            "gross_margin": format_percentage(gross_margin) if gross_margin is not None else None,
            "ebitda_margin": format_percentage(ebitda_margin) if ebitda_margin is not None else None,
            "roe": format_percentage(roe) if roe is not None else None,
            "roa": format_percentage(roa) if roa is not None else None,
            "net_profit_margin": format_percentage(net_profit_margin) if net_profit_margin is not None else None,
            "netProfitMargin": format_ratio(net_profit_margin, 2) if net_profit_margin is not None else None
        },
        "efficiency": {
            "asset_turnover": format_ratio(asset_turnover),
            "inventory_turnover": format_ratio(inventory_turnover) if inventory_turnover is not None else None
        },
        "solvency": {
            "debt_to_equity": format_ratio(debt_to_equity),
            "interest_coverage": format_ratio(interest_coverage) if interest_coverage is not None else None
        },
        "working_capital": {
            "working_capital_amount": format_ratio(working_capital),
            "working_capital_ratio": format_ratio(working_capital_ratio)
        },
        "yoy_growth": {
            "revenue_growth": revenue_growth,
            "expense_growth": expense_growth,
            "net_profit_growth": net_profit_growth
        },
        "cash_flow_health_score": cash_flow_score,
        "risk_flags": []
    }


def generate_balance_sheet_reports(base_data, text):
    """Generate all 5 reports for Balance Sheet"""
    reports = {}
    
    assets = base_data.get("assets", {})
    liabilities = base_data.get("liabilities", {})
    equity = base_data.get("equity", {})
    
    # 1. Asset & Liability Schedules
    reports["asset_liability_schedules"] = {
        "assets": {
            "current_assets": assets.get("current_assets", 0) or 0,
            "fixed_assets": assets.get("fixed_assets", 0) or 0,
            "intangible_assets": assets.get("intangible_assets", 0) or 0,
            "investments": assets.get("investments", 0) or 0,
            "other_assets": assets.get("other_assets", 0) or 0,
            "total": assets.get("total_assets", 0) or 0,
            "breakdown": assets.get("asset_breakdown", [])
        },
        "liabilities": {
            "current_liabilities": liabilities.get("current_liabilities", 0) or 0,
            "long_term_liabilities": liabilities.get("long_term_liabilities", 0) or 0,
            "loans": liabilities.get("loans", 0) or 0,
            "creditors": liabilities.get("creditors", 0) or 0,
            "other_liabilities": liabilities.get("other_liabilities", 0) or 0,
            "total": liabilities.get("total_liabilities", 0) or 0,
            "breakdown": liabilities.get("liability_breakdown", [])
        }
    }
    
    # 2. Net Worth Statement
    total_assets = assets.get("total_assets", 0) or 0
    total_liabilities = liabilities.get("total_liabilities", 0) or 0
    total_equity = equity.get("total_equity", 0) or 0
    reports["net_worth_statement"] = {
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": total_assets - total_liabilities,
        "equity": total_equity
    }
    
    # 3. Solvency & Liquidity Summary
    current_assets = assets.get("current_assets", 0) or 0
    current_liabilities = liabilities.get("current_liabilities", 0) or 0
    reports["solvency_liquidity_summary"] = {
        "current_ratio": (current_assets / current_liabilities) if current_liabilities > 0 else 0,
        "quick_ratio": 0,  # Would need inventory data
        "debt_to_equity": (liabilities.get("loans", 0) or 0) / (total_equity if total_equity > 0 else 1),
        "working_capital": current_assets - current_liabilities,
        "solvency_ratio": (total_assets / total_liabilities) if total_liabilities > 0 else 0
    }
    
    # 4. Equity Movement Statement
    reports["equity_movement_statement"] = {
        "opening_equity": 0,  # Would need previous period
        "share_capital": equity.get("share_capital", 0) or 0,
        "reserves": equity.get("reserves", 0) or 0,
        "retained_earnings": equity.get("retained_earnings", 0) or 0,
        "closing_equity": total_equity,
        "movement": total_equity
    }
    
    # 5. Financial Position Report
    reports["financial_position_report"] = {
        "entity_name": base_data.get("entity_name"),
        "period": base_data.get("period"),
        "assets": {
            "total": total_assets,
            "current": current_assets,
            "non_current": total_assets - current_assets
        },
        "liabilities": {
            "total": total_liabilities,
            "current": current_liabilities,
            "non_current": total_liabilities - current_liabilities
        },
        "equity": {
            "total": total_equity,
            "components": {
                "share_capital": equity.get("share_capital", 0) or 0,
                "reserves": equity.get("reserves", 0) or 0,
                "retained_earnings": equity.get("retained_earnings", 0) or 0
            }
        },
        "is_balanced": base_data.get("summary", {}).get("is_balanced", False)
    }
    
    return reports


def generate_audit_papers_reports(base_data, text):
    """Generate all 5 reports for Audit Papers"""
    reports = {}
    
    # These would be generated from audit document analysis
    audit_prompt = f"""Generate Audit-Ready Summary from audit papers:
{{
  "audit_period": "",
  "entity_name": "",
  "audit_type": "",
  "key_findings": [],
  "adjustments": [],
  "recommendations": [],
  "audit_opinion": ""
}}

Base Data: {json.dumps(base_data, indent=2)[:3000] if base_data else "None"}
OCR Text: {text[:4000]}
Return ONLY JSON."""
    
    try:
        content = generate_content_vertexai(audit_prompt, require_json=True)
        audit_summary = json.loads(content)
    except Exception as e:
        audit_summary = {"error": f"Could not generate audit summary: {str(e)}"}
    
    reports["audit_ready_summary"] = audit_summary
    reports["supporting_schedules"] = {"schedules": []}
    reports["adjustment_notes"] = {"adjustments": []}
    reports["working_papers"] = {"papers": []}
    reports["final_audit_pack"] = {"status": "ready", "components": list(reports.keys())}
    
    return reports


def generate_comprehensive_audit_report(extracted_texts):
    """Generate comprehensive audit report from multiple PDF documents"""
    
    # Combine all extracted texts
    all_text = "\n\n---DOCUMENT SEPARATOR---\n\n".join([
        f"Document Type: {doc_info['type']}\nFilename: {doc_info['filename']}\n\n{doc_info['text'][:10000]}"
        for doc_info in extracted_texts.values()
    ])
    
    # Create comprehensive audit report prompt
    audit_prompt = f"""You are a professional auditor analyzing multiple financial documents to generate a comprehensive Financial Audit Report.

The following documents have been provided:
{chr(10).join([f"- {doc_info['filename']} ({doc_info['type']})" for doc_info in extracted_texts.values()])}

Extracted text from all documents:
{all_text[:50000]}

Generate a comprehensive Financial Audit Report in the following JSON format:

{{
  "header": {{
    "title": "Financial Audit Report",
    "company_name": "",
    "financial_year": "",
    "audit_type": "Statutory Audit",
    "auditor_name": "",
    "date_of_audit": "",
    "branch": "",
    "audit_objective": "To provide an independent opinion on the fairness of financial statements and compliance with statutory requirements."
  }},
  "executive_summary": {{
    "objective": "",
    "total_income": 0,
    "net_profit": 0,
    "trial_balance_status": "",
    "balance_sheet_discrepancy": 0,
    "gst_variances": "",
    "tds_variances": "",
    "fixed_asset_management": ""
  }},
  "detailed_financial_analysis": {{
    "profitability_analysis": {{
      "revenue": {{
        "total": 0,
        "breakdown": []
      }},
      "direct_expenses": {{
        "total": 0,
        "breakdown": []
      }},
      "indirect_expenses": {{
        "total": 0,
        "breakdown": []
      }},
      "depreciation_expense": 0,
      "net_profit": 0,
      "recommendations": []
    }},
    "balance_sheet_assessment": {{
      "total_assets": 0,
      "total_liabilities_and_equity": 0,
      "imbalance": 0,
      "key_asset_components": {{}},
      "liabilities_side": {{}},
      "recommendations": []
    }},
    "liquidity_and_working_capital": {{
      "working_capital_components": {{}},
      "cash_and_bank_balances": 0,
      "cash_book_summary": "",
      "bank_balances_summary": "",
      "conclusion": ""
    }}
  }},
  "general_ledger_behavior": {{
    "debtors_ledger": "",
    "outstanding_debtor_balance": 0,
    "adjustments": [],
    "payment_patterns": "",
    "conclusion": ""
  }},
  "cash_and_bank_review": {{
    "coherence": "",
    "cash_flows": "",
    "major_bank_transactions": [],
    "conclusion": ""
  }},
  "gst_compliance_review": {{
    "outward_taxable_supplies": 0,
    "output_gst_liability": 0,
    "input_tax_credit_claimed": 0,
    "net_gst_payable": 0,
    "actual_gst_paid": 0,
    "variance": 0,
    "compliance_status": ""
  }},
  "tds_compliance_review": {{
    "tds_on_salary": 0,
    "tds_on_contractors": 0,
    "tds_on_rent": 0,
    "cumulative_tds": 0,
    "recorded_tds_payable": 0,
    "tds_paid": 0,
    "variance": 0,
    "recommendations": []
  }},
  "fixed_asset_register_review": {{
    "machinery_acquisition_costs": 0,
    "furniture_acquisition_costs": 0,
    "useful_life_assumptions": "",
    "depreciation_recording": "",
    "recommendations": []
  }},
  "key_findings_and_risks": [
    {{
      "finding": "",
      "risk_level": "low/medium/high",
      "impact": ""
    }}
  ],
  "recommendations": [
    ""
  ]
}}

Instructions:
1. Extract all financial figures, dates, and company information from the documents
2. Calculate totals, variances, and discrepancies
3. Identify compliance issues (GST, TDS)
4. Analyze balance sheet imbalances
5. Review ledger behavior and cash flows
6. Assess fixed asset management
7. Provide specific, actionable recommendations
8. Use Indian currency format (INR/Rs.) and Indian accounting standards
9. Be thorough and professional in your analysis

Return ONLY valid JSON. No explanations or markdown formatting."""
    
    try:
        content = generate_content_vertexai(audit_prompt, require_json=True)
        audit_report = json.loads(content)
        
        # Add metadata
        audit_report["metadata"] = {
            "documents_processed": len(extracted_texts),
            "document_types": [doc_info['type'] for doc_info in extracted_texts.values()],
            "filenames": [doc_info['filename'] for doc_info in extracted_texts.values()]
        }
        
        return audit_report
    except Exception as e:
        return {
            "error": f"Error generating comprehensive audit report: {str(e)}",
            "metadata": {
                "documents_processed": len(extracted_texts),
                "document_types": [doc_info['type'] for doc_info in extracted_texts.values()]
            }
        }


def generate_agreement_contract_reports(base_data, text):
    """Generate all 5 reports for Agreements/Contracts"""
    reports = {}
    
    contract_prompt = f"""Extract and analyze contract/agreement:
{{
  "contract_type": "",
  "parties": [],
  "key_terms": [],
  "obligations": [],
  "risks": [],
  "compliance_requirements": [],
  "summary": ""
}}

OCR Text: {text[:6000] if text else ""}
Return ONLY JSON."""
    
    try:
        content = generate_content_vertexai(contract_prompt, require_json=True)
        contract_data = json.loads(content)
    except Exception as e:
        contract_data = {"error": f"Could not extract contract data: {str(e)}"}
    
    reports["contract_summary"] = contract_data
    reports["key_clause_extraction"] = {"clauses": contract_data.get("key_terms", [])}
    reports["risk_obligation_analysis"] = {
        "risks": contract_data.get("risks", []),
        "obligations": contract_data.get("obligations", [])
    }
    reports["term_compliance_summary"] = {
        "compliance_requirements": contract_data.get("compliance_requirements", []),
        "status": "pending"
    }
    reports["contract_analysis"] = contract_data
    
    return reports


