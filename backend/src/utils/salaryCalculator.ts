/**
 * Deterministic salary component calculator (wireframe rules).
 * Basic = % of monthly wage; HRA = % of Basic; fixed allowances; PF = % of Basic.
 */
export interface SalaryComponentInput {
  name: string;
  basis: 'FIXED' | 'PERCENT_OF_BASIC' | 'PERCENT_OF_WAGE';
  percentage?: number | null;
  amount?: number;
}

export function calculateSalaryComponents(monthlyWage: number) {
  const basicPct = 50;
  const basic = round2((monthlyWage * basicPct) / 100);

  const components: Array<{
    name: string;
    basis: 'FIXED' | 'PERCENT_OF_BASIC';
    percentage: number | null;
    amount: number;
  }> = [
    {
      name: 'Basic Salary',
      basis: 'FIXED',
      percentage: basicPct,
      amount: basic,
    },
    {
      name: 'House Rent Allowance',
      basis: 'PERCENT_OF_BASIC',
      percentage: 50,
      amount: round2(basic * 0.5),
    },
    {
      name: 'Standard Allowance',
      basis: 'FIXED',
      percentage: null,
      amount: 4167,
    },
    {
      name: 'Performance Bonus',
      basis: 'PERCENT_OF_BASIC',
      percentage: 8.33,
      amount: round2(basic * 0.0833),
    },
    {
      name: 'Leave Travel Allowance',
      basis: 'PERCENT_OF_BASIC',
      percentage: 8.33,
      amount: round2(basic * 0.0833),
    },
    {
      name: 'Provident Fund (Employee)',
      basis: 'PERCENT_OF_BASIC',
      percentage: 12,
      amount: round2(basic * 0.12),
    },
    {
      name: 'Provident Fund (Employer)',
      basis: 'PERCENT_OF_BASIC',
      percentage: 12,
      amount: round2(basic * 0.12),
    },
    {
      name: 'Professional Tax',
      basis: 'FIXED',
      percentage: null,
      amount: 200,
    },
  ];

  const sumExceptFixed = components
    .filter((c) => c.name !== 'Fixed Allowance' && c.name !== 'Professional Tax')
    .reduce((s, c) => s + c.amount, 0);

  const fixedAllowance = round2(Math.max(0, monthlyWage - sumExceptFixed));
  components.push({
    name: 'Fixed Allowance',
    basis: 'FIXED',
    percentage: null,
    amount: fixedAllowance,
  });

  const total = components
    .filter((c) => !c.name.includes('Employer') && c.name !== 'Professional Tax')
    .reduce((s, c) => s + c.amount, 0);

  return {
    monthlyWage,
    yearlyWage: round2(monthlyWage * 12),
    components,
    computedTotal: round2(total),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
