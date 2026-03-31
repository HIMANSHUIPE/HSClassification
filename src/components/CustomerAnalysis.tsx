import React, { useEffect, useState } from 'react';
import { Building2, TrendingUp, Package, AlertCircle } from 'lucide-react';
import { DatabaseService, ClassificationRecord } from '../services/database';

export default function CustomerAnalysis() {
  const [customers, setCustomers] = useState<
    Array<{
      name: string;
      count: number;
      lastClassification: Date;
      topHSCode: string;
    }>
  >([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<ClassificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      setIsLoading(true);
      const { data } = await DatabaseService.getClassifications({ limit: 1000 });

      const customerMap = new Map<
        string,
        {
          count: number;
          lastDate: Date;
          hsCodes: Map<string, number>;
        }
      >();

      data.forEach((record) => {
        if (!record.customer_name) return;

        const existing = customerMap.get(record.customer_name) || {
          count: 0,
          lastDate: new Date(0),
          hsCodes: new Map(),
        };

        existing.count++;
        const recordDate = new Date(record.created_at);
        if (recordDate > existing.lastDate) {
          existing.lastDate = recordDate;
        }

        const currentCount = existing.hsCodes.get(record.hs_code) || 0;
        existing.hsCodes.set(record.hs_code, currentCount + 1);

        customerMap.set(record.customer_name, existing);
      });

      const customerList = Array.from(customerMap.entries()).map(([name, stats]) => {
        const topHSCode = Array.from(stats.hsCodes.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        return {
          name,
          count: stats.count,
          lastClassification: stats.lastDate,
          topHSCode,
        };
      });

      customerList.sort((a, b) => b.count - a.count);
      setCustomers(customerList);
    } catch (error) {
      console.error('Failed to load customer data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerDetails = async (customerName: string) => {
    try {
      const details = await DatabaseService.getClassificationsByCustomer(customerName);
      setCustomerDetails(details);
      setSelectedCustomer(customerName);
    } catch (error) {
      console.error('Failed to load customer details:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
          <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No customer data yet</h3>
        <p className="text-sm text-gray-500">
          Start classifying products with customer names to see analytics here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Customer Analysis</h2>
            <p className="text-sm text-gray-500">Track classification patterns by customer</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-900">Total Customers</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{customers.length}</div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-900">Total Classifications</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {customers.reduce((sum, c) => sum + c.count, 0)}
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-900">Avg per Customer</span>
            </div>
            <div className="text-2xl font-bold text-amber-900">
              {Math.round(customers.reduce((sum, c) => sum + c.count, 0) / customers.length)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Customer List</h3>
          {customers.map((customer) => (
            <button
              key={customer.name}
              onClick={() => loadCustomerDetails(customer.name)}
              className={`w-full p-4 border rounded-lg text-left transition-all hover:border-gray-400 ${
                selectedCustomer === customer.name ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-900">{customer.name}</div>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded border border-blue-200">
                  {customer.count} {customer.count === 1 ? 'classification' : 'classifications'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Most common: {customer.topHSCode}</span>
                <span>Last: {customer.lastClassification.toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedCustomer && customerDetails.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Classification History: {selectedCustomer}
          </h3>
          <div className="space-y-3">
            {customerDetails.map((record) => (
              <div key={record.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-mono font-semibold text-gray-900 mb-1">{record.hs_code}</div>
                    <div className="text-sm text-gray-700">{record.product_name}</div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded border ${
                      record.confidence >= 85
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : record.confidence >= 65
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {record.confidence}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(record.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
