import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

const ProcessingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileName = location.state?.fileName || "document.pdf";
  const file = location.state?.file;
  const documentType = location.state?.documentType || null;
  const auditFiles = location.state?.auditFiles || null;
  const gstFiles = location.state?.gstFiles || null;
  const isMultipleFiles = location.state?.isMultipleFiles || false;

  // Processing steps
  const steps = [
    "Text extraction",
    "Table detection",
    "Transaction identification",
    "Categorization",
    "Document generation",
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [stepInterval, setStepInterval] = useState(null);
  const [checkingBackend, setCheckingBackend] = useState(false);

  // Process the file when component mounts
  useEffect(() => {
    if (isMultipleFiles && auditFiles) {
      processAuditFiles();
    } else if (isMultipleFiles && gstFiles) {
      processGstFiles();
    } else if (file) {
      processFile();
    } else {
      // If no file, simulate steps (for demo)
      simulateSteps();
    }
    
    // Cleanup interval on unmount
    return () => {
      if (stepInterval) {
        clearInterval(stepInterval);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const processFile = async () => {
    setProcessing(true);
    setError(null);
    setCurrentStep(0);
    setCheckingBackend(true);
    
    // FastAPI endpoint
    const API_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';
    
    // First, check if backend is available
    try {
      const healthController = new AbortController();
      const healthTimeout = setTimeout(() => healthController.abort(), 5000); // 5 second timeout
      
      const healthCheck = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: healthController.signal
      });
      
      clearTimeout(healthTimeout);
      
      if (!healthCheck.ok) {
        throw new Error(`Backend health check failed with status ${healthCheck.status}`);
      }
      
      setCheckingBackend(false);
    } catch (healthError) {
      setCheckingBackend(false);
      if (healthError.name === 'AbortError') {
        setError(`Backend server is not responding at ${API_URL}.\n\nPlease ensure:\n1. The FastAPI server is running (run: python backend/app.py or uvicorn backend.app:app --reload)\n2. The server is accessible at the URL above\n3. Check the terminal/console for any server errors`);
      } else {
        setError(`Backend server is not available at ${API_URL}.\n\nError: ${healthError.message}\n\nPlease ensure:\n1. The FastAPI server is running\n2. The server is accessible at the URL above\n3. Check the terminal/console for any server errors`);
      }
      setProcessing(false);
      return;
    }
    
    // Start animating steps while API call is in progress
    const progressInterval = setInterval(() => {
      setCurrentStep((prev) => {
        // Don't go beyond step 4 (Document generation) until API completes
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500); // Update every 2.5 seconds
    
    setStepInterval(progressInterval);
    
    // Set a maximum timeout for the entire process (5 minutes)
    const timeoutId = setTimeout(() => {
      clearInterval(progressInterval);
      setStepInterval(null);
      setError("Processing timeout: The request took too long. Please check if the backend server is running and try again.");
      setProcessing(false);
    }, 300000); // 5 minutes timeout
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add document type if provided
      if (documentType) {
        formData.append('document_type', documentType);
      }
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const requestTimeout = setTimeout(() => controller.abort(), 240000); // 4 minutes for request
      
      let response;
      try {
        response = await fetch(`${API_URL}/process`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        clearTimeout(requestTimeout);
      } catch (fetchError) {
        clearTimeout(requestTimeout);
        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        setStepInterval(null);
        
        if (fetchError.name === 'AbortError') {
          setError("Request timeout: The server took too long to respond. Please check if the backend is running at " + API_URL);
        } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
          setError(`Connection failed: Cannot reach the backend server at ${API_URL}. Please ensure:\n1. The FastAPI server is running (python backend/app.py or uvicorn)\n2. The server is accessible at ${API_URL}\n3. CORS is properly configured`);
        } else {
          setError(`Network error: ${fetchError.message}`);
        }
        setProcessing(false);
        return;
      }

      if (!response.ok) {
        let errorMessage = 'Processing failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (e2) {
            errorMessage = `Server returned status ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Debug: Log the response data
      console.log("ProcessingPage - Backend response:", JSON.stringify(data, null, 2));
      console.log("ProcessingPage - Response keys:", Object.keys(data));
      console.log("ProcessingPage - Has job_id?", !!data.job_id);
      console.log("ProcessingPage - Status:", data.status);
      
      // Check if this is a job queue response (async processing)
      // Handle both direct response and wrapped response (FastAPI JSONResponse might wrap in 'content')
      let responseData = data;
      if (data.content) {
        responseData = data.content; // FastAPI JSONResponse wraps content
      }
      
      console.log("ProcessingPage - Checking for job_id. responseData:", responseData);
      console.log("ProcessingPage - Has job_id?", !!responseData?.job_id);
      console.log("ProcessingPage - Status value:", responseData?.status);
      
      // Check if this is a job queue response (async processing)
      if (responseData?.job_id && (responseData.status === "queued" || responseData.status === "pending")) {
        console.log("ProcessingPage - Job queued, starting polling for job_id:", responseData.job_id);
        
        // Stop the step animation interval temporarily while polling
        clearInterval(progressInterval);
        
        // Poll job status until completion
        const jobId = responseData.job_id;
        let pollAttempts = 0;
        const maxPollAttempts = 300; // 10 minutes at 2 seconds per poll
        
        const pollInterval = setInterval(async () => {
          pollAttempts++;
          
          try {
            console.log(`ProcessingPage - Polling attempt ${pollAttempts} for job ${jobId}`);
            const statusResponse = await fetch(`${API_URL}/job/${jobId}/status`);
            
            if (!statusResponse.ok) {
              // If 503, job queue might not be available
              if (statusResponse.status === 503) {
                clearInterval(pollInterval);
                clearTimeout(timeoutId);
                setStepInterval(null);
                setError("Job queue is not available. Please ensure Redis and Celery worker are running.");
                setProcessing(false);
                return;
              }
              throw new Error(`Status check failed: ${statusResponse.status}`);
            }
            
            const statusData = await statusResponse.json();
            console.log("ProcessingPage - Job status response:", statusData);
            
            // Update progress based on job status
            if (statusData.progress !== undefined) {
              // Map progress (0-100) to steps (0-4)
              const progressStep = Math.floor((statusData.progress / 100) * (steps.length - 1));
              setCurrentStep(Math.min(progressStep, steps.length - 1));
              console.log(`ProcessingPage - Progress: ${statusData.progress}%, Step: ${progressStep}`);
            }
            
            if (statusData.status === "completed" || statusData.state === "SUCCESS") {
              clearInterval(pollInterval);
              clearTimeout(timeoutId);
              setStepInterval(null);
              
              // Fetch the actual result
              console.log("ProcessingPage - Job completed, fetching result...");
              const resultResponse = await fetch(`${API_URL}/job/${jobId}/result`);
              if (!resultResponse.ok) {
                throw new Error(`Failed to fetch job result: ${resultResponse.status}`);
              }
              
              const resultData = await resultResponse.json();
              console.log("ProcessingPage - Job result received:", resultData);
              console.log("ProcessingPage - Result keys:", Object.keys(resultData || {}));
              
              // Extract the actual data from the result
              // Result format from task: { extracted_data: {...}, reports: {...}, document_type: "...", filename: "..." }
              // Or might be directly the extracted_data if nested
              let actualData = resultData;
              let reports = {};
              
              if (resultData.extracted_data) {
                actualData = resultData.extracted_data;
                reports = resultData.reports || {};
              } else if (resultData.result && resultData.result.extracted_data) {
                // If result is nested in another result object
                actualData = resultData.result.extracted_data;
                reports = resultData.result.reports || {};
              }
              
              console.log("ProcessingPage - Extracted data:", actualData);
              console.log("ProcessingPage - Extracted reports:", reports);
              
              // Merge extracted data with reports
              const finalResult = { ...actualData, reports };
              
              setResult(finalResult);
              
              // Complete all steps
              setCurrentStep(steps.length);
              
              // Navigate to results with actual data after showing completion
              setTimeout(() => {
                navigate("/dashboard/results", { 
                  state: { 
                    fileName: fileName || resultData.filename, 
                    result: finalResult, 
                    documentType: documentType || resultData.document_type || "unknown"
                  } 
                });
              }, 1500);
            } else if (statusData.status === "failed" || statusData.state === "FAILURE") {
              clearInterval(pollInterval);
              clearTimeout(timeoutId);
              setStepInterval(null);
              const errorMsg = statusData.error || statusData.message || "Job processing failed";
              console.error("ProcessingPage - Job failed:", errorMsg);
              throw new Error(errorMsg);
            } else if (statusData.status === "processing" || statusData.state === "PROCESSING") {
              // Update progress message
              if (statusData.message) {
                console.log("ProcessingPage - Processing:", statusData.message);
              }
            } else if (statusData.status === "pending" || statusData.state === "PENDING") {
              console.log("ProcessingPage - Job is pending, waiting...");
            }
            
            // Check max attempts
            if (pollAttempts >= maxPollAttempts) {
              clearInterval(pollInterval);
              clearTimeout(timeoutId);
              setStepInterval(null);
              setError("Job processing timeout: The job took too long to complete (10 minutes).");
              setProcessing(false);
            }
          } catch (pollError) {
            console.error("ProcessingPage - Error polling job status:", pollError);
            clearInterval(pollInterval);
            clearTimeout(timeoutId);
            setStepInterval(null);
            setError(`Error checking job status: ${pollError.message}`);
            setProcessing(false);
          }
        }, 2000); // Poll every 2 seconds
        
        // Set a timeout for polling (max 10 minutes)
        const pollTimeout = setTimeout(() => {
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          setStepInterval(null);
          setError("Job processing timeout: The job took too long to complete (10 minutes).");
          setProcessing(false);
        }, 600000); // 10 minutes
        
        // Store poll interval and timeout for cleanup
        setStepInterval(pollInterval);
        
        return; // Exit early, polling will handle the rest
      }
      
      // Legacy synchronous response handling (fallback)
      console.log("ProcessingPage - Response keys:", Object.keys(data));
      console.log("ProcessingPage - Full data object:", data);
      
      // FastAPI JSONResponse might wrap the content, so check if data has the fields directly
      // or if they're nested
      const actualData = data.transactions ? data : (data.data || data.content || data);
      
      console.log("ProcessingPage - Actual data:", actualData);
      console.log("ProcessingPage - Actual data keys:", Object.keys(actualData || {}));
      
      setResult(actualData);
      
      // Clear timeouts and intervals
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      setStepInterval(null);
      
      // Complete all steps
      setCurrentStep(steps.length);
      
      // Navigate to results with actual data after showing completion
      setTimeout(() => {
        navigate("/dashboard/results", { 
          state: { fileName, result: actualData, documentType: documentType } 
        });
      }, 1500);
      
    } catch (err) {
      console.error("Processing error:", err);
      // Clear timeouts and intervals on error
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      setStepInterval(null);
      
      let errorMessage = err.message || "Failed to process document";
      
      // Provide helpful error messages
      if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        errorMessage = "Processing timeout: The request took too long. This might be due to:\n1. Large file size\n2. Backend server not responding\n3. Network issues\n\nPlease try again or check if the backend server is running.";
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = `Cannot connect to backend server. Please ensure:\n1. The FastAPI server is running\n2. Server URL is correct: ${import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000'}\n3. Check browser console for CORS errors`;
      }
      
      setError(errorMessage);
      setProcessing(false);
    }
  };

  const processAuditFiles = async () => {
    setProcessing(true);
    setError(null);
    setCurrentStep(0);
    setCheckingBackend(true);
    
    // FastAPI endpoint
    const API_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';
    
    // First, check if backend is available
    try {
      const healthController = new AbortController();
      const healthTimeout = setTimeout(() => healthController.abort(), 5000);
      
      const healthCheck = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: healthController.signal
      });
      
      clearTimeout(healthTimeout);
      
      if (!healthCheck.ok) {
        throw new Error(`Backend health check failed with status ${healthCheck.status}`);
      }
      
      setCheckingBackend(false);
    } catch (healthError) {
      setCheckingBackend(false);
      if (healthError.name === 'AbortError') {
        setError(`Backend server is not responding at ${API_URL}.\n\nPlease ensure:\n1. The FastAPI server is running\n2. The server is accessible at the URL above\n3. Check the terminal/console for any server errors`);
      } else {
        setError(`Backend server is not available at ${API_URL}.\n\nError: ${healthError.message}\n\nPlease ensure:\n1. The FastAPI server is running\n2. The server is accessible at the URL above\n3. Check the terminal/console for any server errors`);
      }
      setProcessing(false);
      return;
    }
    
    // Start animating steps
    const progressInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3000); // Slightly longer for multiple files
    
    setStepInterval(progressInterval);
    
    // Set a maximum timeout (10 minutes for multiple files)
    const timeoutId = setTimeout(() => {
      clearInterval(progressInterval);
      setStepInterval(null);
      setError("Processing timeout: The request took too long. Please check if the backend server is running and try again.");
      setProcessing(false);
    }, 600000); // 10 minutes timeout
    
    try {
      const formData = new FormData();
      
      // Add all audit files
      const fileCount = Object.values(auditFiles).filter(f => f !== null).length;
      let addedCount = 0;
      
      for (const [key, file] of Object.entries(auditFiles)) {
        if (file !== null) {
          formData.append('files', file);
          addedCount++;
        }
      }
      
      if (addedCount === 0) {
        throw new Error("No files to process");
      }
      
      formData.append('document_type', 'audit');
      
      console.log(`Processing ${addedCount} audit files...`);
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const requestTimeout = setTimeout(() => controller.abort(), 540000); // 9 minutes for request
      
      let response;
      try {
        response = await fetch(`${API_URL}/process-audit`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        clearTimeout(requestTimeout);
      } catch (fetchError) {
        clearTimeout(requestTimeout);
        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        setStepInterval(null);
        
        if (fetchError.name === 'AbortError') {
          setError("Request timeout: The server took too long to respond. Please check if the backend is running at " + API_URL);
        } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
          setError(`Connection failed: Cannot reach the backend server at ${API_URL}. Please ensure:\n1. The FastAPI server is running\n2. The server is accessible at ${API_URL}\n3. CORS is properly configured`);
        } else {
          setError(`Network error: ${fetchError.message}`);
        }
        setProcessing(false);
        return;
      }

      if (!response.ok) {
        let errorMessage = 'Processing failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.error || errorMessage;
        } catch (e) {
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (e2) {
            errorMessage = `Server returned status ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      console.log("ProcessingPage - Audit report response:", JSON.stringify(data, null, 2));
      console.log("ProcessingPage - Audit report keys:", Object.keys(data || {}));
      
      // For audit reports, use the data directly (it's already in the correct format)
      const auditReportData = data;
      
      setResult(auditReportData);
      
      // Clear timeouts and intervals
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      setStepInterval(null);
      
      // Complete all steps
      setCurrentStep(steps.length);
      
      // Navigate to results with audit report data
      setTimeout(() => {
        navigate("/dashboard/results", { 
          state: { 
            fileName: `Audit Report - ${new Date().toLocaleDateString()}`, 
            result: auditReportData, 
            documentType: 'audit',
            isAuditReport: true
          } 
        });
      }, 1500);
      
    } catch (err) {
      console.error("Audit processing error:", err);
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      setStepInterval(null);
      
      let errorMessage = err.message || "Failed to process audit documents";
      
      if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        errorMessage = "Processing timeout: The request took too long. This might be due to:\n1. Large file sizes\n2. Multiple files being processed\n3. Backend server not responding\n\nPlease try again or check if the backend server is running.";
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = `Cannot connect to backend server. Please ensure:\n1. The FastAPI server is running\n2. Server URL is correct: ${import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000'}\n3. Check browser console for CORS errors`;
      }
      
      setError(errorMessage);
      setProcessing(false);
    }
  };

  const processGstFiles = async () => {
    setProcessing(true);
    setError(null);
    setCurrentStep(0);
    setCheckingBackend(true);
    
    // FastAPI endpoint
    const API_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';
    
    // First, check if backend is available
    try {
      const healthController = new AbortController();
      const healthTimeout = setTimeout(() => healthController.abort(), 5000);
      
      const healthCheck = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: healthController.signal
      });
      
      clearTimeout(healthTimeout);
      
      if (!healthCheck.ok) {
        throw new Error(`Backend health check failed with status ${healthCheck.status}`);
      }
      
      setCheckingBackend(false);
    } catch (healthError) {
      setCheckingBackend(false);
      if (healthError.name === 'AbortError') {
        setError(`Backend server is not responding at ${API_URL}.\n\nPlease ensure:\n1. The FastAPI server is running\n2. The server is accessible at the URL above\n3. Check the terminal/console for any server errors`);
      } else {
        setError(`Backend server is not available at ${API_URL}.\n\nError: ${healthError.message}\n\nPlease ensure:\n1. The FastAPI server is running\n2. The server is accessible at the URL above\n3. Check the terminal/console for any server errors`);
      }
      setProcessing(false);
      return;
    }
    
    // Start animating steps
    const progressInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3000);
    
    setStepInterval(progressInterval);
    
    // Set a maximum timeout (10 minutes for multiple files)
    const timeoutId = setTimeout(() => {
      clearInterval(progressInterval);
      setStepInterval(null);
      setError("Processing timeout: The request took too long. Please check if the backend server is running and try again.");
      setProcessing(false);
    }, 600000); // 10 minutes timeout
    
    try {
      const formData = new FormData();
      
      // Add all GST Excel files
      let addedCount = 0;
      
      for (const [key, file] of Object.entries(gstFiles)) {
        if (file !== null) {
          formData.append('files', file);
          addedCount++;
        }
      }
      
      if (addedCount === 0) {
        throw new Error("No Excel files to process");
      }
      
      formData.append('document_type', 'gst_return');
      
      console.log(`Processing ${addedCount} GST Excel files...`);
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const requestTimeout = setTimeout(() => controller.abort(), 540000); // 9 minutes for request
      
      let response;
      try {
        response = await fetch(`${API_URL}/process-gst`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        clearTimeout(requestTimeout);
      } catch (fetchError) {
        clearTimeout(requestTimeout);
        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        setStepInterval(null);
        
        if (fetchError.name === 'AbortError') {
          setError("Request timeout: The server took too long to respond. Please check if the backend is running at " + API_URL);
        } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
          setError(`Connection failed: Cannot reach the backend server at ${API_URL}. Please ensure:\n1. The FastAPI server is running\n2. The server is accessible at ${API_URL}\n3. CORS is properly configured`);
        } else {
          setError(`Network error: ${fetchError.message}`);
        }
        setProcessing(false);
        return;
      }

      if (!response.ok) {
        let errorMessage = 'Processing failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.error || errorMessage;
        } catch (e) {
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (e2) {
            errorMessage = `Server returned status ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      console.log("ProcessingPage - GST reports response:", JSON.stringify(data, null, 2));
      
      // For GST reports, use the data directly
      const gstReportData = data;
      
      setResult(gstReportData);
      
      // Clear timeouts and intervals
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      setStepInterval(null);
      
      // Complete all steps
      setCurrentStep(steps.length);
      
      // Navigate to results with GST report data
      setTimeout(() => {
        navigate("/dashboard/results", { 
          state: { 
            fileName: `GST Reports - ${new Date().toLocaleDateString()}`, 
            result: gstReportData, 
            documentType: 'gst_return'
          } 
        });
      }, 1500);
      
    } catch (err) {
      console.error("GST processing error:", err);
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      setStepInterval(null);
      
      let errorMessage = err.message || "Failed to process GST Excel files";
      
      if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        errorMessage = "Processing timeout: The request took too long. This might be due to:\n1. Large file sizes\n2. Multiple files being processed\n3. Backend server not responding\n\nPlease try again or check if the backend server is running.";
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = `Cannot connect to backend server. Please ensure:\n1. The FastAPI server is running\n2. Server URL is correct: ${import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000'}\n3. Check browser console for CORS errors`;
      }
      
      setError(errorMessage);
      setProcessing(false);
    }
  };

  const simulateSteps = () => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            navigate("/dashboard/results", { 
              state: { fileName } 
            });
          }, 1500);
          return prev;
        }
      });
    }, 2000);
    
    setStepInterval(interval);
    return () => clearInterval(interval);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#F8FAFC] via-blue-50/20 to-purple-50/20 px-4 py-12">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        {/* ---------- LOADER SECTION ---------- */}
        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center mb-8">
            {/* Animated Background Rings */}
            <div className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-[#1E40AF]/10 to-[#7C3AED]/10 animate-pulse"></div>
            <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-[#1E40AF]/20 to-[#7C3AED]/20 animate-ping"></div>
            
            {/* Modern Animated Loader */}
            <div className="relative z-10 w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-[#E5E7EB]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#1E40AF] border-r-[#7C3AED] animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-[#22D3EE] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#1E40AF] to-[#7C3AED] animate-pulse"></div>
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-3 tracking-[-0.01em] leading-[1.15]">
            {checkingBackend ? "Checking Backend Connection…" : "Processing Your Document…"}
          </h1>
          <p className="text-base md:text-lg text-[#64748B] max-w-lg leading-[1.6]">
            {checkingBackend 
              ? "Verifying backend server is available before processing…"
              : "Extracting data, detecting tables, cleaning entries, generating output…"
            }
          </p>
        </div>

        {/* ---------- PROGRESS STEPS ---------- */}
        <div className="bg-white rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E7EB] p-8 lg:p-10">
          <h3 className="text-xl font-semibold text-[#0F172A] mb-8 text-center tracking-[-0.01em]">
            Processing Steps
          </h3>

          <div className="relative">
            {/* Animated Progress Line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[#E5E7EB] overflow-hidden">
              <div 
                className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#1E40AF] to-[#7C3AED] transition-all duration-500 ease-out"
                style={{ 
                  height: `${(currentStep / steps.length) * 100}%`,
                }}
              ></div>
            </div>

            {/* Steps List */}
            <ul className="space-y-6 relative">
              {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isPending = index > currentStep;

                return (
                  <li key={index} className="flex items-start relative group">
                    <div className="flex flex-col items-center mr-5 mt-0.5 z-10">
                      {/* Step Circle */}
                      <div
                        className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-300 ease-out ${
                          isCompleted
                            ? "bg-gradient-to-br from-green-500 to-emerald-600 border-green-500 text-white shadow-[0_4px_12px_rgba(34,197,94,0.3)] scale-110"
                            : isCurrent
                            ? "border-[#1E40AF] bg-white text-[#1E40AF] shadow-[0_4px_12px_rgba(30,64,175,0.25)] scale-110 ring-4 ring-[#1E40AF]/20"
                            : "border-[#E5E7EB] bg-white text-[#94A3B8]"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : isCurrent ? (
                          <div className="w-5 h-5 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="text-sm font-semibold">
                            {index + 1}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 pt-1.5">
                      <p
                        className={`text-base font-semibold transition-all duration-300 ${
                          isCompleted
                            ? "text-green-600"
                            : isCurrent
                            ? "text-[#1E40AF]"
                            : "text-[#64748B]"
                        }`}
                      >
                        {step}
                      </p>
                      {isCurrent && (
                        <p className="text-sm text-[#64748B] mt-1.5 flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1E40AF] animate-pulse"></span>
                          Working on this step…
                        </p>
                      )}
                      {isCompleted && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          Completed
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Status Message */}
          {currentStep >= steps.length && !error && (
            <div className="mt-10 pt-8 border-t border-[#E5E7EB] text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-50 to-emerald-50 mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-green-600 mb-1">
                Processing Completed Successfully!
              </p>
              <p className="text-sm text-[#64748B]">
                Redirecting to results...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-10 pt-8 border-t border-[#E5E7EB]">
              <div className="bg-red-50/50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <p className="font-semibold text-red-600 mb-4 text-center text-lg">Processing Failed</p>
                <div className="bg-white p-4 rounded-lg border border-red-100 mb-5">
                  <p className="text-sm text-red-700 whitespace-pre-line text-left leading-relaxed">{error}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate("/dashboard/upload")}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 font-semibold shadow-[0_2px_8px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_12px_rgba(239,68,68,0.35)] transform hover:scale-[1.02]"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      setError(null);
                      setProcessing(false);
                      setCurrentStep(0);
                      if (file) {
                        processFile();
                      }
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#1E40AF] to-[#7C3AED] text-white rounded-xl hover:from-[#1E3A8A] hover:to-[#7C3AED] transition-all duration-200 font-semibold shadow-[0_2px_8px_rgba(30,64,175,0.25)] hover:shadow-[0_4px_12px_rgba(30,64,175,0.35)] transform hover:scale-[1.02]"
                  >
                    Retry Processing
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessingPage;

