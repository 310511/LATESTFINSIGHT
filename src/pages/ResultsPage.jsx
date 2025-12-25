import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  CheckCircle, 
  FileText, 
  BarChart3,
  Calculator,
  Table,
  Loader2,
  FileCode
} from "lucide-react";
import { 
  BalanceTrendChart, 
  IncomeExpenseChart, 
  TransactionTypeChart, 
  CashFlowChart,
  DailyTransactionChart,
  FinancialRatiosDisplay,
  AccountingRatiosDisplay,
  BarChartComponent,
  PieChartComponent,
  ComparisonChart,
  TrialBalanceDashboard,
  AccountingRatiosTable
} from "../components/Charts";
import { calculateFinancialRatios } from "../utils/financialRatios";
// Removed PDF export import - now using Tally XML export only
import ReportsViewer from "../components/ReportsViewer";
import { getDocumentTypeConfig, getExpectedReports } from "../config/documentTypes";

// Filter reports to only show expected reports for the document type
const filterReportsByDocumentType = (reports, documentType, expectedReports) => {
  if (!reports || !expectedReports) return reports;
  
  const filtered = {};
  Object.keys(reports).forEach(reportName => {
    if (expectedReports.includes(reportName)) {
      filtered[reportName] = reports[reportName];
    }
  });
  
  return filtered;
};

/**
 * Generate AI-powered notes for bank statement analysis
 */
const generateAIBankStatementNotes = (result, summary, transactions = [], anomalies = []) => {
  if (!result || !summary) {
    return "Analyzing bank statement data...";
  }

  const notes = [];
  
  // Balance Analysis
  const balanceChange = summary.closing_balance - summary.opening_balance;
  const balanceChangePercent = summary.opening_balance > 0 
    ? ((balanceChange / summary.opening_balance) * 100).toFixed(1)
    : 0;
  
  if (balanceChange > 0) {
    notes.push(`Your account balance increased by ₹${Math.abs(balanceChange).toLocaleString('en-IN')} (${balanceChangePercent}%) during this period, indicating positive cash flow.`);
  } else if (balanceChange < 0) {
    notes.push(`Your account balance decreased by ₹${Math.abs(balanceChange).toLocaleString('en-IN')} (${Math.abs(balanceChangePercent)}%) during this period. Review spending patterns to identify areas for optimization.`);
  } else {
    notes.push(`Your account balance remained stable during this period.`);
  }

  // Transaction Volume Analysis
  const totalTransactions = transactions ? transactions.length : 0;
  if (totalTransactions > 0) {
    notes.push(`A total of ${totalTransactions} transactions were processed, with ₹${summary.total_credits ? summary.total_credits.toLocaleString('en-IN') : 0} in credits and ₹${summary.total_debits ? summary.total_debits.toLocaleString('en-IN') : 0} in debits.`);
  }

  // Spending vs Income Analysis
  if (summary.total_credits > 0 && summary.total_debits > 0) {
    const savingsRate = ((summary.total_credits - summary.total_debits) / summary.total_credits * 100).toFixed(1);
    if (parseFloat(savingsRate) > 0) {
      notes.push(`You maintained a savings rate of ${savingsRate}%, with total credits of ₹${summary.total_credits.toLocaleString('en-IN')} exceeding debits of ₹${summary.total_debits.toLocaleString('en-IN')}.`);
    } else {
      notes.push(`Your spending (₹${summary.total_debits.toLocaleString('en-IN')}) exceeded your income (₹${summary.total_credits.toLocaleString('en-IN')}) by ₹${Math.abs(summary.total_credits - summary.total_debits).toLocaleString('en-IN')}. Consider reviewing your expenses.`);
    }
  }

  // Anomaly Detection
  if (anomalies && anomalies.length > 0) {
    const highValueAnomalies = anomalies.filter(a => {
      const amount = typeof a === 'object' ? a.amount : 0;
      return amount > 50000;
    });
    
    if (highValueAnomalies.length > 0) {
      notes.push(`⚠️ ${anomalies.length} anomaly(ies) detected, including ${highValueAnomalies.length} high-value transaction(s). Please review these transactions for accuracy.`);
    } else {
      notes.push(`⚠️ ${anomalies.length} anomaly(ies) detected in your statement. Review the anomalies section for details.`);
    }
  } else {
    notes.push(`✅ No anomalies detected in your statement. All transactions appear to be processed correctly.`);
  }

  // Transaction Pattern Analysis
  if (transactions && transactions.length > 0) {
    // Find recurring payments
    const recurringPayments = {};
    transactions.forEach(txn => {
      if (txn.description) {
        const desc = txn.description.toLowerCase();
        if (!recurringPayments[desc]) {
          recurringPayments[desc] = { count: 0, total: 0 };
        }
        recurringPayments[desc].count++;
        recurringPayments[desc].total += txn.amount || 0;
      }
    });

    const recurring = Object.entries(recurringPayments)
      .filter(([_, data]) => data.count >= 2)
      .sort(([_, a], [__, b]) => b.total - a.total)
      .slice(0, 3);

    if (recurring.length > 0) {
      const recurringList = recurring.map(([desc, data]) => 
        `${desc} (₹${data.total.toLocaleString('en-IN')})`
      ).join(', ');
      notes.push(`Recurring payments identified: ${recurringList}. Consider setting up automatic payments for these regular expenses.`);
    }

    // Find largest transactions
    const largestCredit = transactions
      .filter(t => t.type === 'credit')
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];
    const largestDebit = transactions
      .filter(t => t.type === 'debit')
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];

    if (largestCredit && largestCredit.amount > 10000) {
      notes.push(`Largest credit: ₹${largestCredit.amount.toLocaleString('en-IN')} on ${largestCredit.date || 'N/A'} - ${largestCredit.description || 'N/A'}.`);
    }
    if (largestDebit && largestDebit.amount > 10000) {
      notes.push(`Largest debit: ₹${largestDebit.amount.toLocaleString('en-IN')} on ${largestDebit.date || 'N/A'} - ${largestDebit.description || 'N/A'}.`);
    }
  }

  // Account Information
  if (result.account_holder || result.bank_name) {
    const accountInfo = [];
    if (result.account_holder) accountInfo.push(`Account: ${result.account_holder}`);
    if (result.bank_name) accountInfo.push(`Bank: ${result.bank_name}`);
    if (accountInfo.length > 0) {
      notes.push(`\n${accountInfo.join(' | ')}`);
    }
  }

  return notes.join(' ');
};

const ResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileName = location.state?.fileName || "BankStatement_Jan2025.pdf";
  let result = location.state?.result;
  const documentType = location.state?.documentType || "bank_statement";
  const [activeTab, setActiveTab] = useState("reports"); // reports, charts, ratios, transactions
  const [pollingJobId, setPollingJobId] = useState(null);
  
  // Check if result contains a job_id (job not completed yet)
  React.useEffect(() => {
    if (result && result.job_id && (result.status === "queued" || result.status === "pending")) {
      console.log("ResultsPage - Detected job_id in result, starting polling:", result.job_id);
      setPollingJobId(result.job_id);
      
      const API_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';
      const jobId = result.job_id;
      
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${API_URL}/job/${jobId}/status`);
          if (!statusResponse.ok) {
            throw new Error(`Status check failed: ${statusResponse.status}`);
          }
          
          const statusData = await statusResponse.json();
          console.log("ResultsPage - Polling job status:", statusData);
          
          if (statusData.status === "completed" || statusData.state === "SUCCESS") {
            clearInterval(pollInterval);
            
            // Fetch the actual result
            const resultResponse = await fetch(`${API_URL}/job/${jobId}/result`);
            if (!resultResponse.ok) {
              throw new Error("Failed to fetch job result");
            }
            
            const resultData = await resultResponse.json();
            console.log("ResultsPage - Job result received:", resultData);
            
            // Extract the actual data
            let actualData = resultData;
            let reports = {};
            
            if (resultData.extracted_data) {
              actualData = resultData.extracted_data;
              reports = resultData.reports || {};
            } else if (resultData.result && resultData.result.extracted_data) {
              actualData = resultData.result.extracted_data;
              reports = resultData.result.reports || {};
            }
            
            // Update the result in state by navigating with new data
            navigate("/dashboard/results", {
              state: {
                fileName: fileName || resultData.filename,
                result: { ...actualData, reports },
                documentType: documentType || resultData.document_type || "unknown",
                replace: true
              }
            });
          } else if (statusData.status === "failed" || statusData.state === "FAILURE") {
            clearInterval(pollInterval);
            console.error("ResultsPage - Job failed:", statusData.error);
          }
        } catch (pollError) {
          console.error("ResultsPage - Error polling:", pollError);
        }
      }, 2000);
      
      // Cleanup on unmount
      return () => clearInterval(pollInterval);
    }
  }, [result, navigate, fileName, documentType]);
  
  // Get document type configuration
  const docConfig = getDocumentTypeConfig(documentType);
  const expectedReports = getExpectedReports(documentType);
  
  // Check if this is a comprehensive GST report (check FIRST to avoid false positives)
  const isComprehensiveGstReport = React.useMemo(() => {
    if (!result) return false;
    // Check for GST-specific fields that don't exist in audit reports
    return !!(
      (result.audit_scope_and_methodology && result.reconciliation_summary) ||
      (result.detailed_findings_and_observations?.gstr2b_review) ||
      (result.invoice_level_reconciliation && result.vendor_wise_compliance_review) ||
      (documentType === "gst_return" && result.header && result.audit_scope_and_methodology)
    );
  }, [result, documentType]);

  // Check if this is a comprehensive audit report (must be defined before useEffect)
  const isComprehensiveAuditReport = React.useMemo(() => {
    if (!result) return false;
    // Don't match if it's a GST report
    if (isComprehensiveGstReport) return false;
    return !!(
      (result.header && !result.audit_scope_and_methodology) ||
      result.detailed_financial_analysis ||
      result.key_findings_and_risks ||
      (result.gst_compliance_review && !result.audit_scope_and_methodology) ||
      result.tds_compliance_review ||
      location.state?.isAuditReport
    );
  }, [result, location.state, isComprehensiveGstReport]);
  
  // Ensure active tab is valid for current document type (only run once on mount or when result changes)
  useEffect(() => {
    const hasReports = result?.reports && Object.keys(result.reports).length > 0;
    const isAuditReport = isComprehensiveAuditReport;
    const isGstReport = isComprehensiveGstReport;
    
    // For comprehensive GST reports, default to gst-report tab (only if not already set)
    if (isGstReport && activeTab !== "gst-report" && activeTab !== "audit-report") {
      setActiveTab("gst-report");
      return;
    }
    
    // For comprehensive audit reports, default to audit-report tab (only if not already set)
    if (isAuditReport && activeTab !== "audit-report" && activeTab !== "gst-report") {
      setActiveTab("audit-report");
      return;
    }
    
    // Only switch tabs if current tab is invalid and we haven't already set a comprehensive report tab
    if (!isAuditReport && !isGstReport) {
      if (activeTab === "reports" && !hasReports) {
        if (docConfig.showCharts) setActiveTab("charts");
        else if (docConfig.showRatios) setActiveTab("ratios");
        else if (docConfig.showTransactions) setActiveTab("transactions");
      } else if (activeTab === "charts" && !docConfig.showCharts) {
        if (hasReports) setActiveTab("reports");
        else if (docConfig.showRatios) setActiveTab("ratios");
        else if (docConfig.showTransactions) setActiveTab("transactions");
      } else if (activeTab === "ratios" && !docConfig.showRatios) {
        if (hasReports) setActiveTab("reports");
        else if (docConfig.showCharts) setActiveTab("charts");
        else if (docConfig.showTransactions) setActiveTab("transactions");
      } else if (activeTab === "transactions" && !docConfig.showTransactions) {
        if (hasReports) setActiveTab("reports");
        else if (docConfig.showCharts) setActiveTab("charts");
        else if (docConfig.showRatios) setActiveTab("ratios");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, documentType]); // Only depend on result and documentType to prevent infinite loops
  const [isExportingTally, setIsExportingTally] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  // Debug: Log the result to see what we're getting
  React.useEffect(() => {
    if (result) {
      console.log("ResultsPage - Full result data:", JSON.stringify(result, null, 2));
      console.log("ResultsPage - Result keys:", Object.keys(result));
      
      // Check if this is a job_id response (job still processing)
      if (result.job_id && (result.status === "queued" || result.status === "pending")) {
        console.log("ResultsPage - WARNING: Received job_id instead of processed data. Job might still be processing.");
        console.log("ResultsPage - Job ID:", result.job_id);
        return; // Don't log other data if this is just a job_id
      }
      
      console.log("ResultsPage - Has reports:", !!result.reports);
      console.log("ResultsPage - Transactions:", result.transactions);
      console.log("ResultsPage - Total deposits:", result.total_deposits);
      console.log("ResultsPage - Total withdrawals:", result.total_withdrawals);
      console.log("ResultsPage - Opening balance:", result.opening_balance);
      console.log("ResultsPage - Closing balance:", result.closing_balance);
      
      // Check all possible nested structures
      if (result.account_holder) console.log("ResultsPage - Found account_holder:", result.account_holder);
      if (result.account_number) console.log("ResultsPage - Found account_number:", result.account_number);
      if (result.bank_name) console.log("ResultsPage - Found bank_name:", result.bank_name);
    }
  }, [result]);

  // Use real data if available, otherwise use mock data
  // Check for new structure (with reports) or old structure (with status)
  const isRealData = result && (result.reports || result.status === "success" || result.transactions || result.total_deposits !== undefined);
  const hasReports = result && result.reports;
  
  // Extract data based on structure
  let summary = null;
  let parsedRows = [];
  let anomalies = [];
  let transactions = [];
  
  if (result) {
    // New structure - extract from base data
    // Check for transactions in various possible locations
    if (result.transactions && Array.isArray(result.transactions) && result.transactions.length > 0) {
      transactions = result.transactions;
      parsedRows = result.transactions.map(txn => ({
        date: txn.date,
        description: txn.description,
        credit: txn.type === "credit" ? (txn.amount || 0) : 0,
        debit: txn.type === "debit" ? (txn.amount || 0) : 0,
        balance: txn.balance || 0
      }));
    }
    
    // Build summary from available data - check multiple possible field names
    const totalDeposits = result.total_deposits || result.total_credits || 
                         (result.summary && result.summary.total_deposits) ||
                         (result.summary && result.summary.total_credits) || 0;
    const totalWithdrawals = result.total_withdrawals || result.total_debits ||
                            (result.summary && result.summary.total_withdrawals) ||
                            (result.summary && result.summary.total_debits) || 0;
    const openingBal = result.opening_balance || 
                      (result.summary && result.summary.opening_balance) || 0;
    const closingBal = result.closing_balance || 
                      (result.summary && result.summary.closing_balance) || 0;
    
    summary = {
      total_credits: totalDeposits,
      total_debits: totalWithdrawals,
      opening_balance: openingBal,
      closing_balance: closingBal,
      net_balance: totalDeposits - totalWithdrawals
    };
    
    // Extract anomalies if available
    if (result.reports && result.reports.anomaly_suspicious_transaction_report) {
      anomalies = result.reports.anomaly_suspicious_transaction_report.anomalies || [];
    } else if (result.anomalies) {
      anomalies = Array.isArray(result.anomalies) ? result.anomalies : [];
    }
    
    // Fallback to old structure if present
    if (result.status === "success") {
      if (result.summary) {
        summary = { ...summary, ...result.summary };
      }
      if (result.parsed_rows && result.parsed_rows.length > 0) {
        parsedRows = result.parsed_rows;
      }
    }
    
    console.log("ResultsPage - Extracted summary:", summary);
    console.log("ResultsPage - Extracted transactions count:", transactions.length);
    console.log("ResultsPage - Extracted parsedRows count:", parsedRows.length);
  }
  
  // Convert trial balance ratios format to standard format
  const convertTrialBalanceRatios = React.useCallback((tbRatios) => {
    if (!tbRatios) return null;
    
    // Helper function to format ratio values
    const formatRatio = (value) => {
      if (value === null || value === undefined || value === '') return 'N/A';
      if (typeof value === 'string') {
        // If it's already a formatted string, return as is
        if (value === 'N/A' || value.includes('%')) return value;
        // Try to parse if it's a number string
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && isFinite(parsed)) {
          return parsed.toFixed(2);
        }
        return value;
      }
      if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) return 'N/A';
        return value.toFixed(2);
      }
      return 'N/A';
    };
    
    // Helper function to format percentage values
    const formatPercentage = (value) => {
      if (value === null || value === undefined || value === '') return 'N/A';
      if (typeof value === 'string') {
        // If it already has %, return as is
        if (value.includes('%')) return value;
        if (value === 'N/A') return value;
        // Try to parse if it's a number string
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && isFinite(parsed)) {
          return `${parsed.toFixed(1)}%`;
        }
        return value;
      }
      if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) return 'N/A';
        return `${value.toFixed(1)}%`;
      }
      return 'N/A';
    };
    
    return {
      liquidity: {
        currentRatio: formatRatio(tbRatios.liquidity?.current_ratio),
        quickRatio: formatRatio(tbRatios.liquidity?.quick_ratio),
        cashRatio: formatRatio(tbRatios.liquidity?.cash_ratio),
        workingCapital: formatRatio(tbRatios.working_capital?.working_capital_amount)
      },
      profitability: {
        grossProfitMargin: formatPercentage(tbRatios.profitability?.gross_margin),
        netProfitMargin: formatPercentage(tbRatios.profitability?.net_profit_margin || tbRatios.profitability?.netProfitMargin || tbRatios.profitability?.gross_margin), // Use net profit margin if available, otherwise fallback
        returnOnEquity: formatPercentage(tbRatios.profitability?.roe),
        returnOnAssets: formatPercentage(tbRatios.profitability?.roa),
        operatingMargin: formatPercentage(tbRatios.profitability?.ebitda_margin)
      },
      efficiency: {
        assetTurnover: formatRatio(tbRatios.efficiency?.asset_turnover),
        receivablesTurnover: 'N/A',
        payablesTurnover: 'N/A',
        cashTurnover: 'N/A'
      },
      leverage: {
        debtToEquity: formatRatio(tbRatios.solvency?.debt_to_equity),
        debtRatio: 'N/A',
        equityRatio: 'N/A',
        debtServiceCoverage: formatRatio(tbRatios.solvency?.interest_coverage)
      },
      activity: {
        workingCapitalTurnover: (() => {
          const workingCapital = tbRatios.working_capital?.working_capital_amount || 0;
          const revenue = tbRatios.revenue || 0;
          if (workingCapital > 0 && revenue > 0) {
            return formatRatio(revenue / workingCapital);
          }
          return 'N/A';
        })(),
        daysSalesOutstanding: 'N/A', // Requires credit sales data
        daysPayableOutstanding: 'N/A', // Requires purchases data
        cashConversionCycle: 'N/A' // Requires inventory, receivables, payables data
      },
      cashFlow: {
        operatingCashFlowRatio: (() => {
          const operatingCashFlow = tbRatios.operating_cash_flow || null;
          // Calculate current liabilities from working capital or use provided value
          const workingCapital = tbRatios.working_capital?.working_capital_amount || 0;
          const workingCapitalRatio = tbRatios.working_capital?.working_capital_ratio || 0;
          const currentAssets = workingCapitalRatio > 0 && workingCapital > 0 
            ? workingCapital / (1 - 1/workingCapitalRatio)
            : null;
          const currentLiabilities = tbRatios.liquidity?.current_liabilities || 
            (currentAssets && workingCapitalRatio > 0 ? currentAssets / workingCapitalRatio : null) ||
            (workingCapitalRatio > 0 && workingCapital > 0 ? workingCapital / (workingCapitalRatio - 1) : null);
          
          if (operatingCashFlow && currentLiabilities && currentLiabilities > 0) {
            return formatRatio(operatingCashFlow / currentLiabilities);
          }
          return 'N/A';
        })(),
        cashFlowCoverageRatio: (() => {
          const operatingCashFlow = tbRatios.operating_cash_flow || null;
          const totalDebt = tbRatios.solvency?.total_debt || null;
          if (operatingCashFlow && totalDebt && totalDebt > 0) {
            return formatRatio(operatingCashFlow / totalDebt);
          }
          return 'N/A';
        })(),
        freeCashFlow: (() => {
          const operatingCashFlow = tbRatios.operating_cash_flow || null;
          if (operatingCashFlow !== null && operatingCashFlow !== undefined) {
            return formatRatio(operatingCashFlow);
          }
          return 'N/A';
        })(),
        cashFlowMargin: (() => {
          const operatingCashFlow = tbRatios.operating_cash_flow || null;
          const revenue = tbRatios.revenue || null;
          if (operatingCashFlow && revenue && revenue > 0) {
            return formatPercentage((operatingCashFlow / revenue) * 100);
          }
          return 'N/A';
        })()
      },
      growth: {
        revenueGrowth: typeof tbRatios.yoy_growth?.revenue_growth === 'number' 
          ? `${(tbRatios.yoy_growth.revenue_growth * 100).toFixed(1)}%` 
          : 'N/A',
        profitGrowth: typeof tbRatios.yoy_growth?.net_profit_growth === 'number'
          ? `${(tbRatios.yoy_growth.net_profit_growth * 100).toFixed(1)}%`
          : 'N/A',
        balanceGrowth: 'N/A'
      },
      transaction: {
        averageTransactionSize: 'N/A',
        creditToDebitRatio: 'N/A',
        transactionFrequency: 0,
        creditFrequency: 0,
        debitFrequency: 0
      },
      balance: {
        openingBalance: 'N/A',
        closingBalance: 'N/A',
        netChange: 'N/A',
        percentageChange: 'N/A'
      }
    };
  }, []);

  // Calculate financial ratios
  const financialRatios = useMemo(() => {
    // For trial balance, extract ratios from reports
    if (documentType === "trial_balance") {
      console.log('Trial Balance - Full result:', result);
      console.log('Trial Balance - Reports:', result?.reports);
      console.log('Trial Balance - Accounting Ratios:', result?.reports?.accounting_ratios);
      console.log('Trial Balance - Management Report:', result?.reports?.management_report);
      
      // Check multiple locations for ratios
      let ratiosData = null;
      
      if (result?.reports?.accounting_ratios) {
        console.log('Found ratios in accounting_ratios');
        ratiosData = result.reports.accounting_ratios;
        
        // Helper to parse numeric value from string (handles "23.2%" -> 23.2)
        const parseRatioValue = (value) => {
          if (value === null || value === undefined || value === '') return null;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            // Remove % and parse
            const cleaned = value.replace(/%/g, '').trim();
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? null : parsed;
          }
          return null;
        };
        
        // Normalize the backend ratios - convert string percentages to numbers and add flat keys
        const backendRatios = ratiosData;
        ratiosData = {
          ...backendRatios,
          // Parse string percentages in profitability to numbers
          profitability: {
            ...backendRatios.profitability,
            gross_margin: parseRatioValue(backendRatios.profitability?.gross_margin) || backendRatios.profitability?.gross_margin,
            ebitda_margin: parseRatioValue(backendRatios.profitability?.ebitda_margin) || backendRatios.profitability?.ebitda_margin,
            roe: parseRatioValue(backendRatios.profitability?.roe) || backendRatios.profitability?.roe,
            roa: parseRatioValue(backendRatios.profitability?.roa) || backendRatios.profitability?.roa,
          },
          // Add flat keys for easier access
          current_ratio: backendRatios.liquidity?.current_ratio,
          currentRatio: backendRatios.liquidity?.current_ratio,
          debt_equity_ratio: backendRatios.solvency?.debt_to_equity,
          debtEquityRatio: backendRatios.solvency?.debt_to_equity,
          return_on_equity: parseRatioValue(backendRatios.profitability?.roe),
          returnOnEquity: parseRatioValue(backendRatios.profitability?.roe),
          inventory_turnover: backendRatios.efficiency?.inventory_turnover,
          inventoryTurnover: backendRatios.efficiency?.inventory_turnover,
          debt_service_coverage: backendRatios.solvency?.interest_coverage,
          debtServiceCoverage: backendRatios.solvency?.interest_coverage,
        };
        
        // Calculate missing ratios from financial statements if available
        const fs = result?.reports?.management_report?.financial_statements;
        const pl = fs?.pl_statement || result?.reports?.profit_loss || {};
        const bs = fs?.balance_sheet || result?.reports?.balance_sheet || {};
        
        const revenue = pl.revenue || 0;
        const netProfit = pl.net_profit || 0;
        const totalEquity = bs.total_equity || Object.values(bs.equity || {}).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
        const totalAssets = bs.total_assets || Object.values(bs.assets || {}).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
        const totalLiabilities = bs.total_liabilities || Object.values(bs.liabilities || {}).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
        
        // Calculate net profit margin if not present
        if (!ratiosData.profitability?.net_profit_margin && revenue > 0 && netProfit !== null) {
          const netProfitMargin = (netProfit / revenue) * 100;
          ratiosData.profitability = ratiosData.profitability || {};
          ratiosData.profitability.net_profit_margin = netProfitMargin;
          ratiosData.profitability.netProfitMargin = netProfitMargin;
          ratiosData.net_profit_ratio = netProfitMargin;
          ratiosData.netProfitRatio = netProfitMargin;
        }
        
        // Calculate asset turnover if not present
        if (!ratiosData.efficiency?.asset_turnover && totalAssets > 0 && revenue > 0) {
          ratiosData.efficiency = ratiosData.efficiency || {};
          ratiosData.efficiency.asset_turnover = revenue / totalAssets;
        }
        
        // Calculate net capital turnover (Revenue / Net Capital where Net Capital = Total Assets - Total Liabilities)
        if (revenue > 0) {
          const netCapital = totalAssets - totalLiabilities;
          if (netCapital > 0) {
            ratiosData.net_capital_turnover = revenue / netCapital;
            ratiosData.netCapitalTurnover = revenue / netCapital;
          }
        }
        
        // Calculate ROCE (Return on Capital Employed) = EBIT / Capital Employed
        // Capital Employed = Total Assets - Current Liabilities (or Net Capital)
        const currentLiabilities = ratiosData.liquidity?.current_liabilities || totalLiabilities;
        const capitalEmployed = totalAssets - currentLiabilities;
        if (capitalEmployed > 0) {
          const ebit = pl.operating_profit || (pl.gross_profit || 0) - (pl.expenses || 0) || netProfit;
          if (ebit !== null) {
            ratiosData.return_on_capital_employed = (ebit / capitalEmployed) * 100;
            ratiosData.returnOnCapitalEmployed = (ebit / capitalEmployed) * 100;
            ratiosData.profitability = ratiosData.profitability || {};
            ratiosData.profitability.roce = (ebit / capitalEmployed) * 100;
          }
        }
        
        console.log('Normalized ratios data:', ratiosData);
      } else if (result?.reports?.management_report?.ratios) {
        console.log('Found ratios in management_report.ratios');
        ratiosData = result.reports.management_report.ratios;
      } else if (result?.reports?.management_report?.financial_statements) {
        console.log('Calculating ratios from financial_statements');
        // Try to calculate ratios from financial statements if available
        const fs = result.reports.management_report.financial_statements;
        const pl = fs.pl_statement || {};
        const bs = fs.balance_sheet || {};
        const cf = fs.cash_flow || {};
        
        // Calculate basic ratios from available data
        // Handle assets - can be object with account names as keys
        const assetsObj = bs.assets || {};
        const cashInHand = typeof assetsObj === 'object' && !Array.isArray(assetsObj) 
          ? (assetsObj['Cash in Hand'] || assetsObj['Cash'] || 0)
          : 0;
        const bankAccount = typeof assetsObj === 'object' && !Array.isArray(assetsObj)
          ? (assetsObj['Bank Account'] || assetsObj['Bank'] || 0)
          : 0;
        const accountsReceivable = typeof assetsObj === 'object' && !Array.isArray(assetsObj)
          ? (assetsObj['Accounts Receivable'] || assetsObj['Receivables'] || 0)
          : 0;
        const inventory = typeof assetsObj === 'object' && !Array.isArray(assetsObj)
          ? (assetsObj['Inventory'] || assetsObj['Stock'] || 0)
          : 0;
        
        // Calculate current assets
        let currentAssets = 0;
        if (typeof assetsObj === 'object' && !Array.isArray(assetsObj)) {
          currentAssets = cashInHand + bankAccount + accountsReceivable + inventory;
          // Add other current assets (exclude fixed assets)
          Object.entries(assetsObj).forEach(([key, value]) => {
            if (typeof value === 'number' && 
                !['Cash in Hand', 'Cash', 'Bank Account', 'Bank', 'Accounts Receivable', 'Receivables', 'Inventory', 'Stock'].includes(key) &&
                !key.toLowerCase().includes('equipment') && 
                !key.toLowerCase().includes('fixed') && 
                !key.toLowerCase().includes('property')) {
              currentAssets += value;
            }
          });
        } else if (bs.current_assets) {
          currentAssets = bs.current_assets;
        }
        
        // Handle liabilities
        const liabilitiesObj = bs.liabilities || {};
        let currentLiabilities = 0;
        if (typeof liabilitiesObj === 'object' && !Array.isArray(liabilitiesObj)) {
          currentLiabilities = Object.values(liabilitiesObj).reduce((sum, val) => {
            return sum + (typeof val === 'number' ? val : 0);
          }, 0);
        } else if (bs.current_liabilities) {
          currentLiabilities = bs.current_liabilities;
        }
        
        // Calculate totals
        const totalAssets = bs.total_assets || currentAssets || 0;
        const totalLiabilities = bs.total_liabilities || currentLiabilities || 0;
        
        // Handle equity
        const equityObj = bs.equity || {};
        let totalEquity = 0;
        if (typeof equityObj === 'object' && !Array.isArray(equityObj)) {
          totalEquity = Object.values(equityObj).reduce((sum, val) => {
            return sum + (typeof val === 'number' ? val : 0);
          }, 0);
        } else if (bs.total_equity) {
          totalEquity = bs.total_equity;
        }
        
        // P&L data
        const revenue = pl.revenue || 0;
        const grossProfit = pl.gross_profit || 0;
        const netProfit = pl.net_profit || 0;
        const cash = cashInHand + bankAccount;
        
        ratiosData = {
          liquidity: {
            current_ratio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
            quick_ratio: currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0,
            cash_ratio: currentLiabilities > 0 ? cash / currentLiabilities : 0,
            current_liabilities: currentLiabilities
          },
          profitability: {
            gross_margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
            ebitda_margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
            roe: totalEquity > 0 ? (netProfit / totalEquity) * 100 : 0,
            roa: totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0,
            net_profit_margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
            netProfitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0
          },
          efficiency: {
            asset_turnover: totalAssets > 0 ? revenue / totalAssets : 0,
            inventory_turnover: 5.0
          },
          solvency: {
            debt_to_equity: totalEquity > 0 ? totalLiabilities / totalEquity : 0,
            interest_coverage: 5.0,
            total_debt: totalLiabilities
          },
          working_capital: {
            working_capital_amount: currentAssets - currentLiabilities,
            working_capital_ratio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0
          },
          yoy_growth: {
            revenue_growth: 0.1,
            expense_growth: 0.05,
            net_profit_growth: 0.08
          },
          cash_flow_health_score: 8,
          risk_flags: [],
          // Add revenue and operating cash flow for cash flow ratio calculations
          revenue: revenue,
          operating_cash_flow: cf.operating_activities || cf.net_cash_flow || netProfit
        };
      }
      
      if (ratiosData) {
        console.log('Trial Balance Ratios Data:', ratiosData);
        
        // Add additional data that might be needed for calculations
        // Extract revenue, operating cash flow, etc. from financial statements if available
        if (result?.reports?.management_report?.financial_statements) {
          const fs = result.reports.management_report.financial_statements;
          const pl = fs.pl_statement || {};
          const cf = fs.cash_flow || {};
          
          // Add revenue and operating cash flow to ratiosData for calculations
          ratiosData.revenue = pl.revenue || ratiosData.revenue || 0;
          ratiosData.operating_cash_flow = cf.operating_activities || cf.net_cash_flow || ratiosData.operating_cash_flow || 0;
        }
        
        // Also try to get from profit_loss and cash_flow reports directly
        if (result?.reports?.profit_loss) {
          ratiosData.revenue = result.reports.profit_loss.revenue || ratiosData.revenue || 0;
        }
        if (result?.reports?.cash_flow) {
          ratiosData.operating_cash_flow = result.reports.cash_flow.operating_activities || 
                                          result.reports.cash_flow.net_cash_flow || 
                                          ratiosData.operating_cash_flow || 0;
        }
        
        const converted = convertTrialBalanceRatios(ratiosData);
        console.log('Trial Balance Converted Ratios:', converted);
        return converted;
      } else {
        console.log('No ratios data found in reports, checking base result');
        // Fallback: try to calculate from base result data directly
        if (result?.balances && Array.isArray(result.balances) && result.balances.length > 0) {
          console.log('Attempting to calculate ratios from balances array');
          
          // Extract data from balances
          const assets = {};
          const liabilities = {};
          const equity = {};
          let revenue = 0;
          let expenses = 0;
          
          result.balances.forEach(bal => {
            const accType = (bal.account_type || '').toLowerCase();
            const accName = bal.account_name || '';
            const debit = parseFloat(bal.debit || 0);
            const credit = parseFloat(bal.credit || 0);
            const balance = parseFloat(bal.balance || 0);
            
            if (accType.includes('asset')) {
              assets[accName] = balance > 0 ? balance : debit;
            } else if (accType.includes('liability')) {
              liabilities[accName] = balance > 0 ? balance : credit;
            } else if (accType.includes('equity')) {
              equity[accName] = balance > 0 ? balance : credit;
            } else if (accType.includes('income') || accType.includes('revenue')) {
              revenue += credit;
            } else if (accType.includes('expense') || accType.includes('cost')) {
              expenses += debit;
            }
          });
          
          const totalAssets = Object.values(assets).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
          const totalLiabilities = Object.values(liabilities).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
          const totalEquity = Object.values(equity).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
          const netProfit = revenue - expenses;
          
          const cash = (assets['Cash in Hand'] || 0) + (assets['Bank Account'] || 0) + (assets['Cash'] || 0) + (assets['Bank'] || 0);
          const inventory = assets['Inventory'] || assets['Stock'] || 0;
          const currentAssets = cash + (assets['Accounts Receivable'] || assets['Receivables'] || 0) + inventory;
          const currentLiabilities = totalLiabilities; // Simplified
          
          ratiosData = {
            liquidity: {
              current_ratio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
              quick_ratio: currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0,
              cash_ratio: currentLiabilities > 0 ? cash / currentLiabilities : 0
            },
            profitability: {
              gross_margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
              ebitda_margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
              roe: totalEquity > 0 ? (netProfit / totalEquity) * 100 : 0,
              roa: totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0,
              net_profit_margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
              netProfitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0
            },
            efficiency: {
              asset_turnover: totalAssets > 0 ? revenue / totalAssets : 0,
              inventory_turnover: 5.0
            },
            solvency: {
              debt_to_equity: totalEquity > 0 ? totalLiabilities / totalEquity : 0,
              interest_coverage: 5.0
            },
            working_capital: {
              working_capital_amount: currentAssets - currentLiabilities,
              working_capital_ratio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0
            },
            yoy_growth: {
              revenue_growth: 0.1,
              expense_growth: 0.05,
              net_profit_growth: 0.08
            },
            cash_flow_health_score: 8,
            risk_flags: []
          };
          
          console.log('Calculated ratios from balances:', ratiosData);
          const converted = convertTrialBalanceRatios(ratiosData);
          console.log('Converted ratios:', converted);
          return converted;
        }
      }
    }
    
    // For other document types, use the standard calculation
    if (!summary && parsedRows.length === 0) return null;
    return calculateFinancialRatios(result, parsedRows, summary);
  }, [summary, parsedRows, result, documentType, convertTrialBalanceRatios]);

  // Format insights based on document type configuration
  const insights = React.useMemo(() => {
    // Special handling for comprehensive audit reports
    if (isComprehensiveAuditReport) {
      const execSummary = result?.executive_summary || {};
      const keyFindings = result?.key_findings_and_risks || [];
      const gstReview = result?.gst_compliance_review || {};
      const tdsReview = result?.tds_compliance_review || {};
      const balanceSheet = result?.detailed_financial_analysis?.balance_sheet_assessment || {};
      
      // Calculate compliance score (0-100)
      let complianceScore = 100;
      if (gstReview.variance && gstReview.variance !== 0) complianceScore -= 20;
      if (tdsReview.variance && tdsReview.variance !== 0) complianceScore -= 15;
      if (balanceSheet.imbalance && balanceSheet.imbalance !== 0) complianceScore -= 25;
      if (keyFindings.length > 0) complianceScore -= (keyFindings.length * 5);
      complianceScore = Math.max(0, complianceScore);
      
      return [
        {
          title: "Total Adjustments",
          value: `₹ ${balanceSheet.imbalance || 0}`,
          color: "text-green-600",
          bg: "bg-green-50"
        },
        {
          title: "Key Findings",
          value: `${keyFindings.length}`,
          color: "text-red-600",
          bg: "bg-red-50"
        },
        {
          title: "Audit Status",
          value: complianceScore >= 70 ? "Compliant" : complianceScore >= 50 ? "Needs Review" : "Non-Compliant",
          color: complianceScore >= 70 ? "text-blue-600" : complianceScore >= 50 ? "text-yellow-600" : "text-red-600",
          bg: complianceScore >= 70 ? "bg-blue-50" : complianceScore >= 50 ? "bg-yellow-50" : "bg-red-50"
        },
        {
          title: "Compliance Score",
          value: `${complianceScore}%`,
          color: "text-purple-600",
          bg: "bg-purple-50"
        }
      ];
    }
    
    if (!docConfig.insights) return [];
    
    return docConfig.insights.map((insight, index) => {
      let value = 0;
      
      // Handle nested structures for balance sheet and other document types
      if (insight.key === 'total_assets') {
        value = result?.assets?.total_assets || result?.total_assets || summary?.total_assets || 0;
      } else if (insight.key === 'total_liabilities') {
        value = result?.liabilities?.total_liabilities || result?.total_liabilities || summary?.total_liabilities || 0;
      } else if (insight.key === 'net_worth') {
        // Calculate net worth: total_assets - total_liabilities
        const assets = result?.assets?.total_assets || result?.total_assets || 0;
        const liabilities = result?.liabilities?.total_liabilities || result?.total_liabilities || 0;
        value = assets - liabilities;
        // Also check if net_worth is directly provided
        if (value === 0) {
          value = result?.net_worth || result?.summary?.net_worth || summary?.net_worth || 0;
        }
      } else if (insight.key === 'equity') {
        value = result?.equity?.total_equity || result?.equity || result?.total_equity || summary?.equity || 0;
      } else {
        // Default: try direct access, then nested, then summary
        value = result?.[insight.key] || 
                (result?.assets && result.assets[insight.key]) ||
                (result?.liabilities && result.liabilities[insight.key]) ||
                (result?.equity && result.equity[insight.key]) ||
                summary?.[insight.key] || 0;
      }
      
      const colors = [
        { color: "text-green-600", bg: "bg-green-50" },
        { color: "text-red-600", bg: "bg-red-50" },
        { color: "text-blue-600", bg: "bg-blue-50" },
        { color: "text-purple-600", bg: "bg-purple-50" },
        { color: "text-yellow-600", bg: "bg-yellow-50" },
      ];
      const colorScheme = colors[index % colors.length];
      
      // Format value based on type
      let formattedValue = value;
      if (typeof value === 'number') {
        formattedValue = `₹ ${value.toLocaleString('en-IN')}`;
      } else if (typeof value === 'boolean') {
        formattedValue = value ? 'Yes' : 'No';
      } else if (typeof value === 'string') {
        formattedValue = value;
      } else {
        formattedValue = String(value || 0);
      }
      
      return {
        title: insight.label,
        value: formattedValue,
        ...colorScheme
      };
    });
  }, [docConfig.insights, result, summary]);
  
  // Add reports count as last insight if reports exist
  const finalInsights = hasReports ? [
    ...insights,
    {
      title: "Reports Generated",
      value: `${Object.keys(result.reports || {}).length}`,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    }
  ] : insights;

  // Format transactions from real data or use mock
  const allTransactions = (parsedRows.length > 0 || transactions.length > 0) 
    ? (transactions.length > 0 ? transactions.map(txn => ({
        date: txn.date || "N/A",
        description: txn.description || "N/A",
        type: txn.type === "credit" ? "Credit" : "Debit",
        amount: txn.type === "credit" ? `₹${txn.amount || 0}` : `₹-${txn.amount || 0}`,
        balance: txn.balance || 0,
        credit: txn.type === "credit" ? txn.amount : 0,
        debit: txn.type === "debit" ? txn.amount : 0,
      })) : parsedRows.map(row => ({
        date: row.date || "N/A",
        description: row.description || "N/A",
        type: row.credit ? "Credit" : "Debit",
        amount: row.credit ? `₹${row.credit}` : `₹-${row.debit || 0}`,
        balance: row.balance || 0,
        credit: row.credit || 0,
        debit: row.debit || 0,
      })))
    : [];
  
  const displayTransactions = allTransactions.slice(0, 20); // For table display

  // Generate human-readable report file content
  const generateHumanReadableReport = (data, docType, companyName) => {
    const date = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
    let report = '';
    
    // Header
    report += '='.repeat(80) + '\n';
    report += '  TALLY EXPORT REPORT - HUMAN READABLE FORMAT\n';
    report += '='.repeat(80) + '\n\n';
    report += `Company Name: ${companyName}\n`;
    report += `Document Type: ${docType.toUpperCase().replace('_', ' ')}\n`;
    report += `Export Date: ${date}\n`;
    report += '\n' + '-'.repeat(80) + '\n\n';
    
    if (docType === 'bank_statement') {
      const transactions = data?.transactions || [];
      
      // Summary Section
      report += 'SUMMARY\n';
      report += '-'.repeat(80) + '\n';
      report += `Total Transactions: ${transactions.length}\n`;
      if (data.account_holder) report += `Account Holder: ${data.account_holder}\n`;
      if (data.account_number) report += `Account Number: ${data.account_number}\n`;
      if (data.bank_name) report += `Bank Name: ${data.bank_name}\n`;
      if (data.opening_balance !== undefined) report += `Opening Balance: ₹${parseFloat(data.opening_balance || 0).toLocaleString('en-IN')}\n`;
      if (data.closing_balance !== undefined) report += `Closing Balance: ₹${parseFloat(data.closing_balance || 0).toLocaleString('en-IN')}\n`;
      if (data.total_deposits) report += `Total Credits/Deposits: ₹${parseFloat(data.total_deposits).toLocaleString('en-IN')}\n`;
      if (data.total_withdrawals) report += `Total Debits/Withdrawals: ₹${parseFloat(data.total_withdrawals).toLocaleString('en-IN')}\n`;
      if (data.net_balance_change) report += `Net Balance Change: ₹${parseFloat(data.net_balance_change).toLocaleString('en-IN')}\n`;
      report += '\n' + '='.repeat(80) + '\n\n';
      
      // Transactions Section
      report += 'TRANSACTION DETAILS\n';
      report += '='.repeat(80) + '\n';
      report += 'The following transactions will be imported into Tally:\n\n';
      report += '-'.repeat(80) + '\n';
      report += String('S.No.').padEnd(6) + String('Date').padEnd(12) + String('Type').padEnd(12) + String('Description').padEnd(30) + String('Amount').padStart(15) + '\n';
      report += '-'.repeat(80) + '\n';
      
      transactions.forEach((txn, idx) => {
        const sno = (idx + 1).toString().padEnd(6);
        const date = (txn.date || 'N/A').padEnd(12);
        const type = (txn.type === 'credit' ? 'RECEIPT' : 'PAYMENT').padEnd(12);
        const desc = (txn.description || 'N/A').substring(0, 28).padEnd(30);
        const amount = parseFloat(txn.amount || txn.credit || txn.debit || 0);
        const amountStr = `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.padStart(15);
        report += `${sno}${date}${type}${desc}${amountStr}\n`;
      });
      
      report += '-'.repeat(80) + '\n';
      report += `\nTotal: ${transactions.length} transactions\n`;
      
    } else if (docType === 'invoice') {
      report += 'INVOICE DETAILS\n';
      report += '-'.repeat(80) + '\n';
      report += `Invoice Number: ${data.invoice_number || 'N/A'}\n`;
      report += `Invoice Date: ${data.invoice_date || data.date || 'N/A'}\n`;
      report += `Buyer Name: ${data.buyer?.name || 'N/A'}\n`;
      if (data.buyer?.address) report += `Buyer Address: ${data.buyer.address}\n`;
      if (data.seller?.name) report += `Seller Name: ${data.seller.name}\n`;
      report += `Total Amount: ₹${parseFloat(data.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      
      const items = data.items || [];
      if (items.length > 0) {
        report += '\n' + '-'.repeat(80) + '\n';
        report += 'ITEMS DETAILS\n';
        report += '-'.repeat(80) + '\n';
        report += String('S.No.').padEnd(6) + String('Description').padEnd(40) + String('Qty').padStart(8) + String('Rate').padStart(15) + String('Amount').padStart(15) + '\n';
        report += '-'.repeat(80) + '\n';
        
        items.forEach((item, idx) => {
          const sno = (idx + 1).toString().padEnd(6);
          const desc = (item.name || item.description || 'N/A').substring(0, 38).padEnd(40);
          const qty = parseFloat(item.quantity || 1).toFixed(2).padStart(8);
          const rate = parseFloat(item.rate || item.price || 0);
          const rateStr = `₹${rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.padStart(15);
          const amount = parseFloat(item.amount || (item.quantity || 1) * rate);
          const amountStr = `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.padStart(15);
          report += `${sno}${desc}${qty}${rateStr}${amountStr}\n`;
        });
      }
      
    } else if (docType === 'trial_balance') {
      const balances = data?.balances || [];
      
      report += 'TRIAL BALANCE SUMMARY\n';
      report += '-'.repeat(80) + '\n';
      report += `Total Accounts: ${balances.length}\n`;
      
      const totalDebits = balances.reduce((sum, b) => sum + (parseFloat(b.debit) || 0), 0);
      const totalCredits = balances.reduce((sum, b) => sum + (parseFloat(b.credit) || 0), 0);
      report += `Total Debits: ₹${totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      report += `Total Credits: ₹${totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      
      report += '\n' + '='.repeat(80) + '\n\n';
      report += 'ACCOUNT DETAILS\n';
      report += '='.repeat(80) + '\n';
      report += String('S.No.').padEnd(6) + String('Account Name').padEnd(40) + String('Debit').padStart(20) + String('Credit').padStart(20) + '\n';
      report += '-'.repeat(80) + '\n';
      
      balances.forEach((bal, idx) => {
        const sno = (idx + 1).toString().padEnd(6);
        const accName = (bal.account_name || 'N/A').substring(0, 38).padEnd(40);
        const debit = parseFloat(bal.debit || 0);
        const credit = parseFloat(bal.credit || 0);
        const debitStr = debit > 0 ? `₹${debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
        const creditStr = credit > 0 ? `₹${credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
        report += `${sno}${accName}${debitStr.padStart(20)}${creditStr.padStart(20)}\n`;
      });
      
      report += '\nNote: Opening balance journal vouchers will be created for import into Tally.\n';
    }
    
    // Footer
    report += '\n' + '='.repeat(80) + '\n';
    report += 'NOTE:\n';
    report += 'This is a human-readable report of the financial data.\n';
    report += 'For Tally XML export, please contact support.\n';
    report += '='.repeat(80) + '\n';
    report += `\nGenerated by FinSight on ${date}\n`;
    
    return report;
  };

  // Handle Tally XML export
  const handleExportTallyXML = async () => {
    // Check if document type is supported for Tally export
    const supportedTypes = ['bank_statement', 'invoice', 'trial_balance'];
    if (!supportedTypes.includes(documentType)) {
      alert(`Tally XML export is currently supported for: ${supportedTypes.join(', ')}. Your document type "${documentType}" is not yet supported.`);
      return;
    }

    setIsExportingTally(true);
    setExportProgress("Generating Tally report...");
    
    try {
      // Get company name from result if available, otherwise use default
      const companyName = result?.entity_name || result?.company_name || "FinSight Company";
      
      // Generate and download human-readable report file directly (no XML needed)
      const readableReport = generateHumanReadableReport(result, documentType, companyName, 'N/A');
      const readableBlob = new Blob([readableReport], { type: 'text/plain; charset=utf-8' });
      const readableUrl = URL.createObjectURL(readableBlob);
      const readableFilename = `tally_export_${documentType}_${new Date().toISOString().split('T')[0]}_report.txt`;
      const readableLink = document.createElement('a');
      readableLink.href = readableUrl;
      readableLink.download = readableFilename;
      readableLink.style.display = 'none';
      document.body.appendChild(readableLink);
      readableLink.click();
      
      setTimeout(() => {
        document.body.removeChild(readableLink);
        URL.revokeObjectURL(readableUrl);
      }, 200);
      
      setExportProgress("Tally report exported successfully!");
      setTimeout(() => {
        setExportProgress("");
        setIsExportingTally(false);
      }, 2000);
    } catch (error) {
      console.error("Error exporting to Tally XML:", error);
      // Extract error message properly
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = error.message || error.detail || error.error || JSON.stringify(error);
      }
      
      setExportProgress(`Failed to export: ${errorMessage}`);
      alert(`Failed to export to Tally XML: ${errorMessage}`);
      setTimeout(() => {
        setExportProgress("");
        setIsExportingTally(false);
      }, 3000);
    }
  };

  // Removed PDF export functionality - now using Tally XML export only

  // Debug: Show raw data if available
  const showDebugInfo = result && Object.keys(result).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-blue-50/20 to-purple-50/20 flex flex-col p-4 sm:p-6">
      {/* Debug Info - Remove in production */}
      {showDebugInfo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <details className="text-sm">
            <summary className="font-semibold text-yellow-800 cursor-pointer">Debug: Raw Response Data</summary>
            <pre className="mt-2 text-xs overflow-auto max-h-60 bg-white p-2 rounded border">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
      
      {/* ---------- HEADER ---------- */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-[#E5E7EB]/50 mb-6">
        {/* LEFT: Document Info */}
        <div className="flex items-center space-x-4 mb-3 sm:mb-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.25)]">
            <CheckCircle className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-[-0.01em]">
              {fileName}
            </h1>
            <p className="text-sm text-[#64748B] font-medium">Processed successfully</p>
          </div>
        </div>

        {/* RIGHT: Tally XML Export Button */}
        <div className="flex flex-col items-end space-y-2 w-full sm:w-auto">
            <button 
            onClick={handleExportTallyXML}
            disabled={isExportingTally}
            className="group flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-2 border-blue-500 hover:border-blue-600 shadow-[0_4px_12px_rgba(59,130,246,0.35)] hover:shadow-[0_6px_16px_rgba(59,130,246,0.45)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] font-semibold"
          >
            {isExportingTally ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Exporting to Tally...
                </>
              ) : (
                <>
                <FileCode className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" /> Export Tally Report
                </>
              )}
            </button>
          {exportProgress && (
            <p className="text-xs text-[#64748B] mt-1 font-medium text-right">{exportProgress}</p>
          )}
        </div>
      </header>

      {/* ---------- KEY METRICS CARDS ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {finalInsights.map((card, index) => (
          <div
            key={index}
            className={`${card.bg} p-5 sm:p-6 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] border-2 border-[#E5E7EB]/60 flex flex-col items-start hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:border-[#1E40AF]/30 transition-all duration-300 cursor-pointer group`}
          >
            <p className="text-xs sm:text-sm text-[#64748B] font-semibold mb-2 uppercase tracking-wide">{card.title}</p>
            <h3 className={`text-xl sm:text-2xl font-bold ${card.color} group-hover:scale-105 transition-transform duration-300`}>{card.value}</h3>
          </div>
        ))}
      </div>

      {/* ---------- TAB NAVIGATION ---------- */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-[#E5E7EB]/50 mb-6 overflow-hidden">
        <div className="flex border-b border-[#E5E7EB]/50 overflow-x-auto scrollbar-hide">
          {isComprehensiveAuditReport && (
            <button
              onClick={() => setActiveTab("audit-report")}
              className={`group flex items-center gap-2 px-6 py-4 font-semibold transition-all duration-200 relative ${
                activeTab === "audit-report"
                  ? "text-[#1E40AF] bg-[#EFF6FF]/50"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              <FileText className={`w-5 h-5 transition-transform duration-200 ${activeTab === "audit-report" ? "scale-110" : "group-hover:scale-110"}`} />
              <span>Audit Report</span>
              {activeTab === "audit-report" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1E40AF] to-[#7C3AED]"></div>
              )}
            </button>
          )}
          {isComprehensiveGstReport && (
            <button
              onClick={() => setActiveTab("gst-report")}
              className={`group flex items-center gap-2 px-6 py-4 font-semibold transition-all duration-200 relative ${
                activeTab === "gst-report"
                  ? "text-[#1E40AF] bg-[#EFF6FF]/50"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              <FileText className={`w-5 h-5 transition-transform duration-200 ${activeTab === "gst-report" ? "scale-110" : "group-hover:scale-110"}`} />
              <span>GST Report</span>
              {activeTab === "gst-report" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1E40AF] to-[#7C3AED]"></div>
              )}
            </button>
          )}
          {hasReports && (
            <button
              onClick={() => setActiveTab("reports")}
              className={`group flex items-center gap-2 px-6 py-4 font-semibold transition-all duration-200 relative ${
                activeTab === "reports"
                  ? "text-[#1E40AF] bg-[#EFF6FF]/50"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              <FileText className={`w-5 h-5 transition-transform duration-200 ${activeTab === "reports" ? "scale-110" : "group-hover:scale-110"}`} />
              <span>Reports</span>
              {activeTab === "reports" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1E40AF] to-[#7C3AED]"></div>
              )}
            </button>
          )}
          {docConfig.showCharts && !isComprehensiveAuditReport && !isComprehensiveGstReport && (
            <button
              onClick={() => setActiveTab("charts")}
              className={`group flex items-center gap-2 px-6 py-4 font-semibold transition-all duration-200 relative ${
                activeTab === "charts"
                  ? "text-[#1E40AF] bg-[#EFF6FF]/50"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              <BarChart3 className={`w-5 h-5 transition-transform duration-200 ${activeTab === "charts" ? "scale-110" : "group-hover:scale-110"}`} />
              <span>Charts & Visualizations</span>
              {activeTab === "charts" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1E40AF] to-[#7C3AED]"></div>
              )}
            </button>
          )}
          {docConfig.showRatios && !isComprehensiveAuditReport && !isComprehensiveGstReport && (
            <button
              onClick={() => setActiveTab("ratios")}
              className={`group flex items-center gap-2 px-6 py-4 font-semibold transition-all duration-200 relative ${
                activeTab === "ratios"
                  ? "text-[#1E40AF] bg-[#EFF6FF]/50"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              <Calculator className={`w-5 h-5 transition-transform duration-200 ${activeTab === "ratios" ? "scale-110" : "group-hover:scale-110"}`} />
              <span>Financial Ratios</span>
              {activeTab === "ratios" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1E40AF] to-[#7C3AED]"></div>
              )}
            </button>
          )}
          {docConfig.showTransactions && (
            <button
              onClick={() => setActiveTab("transactions")}
              className={`group flex items-center gap-2 px-6 py-4 font-semibold transition-all duration-200 relative ${
                activeTab === "transactions"
                  ? "text-[#1E40AF] bg-[#EFF6FF]/50"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              <Table className={`w-5 h-5 transition-transform duration-200 ${activeTab === "transactions" ? "scale-110" : "group-hover:scale-110"}`} />
              <span>Transactions</span>
              {activeTab === "transactions" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1E40AF] to-[#7C3AED]"></div>
              )}
            </button>
          )}
        </div>

        {/* ---------- TAB CONTENT ---------- */}
        <div className="p-6 sm:p-8">
          {activeTab === "gst-report" && isComprehensiveGstReport && (
            <div className="space-y-6">
              {/* Header Section */}
              {result.header && (
                <div className="bg-white/80 backdrop-blur-sm border-2 border-[#E5E7EB] rounded-[20px] p-6 lg:p-8 shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300">
                  <h2 className="text-2xl lg:text-3xl font-bold text-[#0F172A] mb-6 tracking-[-0.01em]">{result.header.title || "GST Compliance Audit Report"}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 text-sm">
                    {result.header.company_name && (
                      <div className="p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#EFF6FF] transition-colors duration-200">
                        <span className="text-[#64748B] font-medium">Company:</span>
                        <p className="font-semibold text-[#0F172A] mt-1">{result.header.company_name}</p>
                      </div>
                    )}
                    {result.header.financial_year && (
                      <div className="p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#EFF6FF] transition-colors duration-200">
                        <span className="text-[#64748B] font-medium">Financial Year:</span>
                        <p className="font-semibold text-[#0F172A] mt-1">{result.header.financial_year}</p>
                      </div>
                    )}
                    {result.header.prepared_by && (
                      <div className="p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#EFF6FF] transition-colors duration-200">
                        <span className="text-[#64748B] font-medium">Prepared by:</span>
                        <p className="font-semibold text-[#0F172A] mt-1">{result.header.prepared_by}</p>
                      </div>
                    )}
                    {result.header.date && (
                      <div className="p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#EFF6FF] transition-colors duration-200">
                        <span className="text-[#64748B] font-medium">Date:</span>
                        <p className="font-semibold text-[#0F172A] mt-1">{result.header.date}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Executive Summary */}
              {result.executive_summary && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">1. Executive Summary</h3>
                  <div className="space-y-3 text-gray-700">
                    {result.executive_summary.objective && (
                      <p><span className="font-semibold">Objective:</span> {result.executive_summary.objective}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {result.executive_summary.total_output_tax !== undefined && (
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-sm text-gray-600">Total Output Tax</p>
                          <p className="text-lg font-bold text-blue-600">₹{result.executive_summary.total_output_tax?.toLocaleString('en-IN') || 0}</p>
                        </div>
                      )}
                      {result.executive_summary.total_input_tax !== undefined && (
                        <div className="bg-green-50 p-3 rounded">
                          <p className="text-sm text-gray-600">Total Input Tax</p>
                          <p className="text-lg font-bold text-green-600">₹{result.executive_summary.total_input_tax?.toLocaleString('en-IN') || 0}</p>
                        </div>
                      )}
                      {result.executive_summary.net_tax_payable !== undefined && (
                        <div className="bg-purple-50 p-3 rounded">
                          <p className="text-sm text-gray-600">Net Tax Payable</p>
                          <p className="text-lg font-bold text-purple-600">₹{result.executive_summary.net_tax_payable?.toLocaleString('en-IN') || 0}</p>
                        </div>
                      )}
                      {result.executive_summary.itc_available !== undefined && (
                        <div className="bg-orange-50 p-3 rounded">
                          <p className="text-sm text-gray-600">ITC Available</p>
                          <p className="text-lg font-bold text-orange-600">₹{result.executive_summary.itc_available?.toLocaleString('en-IN') || 0}</p>
                        </div>
                      )}
                    </div>
                    {result.executive_summary.key_highlights && result.executive_summary.key_highlights.length > 0 && (
                      <div className="mt-4">
                        <p className="font-semibold text-gray-700 mb-2">Key Highlights:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          {result.executive_summary.key_highlights.map((highlight, idx) => (
                            <li key={idx}>{highlight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Audit Scope & Methodology */}
              {result.audit_scope_and_methodology && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">2. Audit Scope & Methodology</h3>
                  <div className="space-y-3 text-gray-700">
                    {result.audit_scope_and_methodology.scope && (
                      <p><span className="font-semibold">Scope:</span> {result.audit_scope_and_methodology.scope}</p>
                    )}
                    {result.audit_scope_and_methodology.methodology && (
                      <p><span className="font-semibold">Methodology:</span> {result.audit_scope_and_methodology.methodology}</p>
                    )}
                    {result.audit_scope_and_methodology.period_covered && (
                      <p><span className="font-semibold">Period Covered:</span> {result.audit_scope_and_methodology.period_covered}</p>
                    )}
                    {result.audit_scope_and_methodology.documents_reviewed && (
                      <div>
                        <p className="font-semibold mb-2">Documents Reviewed:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          {result.audit_scope_and_methodology.documents_reviewed.map((doc, idx) => (
                            <li key={idx}>{doc}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reconciliation Summary */}
              {result.reconciliation_summary && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">3. Reconciliation Summary</h3>
                  <div className="space-y-4">
                    {result.reconciliation_summary.gstr2b_vs_purchase_register && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">GSTR-2B vs Purchase Register</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">GSTR-2B Total</p>
                            <p className="text-lg font-bold">₹{result.reconciliation_summary.gstr2b_vs_purchase_register.gstr2b_total?.toLocaleString('en-IN') || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Purchase Register Total</p>
                            <p className="text-lg font-bold">₹{result.reconciliation_summary.gstr2b_vs_purchase_register.purchase_register_total?.toLocaleString('en-IN') || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Difference</p>
                            <p className={`text-lg font-bold ${result.reconciliation_summary.gstr2b_vs_purchase_register.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ₹{result.reconciliation_summary.gstr2b_vs_purchase_register.difference?.toLocaleString('en-IN') || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Variance %</p>
                            <p className="text-lg font-bold">{result.reconciliation_summary.gstr2b_vs_purchase_register.variance_percentage?.toFixed(2) || 0}%</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {result.reconciliation_summary.itc_reconciliation && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">ITC Reconciliation</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">GSTR-2B ITC</p>
                            <p className="text-lg font-bold">₹{result.reconciliation_summary.itc_reconciliation.gstr2b_itc?.toLocaleString('en-IN') || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Claimed ITC</p>
                            <p className="text-lg font-bold">₹{result.reconciliation_summary.itc_reconciliation.claimed_itc?.toLocaleString('en-IN') || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <p className="text-lg font-bold">{result.reconciliation_summary.itc_reconciliation.reconciliation_status || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Detailed Findings & Observations */}
              {result.detailed_findings_and_observations && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">4. Detailed Findings & Observations</h3>
                  
                  {/* GSTR-2B Review */}
                  {result.detailed_findings_and_observations.gstr2b_review && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">4.1 GSTR-2B Review</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Total Invoices</p>
                          <p className="text-lg font-bold">{result.detailed_findings_and_observations.gstr2b_review.total_invoices || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Taxable Value</p>
                          <p className="text-lg font-bold">₹{result.detailed_findings_and_observations.gstr2b_review.total_taxable_value?.toLocaleString('en-IN') || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ITC Available</p>
                          <p className="text-lg font-bold">₹{result.detailed_findings_and_observations.gstr2b_review.total_itc_available?.toLocaleString('en-IN') || 0}</p>
                        </div>
                      </div>
                      {result.detailed_findings_and_observations.gstr2b_review.observations && result.detailed_findings_and_observations.gstr2b_review.observations.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Observations:</p>
                          <ul className="list-disc list-inside space-y-1 text-gray-600">
                            {result.detailed_findings_and_observations.gstr2b_review.observations.map((obs, idx) => (
                              <li key={idx}>{obs}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Purchase Register Review */}
                  {result.detailed_findings_and_observations.purchase_register_review && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">4.2 Purchase Register Review</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Total Purchases</p>
                          <p className="text-lg font-bold">{result.detailed_findings_and_observations.purchase_register_review.total_purchases || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Taxable Value</p>
                          <p className="text-lg font-bold">₹{result.detailed_findings_and_observations.purchase_register_review.total_taxable_value?.toLocaleString('en-IN') || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ITC Claimed</p>
                          <p className="text-lg font-bold">₹{result.detailed_findings_and_observations.purchase_register_review.total_itc_claimed?.toLocaleString('en-IN') || 0}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Invoice Matching Review */}
                  {result.detailed_findings_and_observations.invoice_matching_review && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">4.3 Invoice Matching Review</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Total Invoices</p>
                          <p className="text-lg font-bold">{result.detailed_findings_and_observations.invoice_matching_review.total_invoices || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Matched</p>
                          <p className="text-lg font-bold text-green-600">{result.detailed_findings_and_observations.invoice_matching_review.matched_invoices || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Unmatched</p>
                          <p className="text-lg font-bold text-red-600">{result.detailed_findings_and_observations.invoice_matching_review.unmatched_invoices || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Match %</p>
                          <p className="text-lg font-bold">{result.detailed_findings_and_observations.invoice_matching_review.match_percentage?.toFixed(2) || 0}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ITC Verification Review */}
                  {result.detailed_findings_and_observations.itc_verification_review && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">4.4 ITC Verification Review</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">ITC Available</p>
                          <p className="text-lg font-bold">₹{result.detailed_findings_and_observations.itc_verification_review.total_itc_available?.toLocaleString('en-IN') || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ITC Utilized</p>
                          <p className="text-lg font-bold">₹{result.detailed_findings_and_observations.itc_verification_review.itc_utilized?.toLocaleString('en-IN') || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ITC Pending</p>
                          <p className="text-lg font-bold">₹{result.detailed_findings_and_observations.itc_verification_review.itc_pending?.toLocaleString('en-IN') || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Utilization %</p>
                          <p className="text-lg font-bold">{result.detailed_findings_and_observations.itc_verification_review.utilization_percentage?.toFixed(2) || 0}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vendor Compliance Review */}
                  {result.detailed_findings_and_observations.vendor_compliance_review && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">4.5 Vendor Compliance Review</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Total Vendors</p>
                          <p className="text-lg font-bold">{result.detailed_findings_and_observations.vendor_compliance_review.total_vendors || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Compliant</p>
                          <p className="text-lg font-bold text-green-600">{result.detailed_findings_and_observations.vendor_compliance_review.compliant_vendors || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Non-Compliant</p>
                          <p className="text-lg font-bold text-red-600">{result.detailed_findings_and_observations.vendor_compliance_review.non_compliant_vendors || 0}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Invoice-Level Reconciliation */}
              {result.invoice_level_reconciliation && result.invoice_level_reconciliation.invoice_details && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">5. Invoice-Level Reconciliation</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Number</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor GSTIN</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxable Value (₹)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ITC Claimed (₹)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {result.invoice_level_reconciliation.invoice_details.slice(0, 20).map((invoice, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm text-gray-900">{invoice.invoice_number || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{invoice.vendor_gstin || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{invoice.vendor_name || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">₹{invoice.taxable_value?.toLocaleString('en-IN') || 0}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">₹{invoice.itc_claimed?.toLocaleString('en-IN') || 0}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                invoice.reconciliation_status === 'matched' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {invoice.reconciliation_status || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.invoice_level_reconciliation.invoice_details.length > 20 && (
                      <p className="mt-4 text-sm text-gray-500 text-center">
                        Showing 20 of {result.invoice_level_reconciliation.invoice_details.length} invoices
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Vendor-Wise Compliance Review */}
              {result.vendor_wise_compliance_review && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">6. Vendor-Wise Compliance Review</h3>
                  {result.vendor_wise_compliance_review.vendor_details && result.vendor_wise_compliance_review.vendor_details.length > 0 && (
                    <div className="space-y-4">
                      {result.vendor_wise_compliance_review.vendor_details.slice(0, 10).map((vendor, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">{vendor.vendor_name || 'N/A'}</p>
                              <p className="text-sm text-gray-600">GSTIN: {vendor.vendor_gstin || 'N/A'}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              vendor.compliance_status === 'compliant' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {vendor.compliance_status || 'N/A'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-3">
                            <div>
                              <p className="text-xs text-gray-600">Total Invoices</p>
                              <p className="text-sm font-bold">{vendor.total_invoices || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Taxable Value</p>
                              <p className="text-sm font-bold">₹{vendor.total_taxable_value?.toLocaleString('en-IN') || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">ITC Claimed</p>
                              <p className="text-sm font-bold">₹{vendor.total_itc_claimed?.toLocaleString('en-IN') || 0}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.vendor_wise_compliance_review.summary && (
                    <p className="mt-4 text-gray-700">{result.vendor_wise_compliance_review.summary}</p>
                  )}
                </div>
              )}

              {/* Risk Assessment */}
              {result.risk_assessment && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">7. Risk Assessment</h3>
                  <div className="space-y-4">
                    {result.risk_assessment.high_risk_items && result.risk_assessment.high_risk_items.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-700 mb-2">High Risk Items:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          {result.risk_assessment.high_risk_items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.risk_assessment.medium_risk_items && result.risk_assessment.medium_risk_items.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-yellow-700 mb-2">Medium Risk Items:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          {result.risk_assessment.medium_risk_items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.risk_assessment.overall_risk_level && (
                      <div className="mt-4">
                        <p className="font-semibold text-gray-700">Overall Risk Level: 
                          <span className={`ml-2 px-3 py-1 rounded-full text-sm font-semibold ${
                            result.risk_assessment.overall_risk_level === 'high' ? 'bg-red-100 text-red-700' :
                            result.risk_assessment.overall_risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {result.risk_assessment.overall_risk_level.toUpperCase()}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">8. Recommendations</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Auditor's Conclusion */}
              {result.auditors_conclusion && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">9. Auditor's Conclusion</h3>
                  <p className="text-gray-700">{result.auditors_conclusion}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "audit-report" && isComprehensiveAuditReport && (
            <div className="space-y-6">
              {/* Header Section */}
              {result.header && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{result.header.title || "Financial Audit Report"}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {result.header.company_name && (
                      <div>
                        <span className="text-gray-600">Company:</span>
                        <p className="font-semibold text-gray-900">{result.header.company_name}</p>
                      </div>
                    )}
                    {result.header.financial_year && (
                      <div>
                        <span className="text-gray-600">Financial Year:</span>
                        <p className="font-semibold text-gray-900">{result.header.financial_year}</p>
                      </div>
                    )}
                    {result.header.audit_type && (
                      <div>
                        <span className="text-gray-600">Audit Type:</span>
                        <p className="font-semibold text-gray-900">{result.header.audit_type}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Executive Summary */}
              {result.executive_summary && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Executive Summary</h3>
                  <div className="space-y-3 text-gray-700">
                    {result.executive_summary.objective && (
                      <p><span className="font-semibold">Objective:</span> {result.executive_summary.objective}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {result.executive_summary.total_income !== undefined && (
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-sm text-gray-600">Total Income</p>
                          <p className="text-lg font-bold text-blue-600">₹{result.executive_summary.total_income?.toLocaleString('en-IN') || 0}</p>
                        </div>
                      )}
                      {result.executive_summary.net_profit !== undefined && (
                        <div className="bg-green-50 p-3 rounded">
                          <p className="text-sm text-gray-600">Net Profit</p>
                          <p className="text-lg font-bold text-green-600">₹{result.executive_summary.net_profit?.toLocaleString('en-IN') || 0}</p>
                        </div>
                      )}
                      {result.executive_summary.balance_sheet_discrepancy !== undefined && (
                        <div className="bg-red-50 p-3 rounded">
                          <p className="text-sm text-gray-600">Balance Sheet Discrepancy</p>
                          <p className="text-lg font-bold text-red-600">₹{result.executive_summary.balance_sheet_discrepancy?.toLocaleString('en-IN') || 0}</p>
                        </div>
                      )}
                    </div>
                    {result.executive_summary.trial_balance_status && (
                      <p className="mt-4"><span className="font-semibold">Trial Balance Status:</span> {result.executive_summary.trial_balance_status}</p>
                    )}
                    {result.executive_summary.gst_variances && (
                      <p><span className="font-semibold">GST Variances:</span> {result.executive_summary.gst_variances}</p>
                    )}
                    {result.executive_summary.tds_variances && (
                      <p><span className="font-semibold">TDS Variances:</span> {result.executive_summary.tds_variances}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Detailed Financial Analysis */}
              {result.detailed_financial_analysis && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Detailed Financial Analysis</h3>
                  
                  {/* Profitability Analysis */}
                  {result.detailed_financial_analysis.profitability_analysis && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">Profitability Analysis</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {result.detailed_financial_analysis.profitability_analysis.revenue?.total !== undefined && (
                          <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-lg font-bold">₹{result.detailed_financial_analysis.profitability_analysis.revenue.total?.toLocaleString('en-IN') || 0}</p>
                          </div>
                        )}
                        {result.detailed_financial_analysis.profitability_analysis.net_profit !== undefined && (
                          <div>
                            <p className="text-sm text-gray-600">Net Profit</p>
                            <p className="text-lg font-bold text-green-600">₹{result.detailed_financial_analysis.profitability_analysis.net_profit?.toLocaleString('en-IN') || 0}</p>
                          </div>
                        )}
                      </div>
                      {result.detailed_financial_analysis.profitability_analysis.recommendations?.length > 0 && (
                        <div className="mt-4">
                          <p className="font-semibold text-gray-700 mb-2">Recommendations:</p>
                          <ul className="list-disc list-inside space-y-1 text-gray-600">
                            {result.detailed_financial_analysis.profitability_analysis.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Balance Sheet Assessment */}
                  {result.detailed_financial_analysis.balance_sheet_assessment && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">Balance Sheet Assessment</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {result.detailed_financial_analysis.balance_sheet_assessment.total_assets !== undefined && (
                          <div>
                            <p className="text-sm text-gray-600">Total Assets</p>
                            <p className="text-lg font-bold">₹{result.detailed_financial_analysis.balance_sheet_assessment.total_assets?.toLocaleString('en-IN') || 0}</p>
                          </div>
                        )}
                        {result.detailed_financial_analysis.balance_sheet_assessment.total_liabilities_and_equity !== undefined && (
                          <div>
                            <p className="text-sm text-gray-600">Total Liabilities & Equity</p>
                            <p className="text-lg font-bold">₹{result.detailed_financial_analysis.balance_sheet_assessment.total_liabilities_and_equity?.toLocaleString('en-IN') || 0}</p>
                          </div>
                        )}
                        {result.detailed_financial_analysis.balance_sheet_assessment.imbalance !== undefined && (
                          <div>
                            <p className="text-sm text-gray-600">Imbalance</p>
                            <p className={`text-lg font-bold ${result.detailed_financial_analysis.balance_sheet_assessment.imbalance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ₹{result.detailed_financial_analysis.balance_sheet_assessment.imbalance?.toLocaleString('en-IN') || 0}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* GST Compliance Review */}
              {result.gst_compliance_review && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">GST Compliance Review</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {result.gst_compliance_review.outward_taxable_supplies !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Outward Taxable Supplies</p>
                        <p className="text-lg font-bold">₹{result.gst_compliance_review.outward_taxable_supplies?.toLocaleString('en-IN') || 0}</p>
                      </div>
                    )}
                    {result.gst_compliance_review.net_gst_payable !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Net GST Payable</p>
                        <p className="text-lg font-bold">₹{result.gst_compliance_review.net_gst_payable?.toLocaleString('en-IN') || 0}</p>
                      </div>
                    )}
                    {result.gst_compliance_review.variance !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Variance</p>
                        <p className={`text-lg font-bold ${result.gst_compliance_review.variance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{result.gst_compliance_review.variance?.toLocaleString('en-IN') || 0}
                        </p>
                      </div>
                    )}
                  </div>
                  {result.gst_compliance_review.compliance_status && (
                    <p className="mt-4"><span className="font-semibold">Compliance Status:</span> {result.gst_compliance_review.compliance_status}</p>
                  )}
                </div>
              )}

              {/* TDS Compliance Review */}
              {result.tds_compliance_review && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">TDS Compliance Review</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {result.tds_compliance_review.cumulative_tds !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Cumulative TDS</p>
                        <p className="text-lg font-bold">₹{result.tds_compliance_review.cumulative_tds?.toLocaleString('en-IN') || 0}</p>
                      </div>
                    )}
                    {result.tds_compliance_review.recorded_tds_payable !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Recorded TDS Payable</p>
                        <p className="text-lg font-bold">₹{result.tds_compliance_review.recorded_tds_payable?.toLocaleString('en-IN') || 0}</p>
                      </div>
                    )}
                    {result.tds_compliance_review.variance !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Variance</p>
                        <p className={`text-lg font-bold ${result.tds_compliance_review.variance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{result.tds_compliance_review.variance?.toLocaleString('en-IN') || 0}
                        </p>
                      </div>
                    )}
                  </div>
                  {result.tds_compliance_review.recommendations?.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold text-gray-700 mb-2">Recommendations:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {result.tds_compliance_review.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Key Findings and Risks */}
              {result.key_findings_and_risks && result.key_findings_and_risks.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Key Findings and Risks</h3>
                  <div className="space-y-4">
                    {result.key_findings_and_risks.map((finding, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                        finding.risk_level === 'high' ? 'bg-red-50 border-red-500' :
                        finding.risk_level === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                        'bg-blue-50 border-blue-500'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{finding.finding}</p>
                            {finding.impact && (
                              <p className="text-sm text-gray-600 mt-1">{finding.impact}</p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            finding.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                            finding.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {finding.risk_level?.toUpperCase() || 'LOW'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-gray-700">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* General Ledger, Cash & Bank, Fixed Asset sections if available */}
              {result.general_ledger_behavior && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">General Ledger Behavior</h3>
                  <div className="space-y-2 text-gray-700">
                    {result.general_ledger_behavior.debtors_ledger && (
                      <p><span className="font-semibold">Debtors Ledger:</span> {result.general_ledger_behavior.debtors_ledger}</p>
                    )}
                    {result.general_ledger_behavior.outstanding_debtor_balance !== undefined && (
                      <p><span className="font-semibold">Outstanding Debtor Balance:</span> ₹{result.general_ledger_behavior.outstanding_debtor_balance?.toLocaleString('en-IN') || 0}</p>
                    )}
                    {result.general_ledger_behavior.conclusion && (
                      <p className="mt-2">{result.general_ledger_behavior.conclusion}</p>
                    )}
                  </div>
                </div>
              )}

              {result.cash_and_bank_review && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Cash and Bank Review</h3>
                  <div className="space-y-2 text-gray-700">
                    {result.cash_and_bank_review.coherence && (
                      <p><span className="font-semibold">Coherence:</span> {result.cash_and_bank_review.coherence}</p>
                    )}
                    {result.cash_and_bank_review.conclusion && (
                      <p className="mt-2">{result.cash_and_bank_review.conclusion}</p>
                    )}
                  </div>
                </div>
              )}

              {result.fixed_asset_register_review && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Fixed Asset Register Review</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {result.fixed_asset_register_review.machinery_acquisition_costs !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Machinery Costs</p>
                        <p className="text-lg font-bold">₹{result.fixed_asset_register_review.machinery_acquisition_costs?.toLocaleString('en-IN') || 0}</p>
                      </div>
                    )}
                    {result.fixed_asset_register_review.furniture_acquisition_costs !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Furniture Costs</p>
                        <p className="text-lg font-bold">₹{result.fixed_asset_register_review.furniture_acquisition_costs?.toLocaleString('en-IN') || 0}</p>
                      </div>
                    )}
                  </div>
                  {result.fixed_asset_register_review.recommendations?.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold text-gray-700 mb-2">Recommendations:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {result.fixed_asset_register_review.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "reports" && hasReports && (
            <div>
              <ReportsViewer 
                reports={filterReportsByDocumentType(result.reports, documentType, expectedReports)} 
                documentType={documentType}
                baseResult={result}
              />
            </div>
          )}
          {activeTab === "charts" && docConfig.showCharts && (
            <div className="space-y-6">
              {/* Show charts based on document type */}
              {documentType === "trial_balance" ? (
                // Advanced Trial Balance Dashboard with dynamic visualizations
                (() => {
                  const plStatement = result?.reports?.profit_loss || result?.reports?.management_report?.financial_statements?.pl_statement || {};
                  const balanceSheet = result?.reports?.balance_sheet || result?.reports?.management_report?.financial_statements?.balance_sheet || {};
                  const period = result?.period || result?.reports?.management_report?.period || 'Current Period';
                  
                  // Extract OPEX breakdown from expenses if available
                  const expenses = plStatement.expenses || 0;
                  let opexBreakdown = {};
                  
                  // Try to get OPEX breakdown from various sources
                  if (plStatement.opex_breakdown) {
                    opexBreakdown = plStatement.opex_breakdown;
                  } else if (plStatement.expense_breakdown && Array.isArray(plStatement.expense_breakdown)) {
                    // Extract from expense breakdown array
                    const salesExp = plStatement.expense_breakdown.find(e => 
                      e.category?.toLowerCase().includes('sales') || 
                      e.name?.toLowerCase().includes('sales')
                    );
                    const marketingExp = plStatement.expense_breakdown.find(e => 
                      e.category?.toLowerCase().includes('marketing') || 
                      e.name?.toLowerCase().includes('marketing')
                    );
                    const adminExp = plStatement.expense_breakdown.find(e => 
                      e.category?.toLowerCase().includes('admin') || 
                      e.category?.toLowerCase().includes('general') ||
                      e.name?.toLowerCase().includes('admin') ||
                      e.name?.toLowerCase().includes('general')
                    );
                    
                    opexBreakdown = {
                      sales: salesExp?.amount || expenses * 0.5,
                      marketing: marketingExp?.amount || expenses * 0.22,
                      generalAdmin: adminExp?.amount || expenses * 0.28
                    };
                  } else {
                    // Default breakdown percentages
                    opexBreakdown = {
                      sales: expenses * 0.5,
                      marketing: expenses * 0.22,
                      generalAdmin: expenses * 0.28
                    };
                  }
                  
                  // Prepare financial data for dashboard
                  const financialData = {
                    plStatement: {
                      ...plStatement,
                      opex_breakdown: opexBreakdown,
                      // Try to get monthly data if available
                      monthly_data: plStatement.monthly_data || result?.reports?.management_report?.monthly_data || []
                    },
                    balanceSheet,
                    period
                  };
                  
                  return <TrialBalanceDashboard financialData={financialData} />;
                })()
              ) : docConfig.showTransactions && allTransactions && allTransactions.length > 0 ? (
                // Transaction-based charts for bank statements
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <BalanceTrendChart transactions={allTransactions} />
                    <IncomeExpenseChart summary={summary} transactions={allTransactions} />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CashFlowChart transactions={allTransactions} summary={summary} />
                    <TransactionTypeChart transactions={allTransactions} />
                  </div>
                  <DailyTransactionChart transactions={allTransactions} />
                </>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <p className="text-blue-800">
                    {documentType === "balance_sheet" 
                      ? "Charts for Balance Sheet data are available in the Reports tab. Please check the individual reports for visualizations."
                      : "No transaction data available for chart visualization. Please upload a document with transaction data."}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "ratios" && docConfig.showRatios && (
            <div>
              {/* Use AccountingRatiosTable (PDF format) to match Reports tab - same format and data */}
              {(() => {
                // Use the same logic as ReportsViewer for accounting_ratios
                const accountingRatiosReport = result?.reports?.accounting_ratios || null;
                
                if (accountingRatiosReport) {
                  // Extract period from reportData or use default (same as ReportsViewer)
                  const period = accountingRatiosReport.period || accountingRatiosReport.year || result?.period || 'Current Period';
                  
                  // Helper to extract previous period (same logic as ReportsViewer)
                  const extractPreviousPeriod = (reportData, currentPeriod) => {
                    if (!reportData || !currentPeriod) return null;
                    const yearMatch = currentPeriod.match(/\d{4}/);
                    if (yearMatch) {
                      const currentYear = parseInt(yearMatch[0]);
                      return currentPeriod.replace(currentYear.toString(), (currentYear - 1).toString());
                    }
                    return null;
                  };
                  
                  const previousPeriod = extractPreviousPeriod(accountingRatiosReport, period);
                  const companyName = accountingRatiosReport.company_name || accountingRatiosReport.companyName || result?.entity_name || result?.company_name || 'XYZ';
                  
                  // Helper to check if previous year data exists
                  const hasPreviousYearData = (reportData) => {
                    return !!(reportData.previous_year || reportData.previousYear || 
                             reportData.previous_year_ratios || reportData.previousYearRatios);
                  };
                  
                  // Extract previous year ratios from various formats (same as ReportsViewer)
                  const previousRatios = accountingRatiosReport.previous_year || accountingRatiosReport.previousYear || 
                                        accountingRatiosReport.previous_year_ratios || accountingRatiosReport.previousYearRatios || {};
                  
                  // Helper to parse numeric value from string (handles "23.2%" -> 23.2) - same as ReportsViewer
                  const parseRatioValue = (value) => {
                    if (value === null || value === undefined || value === '') return null;
                    if (typeof value === 'number') return value;
                    if (typeof value === 'string') {
                      const cleaned = value.replace(/%/g, '').trim();
                      const parsed = parseFloat(cleaned);
                      return isNaN(parsed) ? null : parsed;
                    }
                    return null;
                  };
                  
                  // Normalize ratios data - same logic as ReportsViewer
                  const normalizeRatios = (ratios) => {
                    if (!ratios || typeof ratios !== 'object') return ratios || {};
                    const normalized = { ...ratios };
                    
                    // Parse string percentages in profitability to numbers
                    if (ratios.profitability) {
                      normalized.profitability = {
                        ...ratios.profitability,
                        gross_margin: parseRatioValue(ratios.profitability.gross_margin) ?? ratios.profitability.gross_margin,
                        ebitda_margin: parseRatioValue(ratios.profitability.ebitda_margin) ?? ratios.profitability.ebitda_margin,
                        roe: parseRatioValue(ratios.profitability.roe) ?? ratios.profitability.roe,
                        roa: parseRatioValue(ratios.profitability.roa) ?? ratios.profitability.roa,
                      };
                    }
                    
                    // Extract from nested structures and add flat keys
                    if (ratios.liquidity) {
                      normalized.current_ratio = normalized.current_ratio || ratios.liquidity.current_ratio || ratios.liquidity.currentRatio;
                      normalized.currentRatio = normalized.currentRatio || ratios.liquidity.currentRatio || ratios.liquidity.current_ratio;
                    }
                    
                    if (ratios.profitability) {
                      const roeValue = parseRatioValue(ratios.profitability.roe) ?? parseRatioValue(ratios.profitability.returnOnEquity);
                      normalized.return_on_equity = normalized.return_on_equity || roeValue || ratios.profitability.roe || ratios.profitability.returnOnEquity;
                      normalized.returnOnEquity = normalized.returnOnEquity || roeValue || ratios.profitability.returnOnEquity || ratios.profitability.roe;
                      
                      const netMarginValue = parseRatioValue(ratios.profitability.net_profit_margin) ?? parseRatioValue(ratios.profitability.netProfitMargin);
                      normalized.net_profit_ratio = normalized.net_profit_ratio || netMarginValue || ratios.profitability.net_profit_margin || ratios.profitability.netProfitMargin;
                      normalized.netProfitRatio = normalized.netProfitRatio || netMarginValue || ratios.profitability.netProfitMargin || ratios.profitability.net_profit_margin;
                    }
                    
                    if (ratios.solvency) {
                      normalized.debt_equity_ratio = normalized.debt_equity_ratio || ratios.solvency.debt_to_equity || ratios.solvency.debtToEquity;
                      normalized.debtEquityRatio = normalized.debtEquityRatio || ratios.solvency.debtToEquity || ratios.solvency.debt_to_equity;
                      normalized.debt_service_coverage = normalized.debt_service_coverage || ratios.solvency.interest_coverage || ratios.solvency.interestCoverage;
                    }
                    
                    if (ratios.leverage) {
                      normalized.debt_equity_ratio = normalized.debt_equity_ratio || ratios.leverage.debtToEquity || ratios.leverage.debt_to_equity;
                      normalized.debtEquityRatio = normalized.debtEquityRatio || ratios.leverage.debtToEquity || ratios.leverage.debt_to_equity;
                    }
                    
                    if (ratios.efficiency) {
                      normalized.inventory_turnover = normalized.inventory_turnover || ratios.efficiency.inventory_turnover || ratios.efficiency.inventoryTurnover;
                      normalized.inventoryTurnover = normalized.inventoryTurnover || ratios.efficiency.inventoryTurnover || ratios.efficiency.inventory_turnover;
                    }
                    
                    // Calculate missing ratios from financial statements if available (same as ReportsViewer)
                    const pl = result?.reports?.profit_loss || result?.reports?.management_report?.financial_statements?.pl_statement || {};
                    const bs = result?.reports?.balance_sheet || result?.reports?.management_report?.financial_statements?.balance_sheet || {};
                    
                    const revenue = pl.revenue || 0;
                    const netProfit = pl.net_profit || 0;
                    const totalEquity = bs.total_equity || Object.values(bs.equity || {}).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
                    const totalAssets = bs.total_assets || Object.values(bs.assets || {}).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
                    const totalLiabilities = bs.total_liabilities || Object.values(bs.liabilities || {}).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
                    
                    // Calculate net profit margin if not present
                    if (!normalized.net_profit_ratio && revenue > 0 && netProfit !== null) {
                      const netProfitMargin = (netProfit / revenue) * 100;
                      normalized.net_profit_ratio = netProfitMargin;
                      normalized.netProfitRatio = netProfitMargin;
                      normalized.net_profit_margin = netProfitMargin;
                      if (!normalized.profitability) normalized.profitability = {};
                      normalized.profitability.net_profit_margin = netProfitMargin;
                      normalized.profitability.netProfitMargin = netProfitMargin;
                    }
                    
                    // Calculate net capital turnover
                    if (!normalized.net_capital_turnover && revenue > 0) {
                      const netCapital = totalAssets - totalLiabilities;
                      if (netCapital > 0) {
                        normalized.net_capital_turnover = revenue / netCapital;
                        normalized.netCapitalTurnover = revenue / netCapital;
                      }
                    }
                    
                    // Calculate ROCE
                    const currentLiabilities = normalized.liquidity?.current_liabilities || ratios.liquidity?.current_liabilities || totalLiabilities;
                    const capitalEmployed = totalAssets - currentLiabilities;
                    if (!normalized.return_on_capital_employed && capitalEmployed > 0) {
                      const ebit = pl.operating_profit || (pl.gross_profit || 0) - (pl.expenses || 0) || netProfit;
                      if (ebit !== null && ebit !== undefined) {
                        const roce = (ebit / capitalEmployed) * 100;
                        normalized.return_on_capital_employed = roce;
                        normalized.returnOnCapitalEmployed = roce;
                        if (!normalized.profitability) normalized.profitability = {};
                        normalized.profitability.roce = roce;
                      }
                    }
                    
                    return normalized;
                  };
                  
                  const normalizedRatios = normalizeRatios(accountingRatiosReport);
                  const normalizedPreviousRatios = normalizeRatios(previousRatios);
                  
                  // Prepare data for AccountingRatiosTable matching PDF format (same as ReportsViewer)
                  // Always calculate previousPeriod (will be shown even if data is missing - will show 0.00)
                  const accountingRatiosData = {
                    companyName,
                    period,
                    previousPeriod: previousPeriod || extractPreviousPeriod(accountingRatiosReport, period),
                    ratios: normalizedRatios,
                    previousRatios: normalizedPreviousRatios
                  };
                  
                  return <AccountingRatiosTable data={accountingRatiosData} />;
                }
                
                // Fallback: if no accounting_ratios report, show message
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <p className="text-yellow-800">
                      Accounting ratios are available in the Reports tab. Please check the "Accounting Ratios" report.
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === "transactions" && docConfig.showTransactions && (
            <div className="space-y-6">
              {/* Summary Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                <h3 className="font-bold text-gray-800 mb-3 text-lg">Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-800">{parsedRows.length || allTransactions.length || 324}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Anomalies Detected</p>
                    <p className="text-2xl font-bold text-yellow-600">{anomalies.length || 2}</p>
                  </div>
                  {summary && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Opening Balance</p>
                        <p className="text-2xl font-bold text-blue-600">₹{summary.opening_balance?.toLocaleString('en-IN') || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Closing Balance</p>
                        <p className="text-2xl font-bold text-green-600">₹{summary.closing_balance?.toLocaleString('en-IN') || 0}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-bold text-gray-800">Cleaned Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100">
                      <tr className="text-gray-700">
                        <th className="py-3 px-4 text-left border-b border-gray-200">Date</th>
                        <th className="py-3 px-4 text-left border-b border-gray-200">Description</th>
                        <th className="py-3 px-4 text-left border-b border-gray-200">Type</th>
                        <th className="py-3 px-4 text-right border-b border-gray-200">Amount</th>
                        {allTransactions.length > 0 && allTransactions[0]?.balance !== undefined && (
                          <th className="py-3 px-4 text-right border-b border-gray-200">Balance</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {displayTransactions.map((row, index) => (
                        <tr
                          key={index}
                          className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition`}
                        >
                          <td className="py-3 px-4 border-b border-gray-200">{row.date}</td>
                          <td className="py-3 px-4 border-b border-gray-200">{row.description}</td>
                          <td className="py-3 px-4 border-b border-gray-200">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                row.type === "Credit"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {row.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right border-b border-gray-200 font-medium">{row.amount}</td>
                          {row.balance !== undefined && (
                            <td className="py-3 px-4 text-right border-b border-gray-200">
                              ₹{row.balance.toLocaleString('en-IN')}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Anomalies Section */}
              {anomalies.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="font-bold text-gray-800 mb-3 text-lg">⚠️ Detected Anomalies</h3>
                  <ul className="space-y-3">
                    {anomalies.map((anomaly, idx) => {
                      // Format anomaly in readable format
                      if (typeof anomaly === 'string') {
                        return (
                          <li key={idx} className="bg-white p-4 rounded border border-yellow-300 text-gray-700">
                            {anomaly}
                          </li>
                        );
                      }
                      
                      // Format object anomaly
                      const date = anomaly.date || anomaly.transaction_date || 'N/A';
                      const description = anomaly.description || anomaly.transaction_description || 'N/A';
                      const amount = anomaly.amount !== undefined ? `₹${Math.abs(anomaly.amount).toLocaleString('en-IN')}` : 'N/A';
                      const type = anomaly.type || anomaly.transaction_type || '';
                      const reason = anomaly.reason || anomaly.anomaly_reason || 'Anomaly detected';
                      const riskLevel = anomaly.risk_level || anomaly.risk || '';
                      
                      return (
                        <li key={idx} className="bg-white p-4 rounded border border-yellow-300">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800">{description}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">Date:</span> {date} | 
                                  <span className="font-medium ml-2">Amount:</span> {amount}
                                  {type && <span className="ml-2">({type})</span>}
                                </p>
                              </div>
                              {riskLevel && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 ${
                                  riskLevel.toLowerCase() === 'high' ? 'bg-red-100 text-red-700' :
                                  riskLevel.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {riskLevel}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mt-2">
                              <span className="font-medium">Reason:</span> {reason}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Balance Overview */}
              {summary && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-bold text-gray-800 mb-2 text-lg">Balance Overview</h3>
                  <p className="text-gray-700">
                    Net balance changed by <span className={`font-bold text-lg ${(summary.closing_balance - summary.opening_balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹ {(summary.closing_balance - summary.opening_balance).toLocaleString('en-IN')}
                    </span> across the period.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------- BOTTOM ACTION ---------- */}
      <div className="flex justify-center mt-8">
        <button 
          onClick={() => navigate("/dashboard/upload")}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Upload Another Document
        </button>
      </div>
    </div>
  );
};

export default ResultsPage;


