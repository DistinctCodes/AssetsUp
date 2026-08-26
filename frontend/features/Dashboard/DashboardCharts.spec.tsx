import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardCharts from './DashboardCharts';

// Mock recharts to avoid issues with canvas/SVG in Jest
jest.mock('recharts', () => ({
  PieChart: () => <div data-testid="pie-chart">PieChart</div>,
  Pie: () => null,
  Cell: () => null,
  BarChart: () => <div data-testid="bar-chart">BarChart</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Legend: () => null,
}));

// Mock data matching useReportsSummary's return type (ReportsSummary)
const mockReportsSummary = {
  total: 25,
  byStatus: {
    active: 15,
    assigned: 8,
    maintenance: 2,
  },
  byCategory: [
    { name: 'Laptops', count: 10 },
    { name: 'Phones', count: 8 },
    { name: 'Furniture', count: 7 },
  ],
  byDepartment: [
    { name: 'Engineering', count: 12 },
    { name: 'Marketing', count: 8 },
    { name: 'Sales', count: 5 },
  ],
  recent: [],
};

describe('DashboardCharts', () => {
  it('renders correctly with the provided data summary', () => {
    render(<DashboardCharts data={mockReportsSummary} />);
    
    // Verify all chart sections are present
    expect(screen.getByText('Status Distribution')).toBeInTheDocument();
    expect(screen.getByText('Assets by Category')).toBeInTheDocument();
    expect(screen.getByText('Assets by Department')).toBeInTheDocument();
    
    // Verify status data is displayed in table toggle view (default is chart, but toggle exists)
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('assigned')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('maintenance')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('toggles to table view when "Show data table" is clicked for status distribution', () => {
    render(<DashboardCharts data={mockReportsSummary} />);
    
    // Find and click the toggle button for status donut
    const toggleButton = screen.getAllByText('Show data table')[0];
    fireEvent.click(toggleButton);
    
    // Verify table is displayed instead of chart
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    
    // Verify button text toggles back to "Show chart"
    expect(screen.getByText('Show chart')).toBeInTheDocument();
  });

  it('toggles to table view when "Show data table" is clicked for category chart', () => {
    render(<DashboardCharts data={mockReportsSummary} />);
    
    // Find and click the toggle button for category bar chart
    const toggleButton = screen.getAllByText('Show data table')[1];
    fireEvent.click(toggleButton);
    
    // Verify table is displayed
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.getByText('Laptops')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows "No category data" message when category data is empty', () => {
    const emptyData = {
      ...mockReportsSummary,
      byCategory: [],
    };
    
    render(<DashboardCharts data={emptyData} />);
    expect(screen.getByText('No category data')).toBeInTheDocument();
  });

  it('shows "No department data" message when department data is empty', () => {
    const emptyData = {
      ...mockReportsSummary,
      byDepartment: [],
    };
    
    render(<DashboardCharts data={emptyData} />);
    expect(screen.getByText('No department data')).toBeInTheDocument();
  });
});