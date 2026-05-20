import jsPDF from "jspdf"

const BANK_NAME = process.env.REACT_APP_BANK_NAME
const IFSC_CODE = process.env.REACT_APP_IFSC_CODE

// Shared header
function addHeader(doc, title) {
  doc.setFillColor(26, 35, 126)
  doc.rect(0, 0, 210, 28, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(BANK_NAME, 14, 12)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`IFSC: ${IFSC_CODE}`, 14, 20)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(title, 105, 22, { align: "center" })
  doc.setTextColor(0, 0, 0)
}

// Shared footer
function addFooter(doc) {
  const pageHeight = doc.internal.pageSize.height
  doc.setFillColor(26, 35, 126)
  doc.rect(0, pageHeight - 16, 210, 16, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.text(
    `${BANK_NAME} — This is a system generated document`,
    105,
    pageHeight - 6,
    { align: "center" }
  )
  doc.setTextColor(0, 0, 0)
}

// Row helper
function addRow(doc, label, value, y, shade) {
  if (shade) {
    doc.setFillColor(245, 245, 245)
    doc.rect(14, y - 5, 182, 8, "F")
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text(label, 16, y)
  doc.setFont("helvetica", "normal")
  doc.text(String(value), 100, y)
}

// ─── 1. Loan Summary Receipt ──────────────────────────────────────
export function generateLoanReceipt(loan, customer, account) {
  const doc = new jsPDF()
  addHeader(doc, "LOAN SUMMARY RECEIPT")

  // Date
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "long", year: "numeric"
    })}`,
    196, 35, { align: "right" }
  )

  // Customer details section
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(26, 35, 126)
  doc.text("Customer Details", 14, 44)
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(26, 35, 126)
  doc.line(14, 46, 196, 46)

  const customerRows = [
    ["Customer Name",   customer?.fullName || "—"],
    ["Email",           customer?.email    || "—"],
    ["Account Number",  account?.accountNumber || "—"],
    ["Account Type",    account?.accountType   || "—"],
  ]
  customerRows.forEach(([label, value], i) => {
    addRow(doc, label, value, 54 + i * 10, i % 2 === 0)
  })

  // Loan details section
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(26, 35, 126)
  doc.text("Loan Details", 14, 104)
  doc.setTextColor(0, 0, 0)
  doc.line(14, 106, 196, 106)

  const loanTypes = {
    personal:  "Personal Loan",
    home:      "Home Loan",
    car:       "Car Loan",
    education: "Education Loan"
  }

  const loanRows = [
    ["Loan Type",      loanTypes[loan.loanType] || loan.loanType],
    ["Loan Amount",    `Rs. ${(loan.amount / 100).toLocaleString("en-IN")}`],
    ["Interest Rate",  `${loan.interestRate}% p.a.`],
    ["Tenure",         `${loan.tenure} months`],
    ["Monthly EMI",    `Rs. ${(loan.emi / 100).toLocaleString("en-IN")}`],
    ["Purpose",        loan.purpose],
    ["Status",         loan.status.toUpperCase()],
    ["Applied On",     loan.createdAt?.toDate().toLocaleDateString("en-IN") || "—"],
  ]
  loanRows.forEach(([label, value], i) => {
    addRow(doc, label, value, 114 + i * 10, i % 2 === 0)
  })

  // Total repayment box
  const totalRepayment = (loan.emi / 100) * loan.tenure
  doc.setFillColor(232, 245, 233)
  doc.rect(14, 202, 182, 16, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(0, 105, 92)
  doc.text("Total Repayment Amount:", 16, 213)
  doc.text(
    `Rs. ${totalRepayment.toLocaleString("en-IN")}`,
    196, 213, { align: "right" }
  )
  doc.setTextColor(0, 0, 0)

  addFooter(doc)
  doc.save(`Loan_Receipt_${customer?.fullName?.replace(" ", "_")}.pdf`)
}

// ─── 2. Loan Approval Letter ──────────────────────────────────────
export function generateLoanApprovalLetter(loan, customer, account) {
  const doc = new jsPDF()
  addHeader(doc, "LOAN APPROVAL LETTER")

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric"
  })

  doc.setFontSize(9)
  doc.text(`Date: ${today}`, 196, 35, { align: "right" })

  // Address block
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`To,`, 14, 44)
  doc.setFont("helvetica", "bold")
  doc.text(customer?.fullName || "—", 14, 50)
  doc.setFont("helvetica", "normal")
  doc.text(customer?.email || "—", 14, 56)
  doc.text(`Account No: ${account?.accountNumber || "—"}`, 14, 62)

  // Subject
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("Subject: Loan Approval Confirmation", 14, 76)
  doc.setDrawColor(0, 0, 0)
  doc.line(14, 78, 196, 78)

  // Body
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const loanTypes = {
    personal:  "Personal Loan",
    home:      "Home Loan",
    car:       "Car Loan",
    education: "Education Loan"
  }
  const body = [
    `Dear ${customer?.fullName},`,
    "",
    `We are pleased to inform you that your application for a`,
    `${loanTypes[loan.loanType]} has been approved by ${BANK_NAME}.`,
    "",
    `Please find the details of your approved loan below:`,
  ]
  body.forEach((line, i) => {
    doc.text(line, 14, 88 + i * 7)
  })

  // Loan details box
  doc.setFillColor(232, 240, 254)
  doc.rect(14, 134, 182, 60, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  const details = [
    ["Loan Type",     loanTypes[loan.loanType] || loan.loanType],
    ["Loan Amount",   `Rs. ${(loan.amount / 100).toLocaleString("en-IN")}`],
    ["Interest Rate", `${loan.interestRate}% p.a.`],
    ["Tenure",        `${loan.tenure} months`],
    ["Monthly EMI",   `Rs. ${(loan.emi / 100).toLocaleString("en-IN")}`],
  ]
  details.forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold")
    doc.text(label + ":", 20, 144 + i * 10)
    doc.setFont("helvetica", "normal")
    doc.text(value, 100, 144 + i * 10)
  })

  // Closing
  const closing = [
    "",
    "The loan amount has been credited to your account.",
    "Please ensure timely EMI payments to maintain a good credit score.",
    "",
    "For any queries, please contact your branch.",
    "",
    "Yours sincerely,",
    "",
    "",
    BANK_NAME,
    "Loans Department"
  ]
  closing.forEach((line, i) => {
    doc.text(line, 14, 202 + i * 7)
  })

  addFooter(doc)
  doc.save(`Loan_Approval_${customer?.fullName?.replace(" ", "_")}.pdf`)
}

// ─── 3. Transaction Receipt ───────────────────────────────────────
export function generateTransactionReceipt(txn, accountNumber) {
  const doc = new jsPDF()
  addHeader(doc, "TRANSACTION RECEIPT")

  doc.setFontSize(9)
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "long", year: "numeric"
    })}`,
    196, 35, { align: "right" }
  )

  // Status badge
  const isCredit = txn.direction === "credit"
  doc.setFillColor(isCredit ? 232 : 255, isCredit ? 245 : 235, isCredit ? 233 : 238)
  doc.rect(14, 38, 182, 20, "F")
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(isCredit ? 0 : 198, isCredit ? 105 : 40, isCredit ? 92 : 40)
  doc.text(
    `${isCredit ? "+ " : "- "}Rs. ${((txn.amount || 0) / 100).toLocaleString("en-IN")}`,
    105, 52, { align: "center" }
  )
  doc.setTextColor(0, 0, 0)

  // Transaction details
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(26, 35, 126)
  doc.text("Transaction Details", 14, 72)
  doc.setTextColor(0, 0, 0)
  doc.line(14, 74, 196, 74)

  const txnRows = [
    ["Transaction ID",  txn.id || "—"],
    ["Type",            txn.direction === "credit" ? "Credit (Money In)" : "Debit (Money Out)"],
    ["Transfer Type",   txn.type === "interbank" ? "Interbank" : txn.type === "loan_disbursement" ? "Loan Disbursement" : "Intrabank"],
    ["From Account",    txn.fromAccountId || "—"],
    ["To Account",      txn.toAccountId   || "—"],
    ["Mode",            (txn.mode || "internal").toUpperCase()],
    ["Status",          (txn.status || "—").toUpperCase()],
    ["Date",            txn.createdAt?.toDate().toLocaleDateString("en-IN", {
                          day: "2-digit", month: "long", year: "numeric"
                        }) || "—"],
    ["Note",            txn.note || "—"],
  ]
  txnRows.forEach(([label, value], i) => {
    addRow(doc, label, value, 84 + i * 10, i % 2 === 0)
  })

  // Your account
  doc.setFillColor(232, 240, 254)
  doc.rect(14, 182, 182, 12, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Your Account:", 16, 190)
  doc.setFont("helvetica", "normal")
  doc.text(accountNumber || "—", 100, 190)

  addFooter(doc)
  doc.save(`Transaction_${txn.id?.slice(0, 8)}.pdf`)
}