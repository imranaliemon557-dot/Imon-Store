import React, { useState, useMemo } from 'react';
import { ProductItem, StockMovement } from '../types';
import { StorageService } from '../services/storage';
import { formatTaka, toBengaliNumber, formatDhakaDateTime } from '../utils/formatters';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  Barcode,
  History,
  Edit2,
  Trash2,
  Archive,
  RefreshCw,
  X,
  CheckCircle2,
  Camera,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

interface InventoryViewProps {
  products: ProductItem[];
  movements: StockMovement[];
  onRefresh: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  movements,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [selectedProductMovements, setSelectedProductMovements] = useState<ProductItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('পিস');
  const [supplier, setSupplier] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>(5);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (filterLowStock && p.stockQuantity > p.lowStockThreshold) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.supplier.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, filterLowStock, searchQuery]);

  const handleOpenAddModal = (prod?: ProductItem) => {
    if (prod) {
      setEditingProduct(prod);
      setName(prod.name);
      setSku(prod.sku);
      setCostPrice(prod.costPrice);
      setSalePrice(prod.salePrice);
      setStockQuantity(prod.stockQuantity);
      setUnit(prod.unit);
      setSupplier(prod.supplier);
      setLowStockThreshold(prod.lowStockThreshold);
    } else {
      setEditingProduct(null);
      setName('');
      setSku(Math.floor(1000000000 + Math.random() * 9000000000).toString());
      setCostPrice('');
      setSalePrice('');
      setStockQuantity('');
      setUnit('পিস');
      setSupplier('');
      setLowStockThreshold(5);
    }
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || costPrice === '' || salePrice === '' || stockQuantity === '') {
      return;
    }

    StorageService.saveProduct({
      id: editingProduct?.id,
      storeId: 'store_imon_main',
      name: name.trim(),
      sku: sku.trim() || 'NO-SKU',
      costPrice: Number(costPrice),
      salePrice: Number(salePrice),
      stockQuantity: Number(stockQuantity),
      unit: unit.trim() || 'পিস',
      supplier: supplier.trim() || 'সাধারণ সরবরাহকারী',
      lowStockThreshold: Number(lowStockThreshold) || 5,
      isArchived: editingProduct?.isArchived || false,
    });

    setIsAddModalOpen(false);
    onRefresh();
  };

  const handleSimulateScan = (scannedSku: string) => {
    setIsScannerOpen(false);
    setSearchQuery(scannedSku);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>পণ্য স্টক ও ইনভেন্টরি</span>
            <span className="text-xs bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2.5 py-0.5 rounded-full font-semibold">
              {toBengaliNumber(products.length)} টি পণ্য
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            কেনা দাম, বিক্রি দাম, মজুদ ট্র্যাকিং ও কম স্টক সতর্কতা
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Barcode className="w-4 h-4 text-teal-600" />
            <span>বারকোড স্ক্যান</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন পণ্য যোগ</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterLowStock
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>শুধুমাত্র কম স্টক ({toBengaliNumber(products.filter(p => p.stockQuantity <= p.lowStockThreshold).length)})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="পণ্যের নাম, বারকোড বা সাপ্লায়ার..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Product Grid / Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProducts.map(prod => {
          const isLowStock = prod.stockQuantity <= prod.lowStockThreshold;
          const isOutOfStock = prod.stockQuantity <= 0;
          const profit = prod.salePrice - prod.costPrice;
          const marginPercent = Math.round((profit / prod.salePrice) * 100);

          return (
            <div
              key={prod.id}
              className={`p-4 rounded-2xl border shadow-sm transition-all bg-white dark:bg-slate-900 ${
                isOutOfStock
                  ? 'border-rose-300 dark:border-rose-900/60'
                  : isLowStock
                  ? 'border-amber-300 dark:border-amber-900/60'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                    {prod.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku}</span>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                      {prod.supplier}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedProductMovements(prod)}
                    title="স্টক পরিবর্তনের ইতিহাস"
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenAddModal(prod)}
                    title="পণ্য সম্পাদনা"
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Price & Stock Stats */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">কেনা দাম:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{formatTaka(prod.costPrice)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">বিক্রি দাম:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">{formatTaka(prod.salePrice)}</span>
                </div>
              </div>

              {/* Stock Quantity Badge & Profit */}
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isOutOfStock
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : isLowStock
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    <Boxes className="w-3.5 h-3.5" />
                    <span>{toBengaliNumber(prod.stockQuantity)} {prod.unit}</span>
                  </span>
                  {isLowStock && (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      কম স্টক!
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">লাভ/একক:</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatTaka(profit)} ({toBengaliNumber(marginPercent)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock Movements Audit Modal */}
      {selectedProductMovements && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedProductMovements.name} - স্টক লেজার
                  </h3>
                  <p className="text-[11px] text-slate-500">বর্তমান মজুদ: {toBengaliNumber(selectedProductMovements.stockQuantity)} {selectedProductMovements.unit}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProductMovements(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
              {movements.filter(m => m.productId === selectedProductMovements.id).length === 0 ? (
                <p className="text-center py-8 text-slate-400">এই পণ্যের জন্য এখনও কোন স্টক চলাচলের রেকর্ড নেই।</p>
              ) : (
                movements.filter(m => m.productId === selectedProductMovements.id).map(mvt => (
                  <div key={mvt.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${mvt.changeQuantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {mvt.changeQuantity > 0 ? '+' : ''}{toBengaliNumber(mvt.changeQuantity)} {selectedProductMovements.unit}
                        </span>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                          {mvt.reason}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {formatDhakaDateTime(mvt.timestamp)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">আগে: {toBengaliNumber(mvt.previousQuantity)}</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">পরে: {toBengaliNumber(mvt.newQuantity)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedProductMovements(null)}
                className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal Simulation */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">বারকোড স্ক্যানার</h3>
              </div>
              <button onClick={() => setIsScannerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative h-48 bg-slate-950 rounded-2xl flex items-center justify-center overflow-hidden border border-teal-500/50">
              <div className="absolute inset-x-8 top-1/2 h-0.5 bg-rose-500 shadow-md animate-bounce" />
              <Barcode className="w-24 h-24 text-slate-600" />
              <span className="absolute bottom-3 text-[11px] text-teal-300 font-mono">ক্যামেরা সক্রিয়...</span>
            </div>

            <p className="text-xs text-slate-500">পণ্যর গায়ে থাকা বারকোড ক্যামেরার সামনে ধরুন অথবা নিচে থেকে টেস্ট বারকোড বেছে নিন:</p>

            <div className="flex flex-wrap gap-1.5 justify-center">
              {products.slice(0, 4).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSimulateScan(p.sku)}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg font-mono hover:bg-teal-600 hover:text-white transition-colors"
                >
                  {p.name.slice(0, 10)}... ({p.sku})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-teal-600" />
                <span>{editingProduct ? 'পণ্য তথ্য সংশোধন করুন' : 'নতুন পণ্য যুক্ত করুন'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  পণ্যের নাম *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: তীর সয়াবিন তেল ১ লিটার"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    বারকোড / SKU
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    একক (Unit)
                  </label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="পিস">পিস</option>
                    <option value="কেজি">কেজি</option>
                    <option value="গ্রাম">গ্রাম</option>
                    <option value="লিটার">লিটার</option>
                    <option value="প্যাকেট">প্যাকেট</option>
                    <option value="বোতল">বোতল</option>
                    <option value="কার্টুন">কার্টুন</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    কেনা দাম (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="যেমন: ১৭৫"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    বিক্রি দাম (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="যেমন: ১৯০"
                    value={salePrice}
                    onChange={e => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    বর্তমান মজুদ সংখ্যা *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="যেমন: ৫০"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    কম স্টক সতর্কতা সীমা
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="যেমন: ৫"
                    value={lowStockThreshold}
                    onChange={e => setLowStockThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  সরবরাহকারী / কোম্পানি
                </label>
                <input
                  type="text"
                  placeholder="যেমন: মেঘনা গ্রুপ বা স্কয়ার"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
