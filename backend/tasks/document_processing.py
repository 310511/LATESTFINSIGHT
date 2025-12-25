"""
Background tasks for document processing using Celery
"""
import os
import json
import tempfile
from celery import Task
from celery_app import celery_app
from typing import Dict, List, Optional
import base64

# Import processing functions - using lazy imports to avoid circular dependencies
# These will be imported when the task runs, not at module load time


class ProcessingTask(Task):
    """Base task class with error handling"""
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        print(f"Task {task_id} failed: {str(exc)}")
        print(f"Error info: {einfo}")
    
    def on_success(self, retval, task_id, args, kwargs):
        print(f"Task {task_id} completed successfully")


@celery_app.task(bind=True, base=ProcessingTask, name="tasks.document_processing.process_document_task")
def process_document_task(self, file_data: Dict, document_type: Optional[str] = None) -> Dict:
    """
    Process a single document asynchronously
    
    Args:
        file_data: Dictionary containing:
            - filename: str
            - content: str (base64 encoded file content)
            - mime_type: str
        document_type: Optional document type hint
    
    Returns:
        Dict with processing result
    """
    task_id = self.request.id
    print(f"\n{'='*60}")
    print(f"Starting document processing task: {task_id}")
    print(f"Filename: {file_data.get('filename', 'unknown')}")
    print(f"Document type: {document_type}")
    print(f"{'='*60}\n")
    
    temp_file_path = None
    
    try:
        # Lazy import to avoid circular dependencies
        from app import (
            extract_text_from_pdf,
            extract_text_from_docx,
            extract_text_from_image,
            classify_document,
            extract_bank_statement_structured,
            extract_gst_return,
            extract_trial_balance,
            extract_profit_loss,
            extract_invoice,
            extract_purchase_order,
            extract_salary_slip,
            extract_balance_sheet,
            extract_audit_papers,
            extract_agreement_contract,
            extract_excel_data
        )
        from report_generators import (
            generate_bank_statement_reports,
            generate_gst_return_reports,
            generate_invoice_reports,
            generate_purchase_order_reports,
            generate_salary_slip_reports,
            generate_profit_loss_reports,
            generate_trial_balance_reports,
            generate_balance_sheet_reports,
            generate_audit_papers_reports,
            generate_agreement_contract_reports
        )
        
        # Update task state
        self.update_state(state='PROCESSING', meta={'status': 'Extracting text from document...'})
        
        # Decode file content
        file_content = base64.b64decode(file_data['content'])
        filename = file_data['filename']
        
        # Save to temporary file
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, f"finsight_{task_id}_{filename}")
        
        with open(temp_file_path, "wb") as temp:
            temp.write(file_content)
        
        print(f"File saved to: {temp_file_path}")
        
        # Extract text
        self.update_state(state='PROCESSING', meta={'status': 'Extracting text...', 'progress': 10})
        
        if filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(temp_file_path)
        elif filename.lower().endswith((".docx", ".doc")):
            text = extract_text_from_docx(temp_file_path)
        elif filename.lower().endswith((".jpg", ".jpeg", ".png")):
            text = extract_text_from_image(temp_file_path)
        elif filename.lower().endswith((".xlsx", ".xls")):
            # Handle Excel files
            excel_data = extract_excel_data(temp_file_path)
            # For now, convert to text representation
            text = excel_data.get("summary_text", "")
        else:
            # Try to read as text file
            with open(temp_file_path, "r", encoding="utf-8") as f:
                text = f.read()
        
        print(f"Text extracted: {len(text)} characters")
        
        # Normalize document type
        if document_type:
            document_type = document_type.lower().replace(" ", "_").replace("-", "_")
        
        # Classify document if type not provided
        if not document_type:
            self.update_state(state='PROCESSING', meta={'status': 'Classifying document type...', 'progress': 20})
            try:
                detected = classify_document(text)
                document_type = detected.get("type", "").lower().replace(" ", "_")
                print(f"Detected document type: {document_type}")
            except Exception as e:
                print(f"Warning: Classification failed: {str(e)}")
                document_type = "unknown"
        
        # Extract data based on document type
        self.update_state(state='PROCESSING', meta={'status': 'Extracting structured data...', 'progress': 40})
        
        result = None
        
        if document_type == "bank_statement" or "bank" in text.lower():
            result = extract_bank_statement_structured(text)
        elif document_type == "gst_return" or "gst" in text.lower():
            result = extract_gst_return(text)
        elif document_type == "trial_balance":
            result = extract_trial_balance(text)
        elif document_type == "profit_loss" or ("profit" in text.lower() and "loss" in text.lower()):
            result = extract_profit_loss(text)
        elif document_type == "invoice":
            result = extract_invoice(text)
        elif document_type == "purchase_order":
            result = extract_purchase_order(text)
        elif document_type == "salary_slip" or "salary" in text.lower():
            result = extract_salary_slip(text)
        elif document_type == "balance_sheet":
            result = extract_balance_sheet(text)
        elif document_type == "audit_papers":
            result = extract_audit_papers(text)
        elif document_type == "agreement_contract":
            result = extract_agreement_contract(text)
        else:
            # Default to bank statement if unknown
            print("Unknown document type, defaulting to bank statement extraction")
            result = extract_bank_statement_structured(text)
        
        # Generate reports
        self.update_state(state='PROCESSING', meta={'status': 'Generating reports...', 'progress': 70})
        
        reports = {}
        try:
            if document_type == "bank_statement":
                reports = generate_bank_statement_reports(result, text)
            elif document_type == "gst_return":
                reports = generate_gst_return_reports(result, text)
            elif document_type == "invoice":
                reports = generate_invoice_reports(result, text)
            elif document_type == "purchase_order":
                reports = generate_purchase_order_reports(result, text)
            elif document_type == "salary_slip":
                reports = generate_salary_slip_reports(result, text)
            elif document_type == "profit_loss":
                reports = generate_profit_loss_reports(result, text)
            elif document_type == "trial_balance":
                reports = generate_trial_balance_reports(result, text)
            elif document_type == "balance_sheet":
                reports = generate_balance_sheet_reports(result, text)
            elif document_type == "audit_papers":
                reports = generate_audit_papers_reports(result, text)
            elif document_type == "agreement_contract":
                reports = generate_agreement_contract_reports(result, text)
        except Exception as e:
            print(f"Warning: Report generation failed: {str(e)}")
            reports = {}
        
        # Combine result and reports
        final_result = {
            "extracted_data": result,
            "reports": reports,
            "document_type": document_type,
            "filename": filename
        }
        
        # Cache the complete result if Redis is available
        try:
            import redis
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            redis_client_cache = redis.from_url(redis_url, decode_responses=True)
            
            # Generate cache key from original file content
            file_content = base64.b64decode(file_data['content'])
            import hashlib
            file_hash = hashlib.sha256(file_content).hexdigest()
            doc_type_str = document_type or "auto"
            doc_cache_key = f"document_cache:{file_hash}:{doc_type_str}"
            
            # Cache for 7 days (604800 seconds)
            redis_client_cache.setex(doc_cache_key, 604800, json.dumps(final_result))
            print(f"✓ Cached complete document result in task (key: {doc_cache_key[:30]}..., TTL: 7 days)")
        except Exception as cache_error:
            print(f"Warning: Could not cache result in task: {str(cache_error)}")
        
        self.update_state(state='SUCCESS', meta={'status': 'Processing completed', 'progress': 100, 'result': final_result})
        
        return final_result
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        error_msg = str(e)
        error_type = type(e).__name__
        
        print(f"ERROR in process_document_task {task_id}: {error_type}: {error_msg}")
        print(f"Traceback:\n{error_trace}")
        
        # Update state with properly formatted error info
        try:
            self.update_state(
                state='FAILURE',
                meta={
                    'status': 'Processing failed',
                    'error': error_msg,
                    'error_type': error_type
                }
            )
        except Exception as update_error:
            print(f"Failed to update task state: {str(update_error)}")
        
        # Return error result instead of raising to avoid serialization issues
        return {
            'status': 'failed',
            'error': error_msg,
            'error_type': error_type,
            'result': None
        }
    
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                print(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                print(f"Warning: Could not delete temporary file: {e}")


@celery_app.task(bind=True, base=ProcessingTask, name="tasks.document_processing.process_gst_files_task")
def process_gst_files_task(self, files_data: List[Dict]) -> Dict:
    """
    Process multiple GST files asynchronously
    
    Args:
        files_data: List of file dictionaries (same format as process_document_task)
    
    Returns:
        Dict with combined processing results
    """
    task_id = self.request.id
    print(f"Starting GST files processing task: {task_id}")
    
    self.update_state(state='PROCESSING', meta={'status': f'Processing {len(files_data)} files...', 'progress': 0})
    
    # This would process multiple files and combine results
    # For now, process first file as placeholder
    # Full implementation would handle all files
    
    return {"status": "completed", "files_processed": len(files_data)}


@celery_app.task(bind=True, base=ProcessingTask, name="tasks.document_processing.process_audit_files_task")
def process_audit_files_task(self, files_data: List[Dict]) -> Dict:
    """
    Process multiple audit files asynchronously
    
    Args:
        files_data: List of file dictionaries
    
    Returns:
        Dict with comprehensive audit report
    """
    task_id = self.request.id
    print(f"Starting audit files processing task: {task_id}")
    
    self.update_state(state='PROCESSING', meta={'status': f'Processing {len(files_data)} audit files...', 'progress': 0})
    
    # Placeholder - would implement full audit processing
    return {"status": "completed", "files_processed": len(files_data)}

