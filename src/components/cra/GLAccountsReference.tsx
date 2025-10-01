import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const glAccounts = [
  { account: "8000", description: "Salaries (Regular, OT, Salary)", type: "Expense", debitCredit: "Debit" },
  { account: "8010", description: "Bonus & Commission", type: "Expense", debitCredit: "Debit" },
  { account: "8050", description: "Severance", type: "Expense", debitCredit: "Debit" },
  { account: "8055", description: "Vacation Payout", type: "Expense", debitCredit: "Debit" },
  { account: "8030", description: "Benefits (CPP/EI/Tax/EHT)", type: "Expense", debitCredit: "Debit" },
  { account: "8310", description: "Reimbursements (Non-taxable)", type: "Expense", debitCredit: "Debit" },
  { account: "2042", description: "Manulife GRSP/DPSP", type: "Liability", debitCredit: "Credit" },
  { account: "2046", description: "Employee Advances/Misc", type: "Liability", debitCredit: "Credit" },
  { account: "2047", description: "Union Dues/GWL ST/LTD", type: "Liability", debitCredit: "Credit" },
  { account: "0110", description: "Bank - Net Pay", type: "Asset", debitCredit: "Credit" },
];

const companyCodes = [
  { code: "72R", name: "Non-Union + PSAC", province: "ON & some BC" },
  { code: "72S", name: "Union (UNIFOR/PSAC)", province: "ON" },
  { code: "OZC", name: "Kitsault Energy Ltd", province: "BC" },
];

const journalRules = [
  { rule: "Debit", description: "Expense accounts (8000, 8010, 8030, 8050, 8055, 8310)" },
  { rule: "Credit", description: "Bank (0110) and liability accounts (2042, 2046, 2047, CRA remittances)" },
  { rule: "Balance", description: "Total Debit must equal Total Credit for each pay period" },
];

export function GLAccountsReference() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Codes</CardTitle>
          <CardDescription>Three-letter codes identifying each company entity</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Province</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companyCodes.map((company) => (
                <TableRow key={company.code}>
                  <TableCell>
                    <Badge variant="outline">{company.code}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.province}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GL Account Chart</CardTitle>
          <CardDescription>
            Standard account mappings mirroring ADP General Ledger structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Debit/Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {glAccounts.map((account) => (
                <TableRow key={account.account}>
                  <TableCell>
                    <Badge variant="secondary">{account.account}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{account.description}</TableCell>
                  <TableCell>{account.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={account.debitCredit === "Debit" ? "default" : "outline"}
                    >
                      {account.debitCredit}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entry Rules</CardTitle>
          <CardDescription>
            Accounting rules for generating balanced journal entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalRules.map((rule, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Badge>{rule.rule}</Badge>
                  </TableCell>
                  <TableCell>{rule.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Validation Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            ✓ All pay codes must have valid GL accounts assigned
          </p>
          <p className="text-sm">
            ✓ GL export totals must match pay run totals exactly
          </p>
          <p className="text-sm">
            ✓ Debit and credit columns must balance (sum to zero)
          </p>
          <p className="text-sm">
            ✓ Export format: CSV with company_code, employee_id, account, debit, credit, description, pay_date
          </p>
          <p className="text-sm">
            ✓ Cross-check against ADP GL reports for accuracy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
