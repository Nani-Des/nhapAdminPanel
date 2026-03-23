import React, { useEffect, useMemo, useState } from 'react';
import { Package, Plus, Trash2, Search } from 'lucide-react';
import { useHospital } from '../contexts/HospitalContext';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { HospitalEquipment } from '../types';
import { toast } from 'react-hot-toast';
import { EQUIPMENT_CATALOG } from '../data/equipmentCatalog';

const EquipmentPage: React.FC = () => {
  const { hospital } = useHospital();
  const [items, setItems] = useState<HospitalEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [addMode, setAddMode] = useState<'catalog' | 'custom'>('catalog');

  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customQuantity, setCustomQuantity] = useState('1');
  const [customNotes, setCustomNotes] = useState('');

  const categoryOptions = useMemo(
    () => [...EQUIPMENT_CATALOG.map((c) => c.category), 'Other'],
    []
  );

  useEffect(() => {
    if (!hospital?.id) {
      setLoading(false);
      setItems([]);
      return;
    }

    setLoading(true);
    const ref = collection(db, 'Hospital', hospital.id, 'Equipment');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const list: HospitalEquipment[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name ?? ''),
            category: String(data.category ?? 'Uncategorised'),
            quantity: typeof data.quantity === 'number' ? data.quantity : Number(data.quantity) || 1,
            notes: data.notes ? String(data.notes) : undefined,
            fromCatalog: data.fromCatalog === true,
            createdAt: data.createdAt,
          };
        });
        list.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.error('Equipment snapshot error:', err);
        toast.error('Failed to load equipment');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [hospital?.id]);

  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => s.add(`${i.category}::${i.name}`.toLowerCase()));
    return s;
  }, [items]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return EQUIPMENT_CATALOG;
    return EQUIPMENT_CATALOG.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (name) =>
          name.toLowerCase().includes(q) || cat.category.toLowerCase().includes(q)
      ),
    })).filter((c) => c.items.length > 0);
  }, [catalogSearch]);

  const addFromCatalog = async (category: string, name: string) => {
    if (!hospital?.id) {
      toast.error('No hospital selected');
      return;
    }
    const key = `${category}::${name}`.toLowerCase();
    if (existingKeys.has(key)) {
      toast.error('This equipment is already in the register');
      return;
    }
    try {
      await addDoc(collection(db, 'Hospital', hospital.id, 'Equipment'), {
        name,
        category,
        quantity: 1,
        fromCatalog: true,
        createdAt: serverTimestamp(),
      });
      toast.success('Equipment added');
    } catch (e) {
      console.error(e);
      toast.error('Could not add equipment');
    }
  };

  const submitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital?.id) {
      toast.error('No hospital selected');
      return;
    }
    const name = customName.trim();
    const category = (customCategory || 'Other').trim();
    if (!name) {
      toast.error('Equipment name is required');
      return;
    }
    const qty = Math.max(1, parseInt(customQuantity, 10) || 1);
    const key = `${category}::${name}`.toLowerCase();
    if (existingKeys.has(key)) {
      toast.error('Same name and category already exists');
      return;
    }
    try {
      await addDoc(collection(db, 'Hospital', hospital.id, 'Equipment'), {
        name,
        category,
        quantity: qty,
        notes: customNotes.trim() || undefined,
        fromCatalog: false,
        createdAt: serverTimestamp(),
      });
      toast.success('Equipment added');
      setCustomName('');
      setCustomCategory('');
      setCustomQuantity('1');
      setCustomNotes('');
      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Could not add equipment');
    }
  };

  const confirmDelete = async () => {
    if (!hospital?.id || !deleteId) return;
    try {
      await deleteDoc(doc(db, 'Hospital', hospital.id, 'Equipment', deleteId));
      toast.success('Equipment removed');
      setIsDeleteOpen(false);
      setDeleteId(null);
    } catch (e) {
      console.error(e);
      toast.error('Could not remove equipment');
    }
  };

  const grouped = useMemo(() => {
    const m = new Map<string, HospitalEquipment[]>();
    items.forEach((i) => {
      const c = i.category || 'Uncategorised';
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(i);
    });
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  if (!hospital?.id) {
    return (
      <Layout>
        <div className="p-6 text-teal-800">Select a hospital to manage equipment.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-teal-900 flex items-center gap-2">
              <Package className="w-8 h-8" />
              Equipment register
            </h1>
            <p className="text-teal-700 mt-1">
              Track diagnostic, lab, theatre, and other equipment for this hospital. This complements
              the Services tab and can feed future capability checks (e.g. diagnostic tool).
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setAddMode('catalog');
              setCatalogSearch('');
              setIsAddOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add equipment
          </Button>
        </div>

        <Card className="border-teal-200 bg-white/90">
          <CardHeader>
            <CardTitle className="text-teal-900">Registered equipment</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <p className="text-teal-600 py-8 text-center">
                No equipment yet. Add items from the catalog or create custom entries.
              </p>
            ) : (
              <div className="space-y-8">
                {grouped.map(([category, rows]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-teal-800 uppercase tracking-wide mb-3">
                      {category}
                    </h3>
                    <ul className="divide-y divide-teal-100 rounded-lg border border-teal-100 overflow-hidden">
                      {rows.map((row) => (
                        <li
                          key={row.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 bg-teal-50/50"
                        >
                          <div>
                            <span className="font-medium text-teal-900">{row.name}</span>
                            {row.notes ? (
                              <p className="text-sm text-teal-600 mt-0.5">{row.notes}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-teal-700 whitespace-nowrap">
                              Qty: <strong>{row.quantity}</strong>
                            </span>
                            <button
                              type="button"
                              aria-label={`Remove ${row.name}`}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              onClick={() => {
                                setDeleteId(row.id!);
                                setIsDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add equipment">
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={addMode === 'catalog' ? 'primary' : 'secondary'}
              className={addMode === 'catalog' ? 'bg-teal-600' : ''}
              onClick={() => setAddMode('catalog')}
            >
              From catalog
            </Button>
            <Button
              type="button"
              variant={addMode === 'custom' ? 'primary' : 'secondary'}
              className={addMode === 'custom' ? 'bg-teal-600' : ''}
              onClick={() => setAddMode('custom')}
            >
              Custom
            </Button>
          </div>

          {addMode === 'catalog' ? (
            <div className="max-h-[60vh] overflow-y-auto space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500" />
                <input
                  type="search"
                  placeholder="Search catalog…"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-teal-200 rounded-lg bg-teal-50/50 text-teal-900"
                />
              </div>
              {filteredCatalog.map((cat) => (
                <div key={cat.category}>
                  <h4 className="text-xs font-semibold text-teal-700 mb-2">{cat.category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map((name) => {
                      const dup = existingKeys.has(`${cat.category}::${name}`.toLowerCase());
                      return (
                        <button
                          key={name}
                          type="button"
                          disabled={dup}
                          title={dup ? 'Already added' : 'Add to register'}
                          onClick={() => addFromCatalog(cat.category, name)}
                          className={`text-left text-sm px-3 py-1.5 rounded-full border transition-colors ${
                            dup
                              ? 'border-teal-100 text-teal-400 cursor-not-allowed'
                              : 'border-teal-200 text-teal-800 hover:bg-teal-100'
                          }`}
                        >
                          + {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={submitCustom} className="space-y-4">
              <Input
                label="Equipment name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                className="bg-teal-50 border-teal-200"
              />
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Category</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full border border-teal-200 rounded-lg px-3 py-2 bg-teal-50 text-teal-900"
                >
                  <option value="">Select category…</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Quantity"
                type="number"
                min={1}
                value={customQuantity}
                onChange={(e) => setCustomQuantity(e.target.value)}
                className="bg-teal-50 border-teal-200"
              />
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Notes (optional)</label>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-teal-200 rounded-lg px-3 py-2 bg-teal-50 text-teal-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
                  Save
                </Button>
              </div>
            </form>
          )}
        </Modal>

        <Modal
          isOpen={isDeleteOpen}
          onClose={() => {
            setIsDeleteOpen(false);
            setDeleteId(null);
          }}
          title="Remove equipment?"
        >
          <p className="text-teal-800 mb-4">This removes the item from this hospital&apos;s register only.</p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteOpen(false);
                setDeleteId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
            >
              Remove
            </Button>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default EquipmentPage;
