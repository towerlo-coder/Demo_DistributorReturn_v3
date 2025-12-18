import { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Check, 
  AlertTriangle, 
  ArrowLeft, 
  Percent, 
  ShoppingCart, 
  Repeat2, 
  TrendingUp, 
  Grid, 
  List, 
  FileText,
  Package,
  Layers
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// --- 类型定义 (Type Definitions) ---

interface Supplier {
  id: string;
  name: string;
  avgReturnRate: number;
}

interface Transaction {
  id: string;
  supplierId: string;
  type: '采购' | '退货';
  itemCode: string;
  productName: string;
  quantity: number;
  value: number;
  date: string;
  batchId: string;
  batchTotalValue: number;
  batchTotalQty: number;
  confidenceRating?: '低' | '中' | '高';
  approvalStatus?: '待审核' | '自动批准' | '人工已批准';
  returnReason?: string;
  riskDescription?: string;
}

interface AppData {
  suppliers: Supplier[];
  transactions: Transaction[];
}

interface MonthlyData {
  purchaseQty: number;
  returnQty: number;
}

interface ChartDataPoint extends MonthlyData {
  date: string;
  returnRate: number;
}

interface BatchData {
  batchId: string;
  purchaseQty: number;
  purchaseVal: number;
  returnQty: number;
  returnVal: number;
}

interface ProductPivotData {
  itemCode: string;
  productName: string;
  purchaseQty: number;
  purchaseVal: number;
  returnQty: number;
  returnVal: number;
}

interface ProductReturnData {
  itemCode: string;
  productName: string;
  returnQty: number;
  returnRate: number;
}

// --- 模拟数据生成器 (MOCK DATA GENERATOR) ---
const generateMockData = (): AppData => {
  // 修改为分销商名称
  const suppliers: Supplier[] = [
    { id: 'D001', name: '华东医药分销中心', avgReturnRate: 0.015 }, 
    { id: 'D002', name: '北方康健医药渠道', avgReturnRate: 0.04 },
    { id: 'D003', name: '民生连锁大药房', avgReturnRate: 0.07 },
    { id: 'D004', name: '康宁特许经营药店', avgReturnRate: 0.095 },
  ];

  const productCatalog: Record<string, string> = {
    'MED-001': '布洛芬缓释胶囊 (0.3g*24粒)',
    'MED-002': '阿莫西林胶囊 (0.25g*24粒)',
    'MED-003': '维生素C咀嚼片 (100mg*100片)',
    'MED-004': '复方感冒灵颗粒 (10g*9袋)',
    'MED-005': '人工泪液滴眼液 (0.4ml*30支)',
    'MED-006': '医用外科口罩 (独立包装/50只)'
  };

  const itemCodes = Object.keys(productCatalog);
  const transactions: Transaction[] = [];
  let transactionId = 1000;
  
  // 为了清晰起见，我们将为每个分销商生成正好 5 个主要批次
  const batchesPerSupplier = 5;

  suppliers.forEach(supplier => {
    for (let b = 0; b < batchesPerSupplier; b++) {
      // 创建批次 ID (例如: B001-2024-01)
      const month = Math.floor((b / batchesPerSupplier) * 12);
      const year = 2024;
      const batchDate = new Date(year, month, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
      const batchId = `B${supplier.id.slice(-3)}-${year}-${String(month+1).padStart(2,'0')}-${b+1}`;

      // 1. 生成该批次的多笔采购
      const numPurchaseTx = Math.floor(Math.random() * 5) + 1;
      let batchTotalValue = 0;
      let batchTotalQty = 0;

      for (let p = 0; p < numPurchaseTx; p++) {
        const qty = Math.floor(Math.random() * 50) + 10;
        const val = Math.floor(Math.random() * 2000) + 500;
        
        batchTotalValue += val;
        batchTotalQty += qty;

        const itemCode = itemCodes[Math.floor(Math.random() * itemCodes.length)];

        transactions.push({
          id: `T${transactionId++}`,
          supplierId: supplier.id,
          type: '采购', // Purchase
          itemCode: itemCode,
          productName: productCatalog[itemCode],
          quantity: qty,
          value: val,
          date: batchDate,
          batchId: batchId,
          batchTotalValue: 0,
          batchTotalQty: 0
        });
      }

      // 更新该批次中所有采购交易的计算总数以供上下文使用
      transactions.filter(t => t.batchId === batchId).forEach(t => {
        t.batchTotalValue = batchTotalValue;
        t.batchTotalQty = batchTotalQty;
      });

      // 2. 确定该批次的退货
      // 逻辑：以分销商的平均退货率为目标，但每个批次会有所不同
      // *** 强制逻辑：D004 (康宁药店) 的第3个批次 (b===2) 必须有多次退货 ***
      const forceMultipleReturns = (supplier.id === 'D004' && b === 2);
      
      const shouldHaveReturns = forceMultipleReturns || Math.random() < (supplier.avgReturnRate * 8); 
      
      if (shouldHaveReturns) {
        const riskFactor = Math.random();
        let targetReturnVal = 0;
        
        if (riskFactor > 0.9) {
          targetReturnVal = batchTotalValue * (supplier.avgReturnRate * 3); 
        } else {
          targetReturnVal = batchTotalValue * (supplier.avgReturnRate * 0.8);
        }

        if (targetReturnVal > batchTotalValue * 0.3) targetReturnVal = batchTotalValue * 0.3;
        if (targetReturnVal < 50) targetReturnVal = 100; 

        let currentReturnVal = 0;
        // 如果强制多次退货，则设置为 3 笔，否则随机 1-3 笔
        const numReturnTx = forceMultipleReturns ? 3 : (Math.floor(Math.random() * 3) + 1);

        for (let r = 0; r < numReturnTx; r++) {
           if (currentReturnVal >= targetReturnVal && !forceMultipleReturns) break;

           let val = Math.floor(targetReturnVal / numReturnTx);
           // 添加一些随机性
           val = Math.floor(val * (0.8 + Math.random() * 0.4));
           
           // 确保强制退货时有一定金额
           if (forceMultipleReturns && val < 200) val = 350; 

           if (val > (batchTotalValue - currentReturnVal)) val = batchTotalValue * 0.05; 

           const qty = Math.ceil((val / batchTotalValue) * batchTotalQty) || 1; 
           
           currentReturnVal += val;

           // AI 风险逻辑 (AI Risk Logic)
           const batchReturnRate = (currentReturnVal + val) / batchTotalValue; // 累计比率
           let riskLevel: '低' | '中' | '高' = '低';
           let reasons: string[] = [];

           if (batchReturnRate > supplier.avgReturnRate * 2.5) {
             riskLevel = '高'; // High
             reasons.push('批次退货率显著高于平均水平。');
           } else if (batchReturnRate > supplier.avgReturnRate * 1.5) {
             riskLevel = '中'; // Medium
             reasons.push('批次退货率略微偏高。');
           }

           // 检测“拆分退货” (Structuring) - 如果是同一批次的第2笔或更多退货
           if (r >= 1) {
             riskLevel = '中'; // Medium
             reasons.push('单批次内存在多笔退货交易。');
           }

           if (reasons.length === 0) reasons.push('在可接受范围内。');

           const returnDate = new Date(batchDate);
           returnDate.setDate(returnDate.getDate() + Math.floor(Math.random() * 20) + 5);

           const itemCode = itemCodes[Math.floor(Math.random() * itemCodes.length)];

           transactions.push({
            id: `R${transactionId++}`,
            supplierId: supplier.id,
            type: '退货', // Return
            itemCode: itemCode,
            productName: productCatalog[itemCode],
            quantity: qty,
            value: val,
            date: returnDate.toISOString().split('T')[0],
            confidenceRating: riskLevel, 
            approvalStatus: (riskLevel === '中' || riskLevel === '高') ? '待审核' : '自动批准', // Pending Review : Auto-Approved
            batchId: batchId,
            batchTotalValue: batchTotalValue,
            batchTotalQty: batchTotalQty,
            returnReason: Math.random() > 0.5 ? '包装破损' : '效期临近', // Damaged Packaging : Near Expiry
            riskDescription: reasons.join(' ')
          });
        }
      }
    }
  });

  return { suppliers, transactions };
};

const initialData = generateMockData();

// --- 工具函数 (Utility Functions) ---
const formatCurrency = (value: number): string => `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const formatPercentage = (value: number): string => `${(value * 100).toFixed(1)}%`;

const filterTransactionsByYear = (transactions: Transaction[], year: string): Transaction[] => {
  if (year === '全部') return transactions; // All
  const yearStr = String(year);
  return transactions.filter(t => t.date.startsWith(yearStr));
};

const calculateMonthlyReturnRates = (transactions: Transaction[]): ChartDataPoint[] => {
  const monthlyData = transactions.reduce<Record<string, MonthlyData>>((acc, t) => {
    const monthYear = t.date.substring(0, 7); // YYYY-MM
    if (!acc[monthYear]) {
      acc[monthYear] = { purchaseQty: 0, returnQty: 0 };
    }
    if (t.type === '采购') {
      acc[monthYear].purchaseQty += t.quantity;
    } else if (t.type === '退货') {
      acc[monthYear].returnQty += t.quantity;
    }
    return acc;
  }, {});

  return Object.keys(monthlyData)
    .sort()
    .map(key => ({
      date: key.substring(2, 7), // YY-MM
      ...monthlyData[key],
      returnRate: monthlyData[key].purchaseQty > 0 ? monthlyData[key].returnQty / monthlyData[key].purchaseQty : 0
    }));
};

const calculateTopReturnedProducts = (transactions: Transaction[]): ProductReturnData[] => {
  const productStats = transactions.reduce<Record<string, { qty: number, name: string }>>((acc, t) => {
    if (t.type === '退货') {
      if (!acc[t.itemCode]) {
        acc[t.itemCode] = { qty: 0, name: t.productName };
      }
      acc[t.itemCode].qty += t.quantity;
    }
    return acc;
  }, {});

  return Object.keys(productStats)
    .map(code => ({
      itemCode: code,
      productName: productStats[code].name,
      returnQty: productStats[code].qty,
      returnRate: 0 // Placeholder as calculation across mixed batches is complex for demo
    }))
    .sort((a, b) => b.returnQty - a.returnQty)
    .slice(0, 5);
};

// --- 组件 (Components) ---

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => (
  <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100 transition-all hover:shadow-xl">
    <div className={`flex items-center justify-between`}>
      <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

interface YearSelectorProps {
  selectedYear: string;
  onSelectYear: (year: string) => void;
}

const YearSelector = ({ selectedYear, onSelectYear }: YearSelectorProps) => {
  const years = ['全部', '2024', '2023']; // All
  return (
    <div className="flex items-center space-x-2">
      <label className="text-gray-600 text-sm font-medium">关注时段:</label>
      {years.map(year => (
        <button
          key={year}
          onClick={() => onSelectYear(year)}
          className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors duration-150 ${
            selectedYear === year
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  );
};

interface ReturnRateChartProps {
  transactions: Transaction[];
  title: string;
}

// 带平均线的折线图
const ReturnRateOverTimeChart = ({ transactions, title }: ReturnRateChartProps) => {
  const monthlyData = calculateMonthlyReturnRates(transactions);
  if (monthlyData.length === 0) return <div className="p-4 text-center text-gray-500">无图表数据。</div>;

  // 计算平均比率 (基于数量)
  const totalPurchaseQty = transactions.filter(t => t.type === '采购').reduce((sum, t) => sum + t.quantity, 0);
  const totalReturnQty = transactions.filter(t => t.type === '退货').reduce((sum, t) => sum + t.quantity, 0);
  const avgRate = totalPurchaseQty > 0 ? totalReturnQty / totalPurchaseQty : 0;

  // 常量
  const POINT_SPACING = 60;
  const SVG_WIDTH = Math.max(monthlyData.length * POINT_SPACING, 600);
  const SVG_HEIGHT = 200;
  const CHART_HEIGHT = 180;
  const X_OFFSET = POINT_SPACING / 2;

  const maxRate = Math.max(...monthlyData.map(d => d.returnRate), avgRate * 1.5, 0.1); 
  const rateScale = (rate: number) => (rate / (maxRate * 1.1 || 1)) * CHART_HEIGHT;

  const points = monthlyData.map((d, index) => {
    const x = index * POINT_SPACING + X_OFFSET;
    const y = CHART_HEIGHT - rateScale(d.returnRate);
    return `${x},${y}`;
  }).join(' ');

  const avgLineY = CHART_HEIGHT - rateScale(avgRate);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center justify-between">
        <span className="flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-indigo-500" /> {title}</span>
        <span className="text-sm font-normal text-gray-500">平均退货率 (数量): <span className="font-bold text-gray-800">{formatPercentage(avgRate)}</span></span>
      </h2>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${SVG_WIDTH + POINT_SPACING} ${SVG_HEIGHT}`} className="w-full h-48" preserveAspectRatio="none">
          {/* Y轴线 */}
          <line x1="0" y1={CHART_HEIGHT} x2={SVG_WIDTH + POINT_SPACING} y2={CHART_HEIGHT} stroke="#E5E7EB" />
          
          {/* 平均线 */}
          <line x1="0" y1={avgLineY} x2={SVG_WIDTH + POINT_SPACING} y2={avgLineY} stroke="#9CA3AF" strokeWidth="2" strokeDasharray="5 5" />
          <text x={SVG_WIDTH + POINT_SPACING - 10} y={avgLineY - 5} textAnchor="end" fontSize="10" fill="#6B7280" fontStyle="italic">平均: {formatPercentage(avgRate)}</text>

          {/* 数据线 */}
          <polyline fill="none" stroke="#4F46E5" strokeWidth="3" points={points} />

          {/* 数据点 */}
          {monthlyData.map((d, index) => {
            const x = index * POINT_SPACING + X_OFFSET;
            const y = CHART_HEIGHT - rateScale(d.returnRate);
            const color = d.returnRate > avgRate * 1.5 ? '#EF4444' : d.returnRate > avgRate ? '#FBBF24' : '#10B981';

            return (
              <g key={d.date}>
                <circle cx={x} cy={y} r="5" fill={color} stroke="#fff" strokeWidth="2" />
                <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#374151" fontWeight="bold">
                  {formatPercentage(d.returnRate)}
                </text>
                <text x={x} y="195" textAnchor="middle" fontSize="10" fill="#6B7280">{d.date}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

interface TopProductsProps {
  transactions: Transaction[];
  selectedProductCode: string | null;
  onSelectProduct: (code: string) => void;
}

const TopProductsChart = ({ transactions, selectedProductCode, onSelectProduct }: TopProductsProps) => {
  const topProducts = calculateTopReturnedProducts(transactions);
  
  if (topProducts.length === 0) return <div className="p-4 text-center text-gray-500">无产品数据</div>;

  const maxQty = Math.max(...topProducts.map(p => p.returnQty));

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <Package className="w-5 h-5 mr-2 text-indigo-500" /> 
        热门退货产品 (Top 5)
      </h2>
      <p className="text-xs text-gray-500 mb-4">点击产品可查看具体趋势</p>
      <div className="space-y-4">
        {topProducts.map((p, i) => (
          <div 
            key={p.itemCode}
            onClick={() => onSelectProduct(p.itemCode)}
            className={`cursor-pointer p-2 rounded-lg transition-colors ${
              selectedProductCode === p.itemCode ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between text-sm mb-1">
              <span className={`font-medium ${selectedProductCode === p.itemCode ? 'text-indigo-700' : 'text-gray-700'}`}>
                {i + 1}. {p.productName} <span className="text-xs text-gray-400">({p.itemCode})</span>
              </span>
              <span className="font-bold text-red-600">{p.returnQty} 件</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div 
                className={`${selectedProductCode === p.itemCode ? 'bg-indigo-600' : 'bg-indigo-400'} h-2.5 rounded-full transition-all`}
                style={{ width: `${(p.returnQty / maxQty) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface SupplierListProps {
  data: AppData;
  onSelectSupplier: (id: string) => void;
  filteredTransactions: Transaction[];
}

const SupplierList = ({ data, onSelectSupplier, filteredTransactions }: SupplierListProps) => {
  // 预先计算并排序数据
  const sortedSuppliers = useMemo(() => {
    return data.suppliers.map(supplier => {
      const supplierTransactions = filteredTransactions.filter(t => t.supplierId === supplier.id);
      
      const totalPurchaseQty = supplierTransactions.filter(t => t.type === '采购').reduce((sum, t) => sum + t.quantity, 0);
      const totalPurchaseVal = supplierTransactions.filter(t => t.type === '采购').reduce((sum, t) => sum + t.value, 0);
      
      const totalReturnQty = supplierTransactions.filter(t => t.type === '退货').reduce((sum, t) => sum + t.quantity, 0);
      const totalReturnVal = supplierTransactions.filter(t => t.type === '退货').reduce((sum, t) => sum + t.value, 0);
      
      const returnPercentage = totalPurchaseQty > 0 ? totalReturnQty / totalPurchaseQty : 0;
      const pendingApprovals = supplierTransactions.filter(t => t.approvalStatus === '待审核').length;

      return {
        supplier,
        totalPurchaseQty,
        totalPurchaseVal,
        totalReturnQty,
        totalReturnVal,
        returnPercentage,
        pendingApprovals
      };
    }).sort((a, b) => b.returnPercentage - a.returnPercentage); // 按退货率从高到低排序
  }, [data.suppliers, filteredTransactions]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">分销商退货汇总</h2>
      <div className="overflow-x-auto flex-grow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分销商</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">采购</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">退货</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">退货率 (数量)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">人工审批</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedSuppliers.map(({ supplier, totalPurchaseQty, totalPurchaseVal, totalReturnQty, totalReturnVal, returnPercentage, pendingApprovals }) => {
              return (
                <tr key={supplier.id} className="hover:bg-gray-50 transition duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="font-semibold text-gray-800">{totalPurchaseQty}</span> <span className="text-xs text-gray-400">({formatCurrency(totalPurchaseVal)})</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="font-semibold text-gray-800">{totalReturnQty}</span> <span className="text-xs text-gray-400">({formatCurrency(totalReturnVal)})</span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${returnPercentage > 0.08 ? 'text-red-500' : 'text-gray-700'}`}>
                    {formatPercentage(returnPercentage)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${pendingApprovals > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                    {pendingApprovals}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onSelectSupplier(supplier.id)}
                      className="text-indigo-600 hover:text-indigo-900 font-semibold transition duration-150"
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface DashboardViewProps {
  data: AppData;
  onSelectSupplier: (id: string) => void;
  selectedYear: string;
  onSelectYear: (year: string) => void;
}

const DashboardView = ({ data, onSelectSupplier, selectedYear, onSelectYear }: DashboardViewProps) => {
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => filterTransactionsByYear(data.transactions, selectedYear), [data.transactions, selectedYear]);

  // Compute transactions for the trend chart.
  // If a product is selected, filter by that product from ALL transactions (to show history),
  // or you could filter from `filteredTransactions` if you only want to show the selected year's trend.
  // Standard pattern: if I select a product from a "2024" list, I might want to see its performance in 2024.
  // Let's stick to the selected year context for consistency with the filter.
  // If the user wants to see all history, they select "All" in the year filter.
  const chartTransactions = useMemo(() => {
    if (!selectedProductCode) {
      // Show data based on the year selector (all products)
      // Note: The previous code passed `data.transactions` (all time) to the chart regardless of year selector.
      // To preserve that behavior for the "Overall" view but allow filtering by product:
      // If we want the chart to react to the Year filter too (which is better UX), we should use `filteredTransactions`.
      // However, the prompt specifically asked for product filtering.
      // Let's use `data.transactions` as base to keep the "Overall History" view,
      // but filter by product if selected.
      return data.transactions; 
    }
    return data.transactions.filter(t => t.itemCode === selectedProductCode);
  }, [data.transactions, selectedProductCode]);

  const chartTitle = selectedProductCode 
    ? `${data.transactions.find(t => t.itemCode === selectedProductCode)?.productName || '产品'} 退货率趋势 (按数量)`
    : "整体退货率趋势 (按产品数量)";

  const handleProductSelect = (code: string) => {
    if (selectedProductCode === code) {
      setSelectedProductCode(null);
    } else {
      setSelectedProductCode(code);
    }
  };

  const totalPurchaseQty = filteredTransactions.filter(t => t.type === '采购').reduce((sum, t) => sum + t.quantity, 0);
  const totalReturnQty = filteredTransactions.filter(t => t.type === '退货').reduce((sum, t) => sum + t.quantity, 0);
  const returnPercentage = totalPurchaseQty > 0 ? totalReturnQty / totalPurchaseQty : 0;
  
  const totalSuppliers = data.suppliers.length;
  const totalPending = filteredTransactions.filter(t => t.approvalStatus === '待审核').length;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <LayoutDashboard className="w-8 h-8 mr-3 text-indigo-600" />
          AI 退货审批仪表盘
        </h1>
        <YearSelector selectedYear={selectedYear} onSelectYear={onSelectYear} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-8">
        <StatCard title="分销商总数" value={totalSuppliers} icon={Users} color="text-blue-500" />
        <StatCard title="采购总数量" value={totalPurchaseQty.toLocaleString()} icon={ShoppingCart} color="text-indigo-500" />
        <StatCard title="退货总数量" value={totalReturnQty.toLocaleString()} icon={Repeat2} color="text-red-500" />
        <StatCard title="退货率 (按数量)" value={formatPercentage(returnPercentage)} icon={Percent} color="text-pink-500" />
        <StatCard title="待人工审批" value={totalPending} icon={AlertTriangle} color="text-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <ReturnRateOverTimeChart
            transactions={chartTransactions}
            title={chartTitle}
          />
        </div>
        <div className="lg:col-span-1">
          <TopProductsChart 
            transactions={filteredTransactions} 
            selectedProductCode={selectedProductCode}
            onSelectProduct={handleProductSelect}
          />
        </div>
      </div>

      <SupplierList
        data={data}
        onSelectSupplier={onSelectSupplier}
        filteredTransactions={filteredTransactions}
      />
    </div>
  );
};

// --- 供应商详情组件 (Supplier Detail Components) ---

const ConfidenceBadge = ({ rating }: { rating: string }) => {
  let color = 'bg-gray-200 text-gray-800';
  if (rating === '低') color = 'bg-green-100 text-green-800';
  if (rating === '中') color = 'bg-yellow-100 text-yellow-800';
  if (rating === '高') color = 'bg-red-100 text-red-800';
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${color}`}>
      {rating}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  let color = 'bg-gray-200 text-gray-800';
  let Icon = Grid;
  if (status === '自动批准' || status === '人工已批准') {
    color = 'bg-green-100 text-green-800';
    Icon = Check;
  } else if (status === '待审核') {
    color = 'bg-red-100 text-red-800 animate-pulse';
    Icon = AlertTriangle;
  }
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded flex items-center justify-center ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </span>
  );
};

interface TypeFilterProps {
  selectedType: string;
  onSelectType: (type: string) => void;
}

const TypeFilter = ({ selectedType, onSelectType }: TypeFilterProps) => {
  const types = ['全部', '采购', '退货'];
  return (
    <div className="flex space-x-2">
      {types.map(type => (
        <button
          key={type}
          onClick={() => onSelectType(type)}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors duration-150 flex items-center ${
            selectedType === type
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
};

interface TransactionLogViewProps {
  transactions: Transaction[];
  onApprove: (id: string) => void;
}

const TransactionLogView = ({ transactions, onApprove }: TransactionLogViewProps) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / 批次</th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期 / 类型</th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">产品 (SKU)</th>
          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            数量 | 金额 <br/> <span className="text-gray-400">批次总计</span>
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">AI 退货风险评分</th>
          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {transactions.map((t) => {
          const isReturn = t.type === '退货';
          const requiresReview = isReturn && t.approvalStatus === '待审核';

          return (
            <tr key={t.id} className={`hover:bg-gray-50 transition duration-150 ${requiresReview ? 'bg-red-50' : ''}`}>
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {t.id} <br /><span className="text-xs text-gray-500">{t.batchId}</span>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm">
                <span className="text-gray-500">{t.date}</span>
                <br />
                <span className={`text-xs font-semibold ${isReturn ? 'text-red-700' : 'text-blue-700'}`}>{t.type}</span>
              </td>
              <td className="px-3 py-4 text-sm text-gray-700">
                <div className="font-medium">{t.productName}</div>
                <div className="text-xs text-gray-500">{t.itemCode}</div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-mono">
                <div>
                   <span className="font-semibold text-gray-700">{t.quantity}</span> 
                   <span className="text-gray-400 mx-1">|</span> 
                   <span className={isReturn ? "text-red-600 font-bold" : "text-gray-900"}>{formatCurrency(t.value)}</span>
                </div>
                <div className="text-xs text-gray-400 border-t border-gray-200 pt-1 mt-1">
                   {isReturn ? (
                       <>
                        <div>批次数量: {t.batchTotalQty} <span className="text-red-400 font-semibold">({formatPercentage(t.batchTotalQty > 0 ? t.quantity / t.batchTotalQty : 0)})</span></div>
                        <div>批次金额: {formatCurrency(t.batchTotalValue)}</div>
                       </>
                   ) : (
                       <span>批次金额: {formatCurrency(t.batchTotalValue)}</span>
                   )}
                </div>
              </td>

              <td className="px-3 py-4 text-sm text-gray-700">
                {isReturn ? (
                  <div className="flex flex-col items-start space-y-1">
                    <div className="flex items-center space-x-2">
                       <ConfidenceBadge rating={t.confidenceRating || '低'} />
                       <span className="text-xs text-gray-500 italic">({t.returnReason})</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-snug bg-white/50 p-1 rounded border border-gray-100">
                      <FileText className="w-3 h-3 inline mr-1 text-indigo-400" />
                      {t.riskDescription}
                    </p>
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs italic">标准采购</span>
                )}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-center">
                {isReturn ? <StatusBadge status={t.approvalStatus || '自动批准'} /> : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-center">
                {requiresReview ? (
                  <button
                    onClick={() => onApprove(t.id)}
                    className="bg-indigo-600 text-white px-3 py-1 text-xs rounded-lg hover:bg-indigo-700 transition duration-150 shadow-md hover:shadow-lg"
                  >
                    批准
                  </button>
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const BatchPivotView = ({ transactions }: { transactions: Transaction[] }) => {
  const batchData = transactions.reduce<Record<string, BatchData>>((acc, t) => {
    if (!acc[t.batchId]) {
      acc[t.batchId] = { batchId: t.batchId, purchaseQty: 0, purchaseVal: 0, returnQty: 0, returnVal: 0 };
    }
    if (t.type === '采购') {
      acc[t.batchId].purchaseQty += t.quantity;
      acc[t.batchId].purchaseVal += t.value;
    } else if (t.type === '退货') {
      acc[t.batchId].returnQty += t.quantity;
      acc[t.batchId].returnVal += t.value;
    }
    return acc;
  }, {});

  const pivotTableData = Object.values(batchData).map((d: BatchData) => ({
    ...d,
    returnRate: d.purchaseQty > 0 ? d.returnQty / d.purchaseQty : 0
  })).sort((a, b) => b.returnRate - a.returnRate);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">批次 ID</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">采购 <br/> (数量 | 金额)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">退货 <br/> (数量 | 金额)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-red-600 uppercase tracking-wider">退货率 (数量)</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {pivotTableData.map((d) => (
            <tr key={d.batchId} className={`hover:bg-gray-50 transition duration-150 ${d.returnRate > 0.09 ? 'bg-red-50' : ''}`}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.batchId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                 <span className="font-semibold text-gray-700">{d.purchaseQty}</span> <span className="text-gray-400 mx-1">|</span> {formatCurrency(d.purchaseVal)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                 <span className="font-semibold text-gray-700">{d.returnQty}</span> <span className="text-gray-400 mx-1">|</span> {formatCurrency(d.returnVal)}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${d.returnRate > 0.09 ? 'text-red-500' : 'text-gray-700'}`}>
                {formatPercentage(d.returnRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ProductPivotView = ({ transactions }: { transactions: Transaction[] }) => {
  const productData = transactions.reduce<Record<string, ProductPivotData>>((acc, t) => {
    if (!acc[t.itemCode]) {
      acc[t.itemCode] = { 
        itemCode: t.itemCode, 
        productName: t.productName,
        purchaseQty: 0, 
        purchaseVal: 0, 
        returnQty: 0, 
        returnVal: 0 
      };
    }
    if (t.type === '采购') {
      acc[t.itemCode].purchaseQty += t.quantity;
      acc[t.itemCode].purchaseVal += t.value;
    } else if (t.type === '退货') {
      acc[t.itemCode].returnQty += t.quantity;
      acc[t.itemCode].returnVal += t.value;
    }
    return acc;
  }, {});

  const pivotTableData = Object.values(productData).map((d) => ({
    ...d,
    returnRate: d.purchaseQty > 0 ? d.returnQty / d.purchaseQty : 0
  })).sort((a, b) => b.returnRate - a.returnRate);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">产品 (SKU)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">采购 <br/> (数量 | 金额)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">退货 <br/> (数量 | 金额)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-red-600 uppercase tracking-wider">退货率 (数量)</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {pivotTableData.map((d) => (
            <tr key={d.itemCode} className={`hover:bg-gray-50 transition duration-150 ${d.returnRate > 0.09 ? 'bg-red-50' : ''}`}>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                <div>{d.productName}</div>
                <div className="text-xs text-gray-500">{d.itemCode}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                 <span className="font-semibold text-gray-700">{d.purchaseQty}</span> <span className="text-gray-400 mx-1">|</span> {formatCurrency(d.purchaseVal)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                 <span className="font-semibold text-gray-700">{d.returnQty}</span> <span className="text-gray-400 mx-1">|</span> {formatCurrency(d.returnVal)}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${d.returnRate > 0.09 ? 'text-red-500' : 'text-gray-700'}`}>
                {formatPercentage(d.returnRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface SupplierDetailViewProps {
  supplierId: string;
  data: AppData;
  onGoBack: () => void;
  onApprove: (id: string) => void;
}

const SupplierDetailView = ({ supplierId, data, onGoBack, onApprove }: SupplierDetailViewProps) => {
  const [detailView, setDetailView] = useState<'Log' | 'Batch' | 'Product'>('Log');
  const [selectedType, setSelectedType] = useState('退货');
  
  const supplier = data.suppliers.find(s => s.id === supplierId);
  
  const allSupplierTransactions = useMemo(() => {
     return data.transactions
      .filter(t => t.supplierId === supplierId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.transactions, supplierId]);

  const filteredTransactions = useMemo(() => {
    if (selectedType === '全部') return allSupplierTransactions;
    return allSupplierTransactions.filter(t => t.type === selectedType);
  }, [allSupplierTransactions, selectedType]);


  if (!supplier) return <p className="p-8 text-red-500">未找到分销商。</p>;

  return (
    <div className="p-8">
      <button
        onClick={onGoBack}
        className="text-indigo-600 hover:text-indigo-800 font-medium mb-6 flex items-center transition duration-150"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        返回仪表盘
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{supplier.name} ({supplierId})</h1>
      <p className="text-gray-500 mb-8">详细交易历史、批次分析和 AI 风险评估。</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-3">
          <ReturnRateOverTimeChart
            transactions={allSupplierTransactions}
            title={`${supplier.name} 退货率趋势 (按数量)`}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-4 space-y-3 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-800">交易数据</h2>
          <div className="flex space-x-4 items-center">
            {detailView === 'Log' && <TypeFilter selectedType={selectedType} onSelectType={setSelectedType} />}
            <div className="flex space-x-2 border-l pl-4">
              <button
                onClick={() => setDetailView('Log')}
                className={`px-3 py-1 text-sm font-medium rounded-lg flex items-center transition-colors ${
                  detailView === 'Log' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <List className="w-4 h-4 mr-1" /> 日志视图
              </button>
              <button
                onClick={() => setDetailView('Batch')}
                className={`px-3 py-1 text-sm font-medium rounded-lg flex items-center transition-colors ${
                  detailView === 'Batch' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Grid className="w-4 h-4 mr-1" /> 批次透视
              </button>
              <button
                onClick={() => setDetailView('Product')}
                className={`px-3 py-1 text-sm font-medium rounded-lg flex items-center transition-colors ${
                  detailView === 'Product' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Layers className="w-4 h-4 mr-1" /> 产品透视
              </button>
            </div>
          </div>
        </div>

        {detailView === 'Log' && (
          <TransactionLogView transactions={filteredTransactions} onApprove={onApprove} />
        )}
        {detailView === 'Batch' && (
          <BatchPivotView transactions={allSupplierTransactions} />
        )}
        {detailView === 'Product' && (
          <ProductPivotView transactions={allSupplierTransactions} />
        )}
      </div>
    </div>
  );
};


const App = () => {
  const [currentPage, setCurrentPage] = useState<'Dashboard' | 'SupplierDetail'>('Dashboard');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [appData, setAppData] = useState<AppData>(initialData);
  const [selectedYear, setSelectedYear] = useState('全部');

  const handleSelectSupplier = (id: string) => {
    setSelectedSupplierId(id);
    setCurrentPage('SupplierDetail');
  };

  const handleGoBack = () => {
    setCurrentPage('Dashboard');
    setSelectedSupplierId(null);
  };

  const handleApproveTransaction = (transactionId: string) => {
    const newTransactions = appData.transactions.map(t => {
      if (t.id === transactionId && t.approvalStatus === '待审核') {
        return { ...t, approvalStatus: '人工已批准' as const };
      }
      return t;
    });

    setAppData(prevData => ({
      ...prevData,
      transactions: newTransactions,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans antialiased">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-2xl min-h-[80vh]">
          {currentPage === 'Dashboard' && (
            <DashboardView
              data={appData}
              onSelectSupplier={handleSelectSupplier}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
            />
          )}

          {currentPage === 'SupplierDetail' && selectedSupplierId && (
            <SupplierDetailView
              supplierId={selectedSupplierId}
              data={appData}
              onGoBack={handleGoBack}
              onApprove={handleApproveTransaction}
            />
          )}
        </div>
      </div>
      <footer className="py-4 text-center text-gray-500 text-sm">
        AI 演示案例 | 信用评级审批工作流
      </footer>
    </div>
  );
};

export default App;
