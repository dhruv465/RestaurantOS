import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategories,
  selectCategories,
} from "../redux/slices/categorySlice";

import { BiSolidDish } from "react-icons/bi";
import { MdCategory, MdTableBar } from "react-icons/md";
import Metrics from "../components/dashboard/Metrics";
import RecentOrders from "../components/dashboard/RecentOrders";
import Modal from "../components/dashboard/Modal";
import CategoryModal from "../components/ui/CategoryModal";
import {
  addCategoryAsync,
  selectCategoryStatus,
} from "../redux/slices/categorySlice";
import { additemAsync, selectItemStatus } from "../redux/slices/itemSlice";
import AddItemModal from "../components/ui/AddItemModal";

const buttons = [
  { label: "Add Table", icon: <MdTableBar />, action: "table" },
  { label: "Add Category", icon: <MdCategory />, action: "category" },
  { label: "Add Dishes", icon: <BiSolidDish />, action: "dishes" },
];

const tabs = ["Metrics", "Orders", "Payment"];

const Dashboard = () => {
  const dispatch = useDispatch();
  const categories = useSelector(selectCategories);
  const categoryStatus = useSelector(selectCategoryStatus);
  const itemStatus = useSelector(selectItemStatus);

  useEffect(() => {
    document.title = "RestOS | Dashboard";
  }, []);
  // Modals State
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const [activeTab, setActiveTab] = useState("Metrics");

  const handleOpenModal = (action) => {
    if (action === "table") {
      setIsTableModalOpen(true);
    } else if (action === "category") {
      setEditingCategory(null); // Reset editing category when opening the modal
      setIsCategoryModalOpen(true);
    } else if (action === "dishes") {
      setEditingItem(null); // Reset editing item when opening the modal
      setIsItemModalOpen(true);
    }
  };

  //Handlers for closing the modals
  const handleCloseTableModal = () => setIsTableModalOpen(false);
  const handleCloseCategoryModal = () => setIsCategoryModalOpen(false);
  const handleCloseItemModal = () => setIsItemModalOpen(false);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  return (
    <section className="bg-[var(--main-bg)] min-h-screen ">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-14 px-4 md:px-8 gap-4">
        <div className="flex items-center gap-3">
          {buttons.map(({ label, icon, action }) => {
            return (
              <button
                key={action}
                onClick={() => handleOpenModal(action)}
                className="text-[var(--text-color)] bg-[var(--card-bg)] hover:bg-[var(--main-bg)] px-4 md:px-8 py-3 rounded-lg text-[#f5f5f5] font-semibold text-sm md:text-md flex items-center gap-2"
              >
                {label} {icon}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {tabs.map((tab) => {
            return (
              <button
                key={tab}
                className={`px-4 md:px-6 py-2 rounded-lg text-[#f5f5f5] font-semibold text-sm md:text-md flex items-center gap-2 ${
                  activeTab === tab
                    ? "text-[var(--text-color)] bg-[var(--main-bg)] "
                    : "text-[var(--text-color)] bg-[var(--card-bg)] hover:bg-[var(--main-bg)]"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "Metrics" && <Metrics />}
      {activeTab === "Orders" && <RecentOrders />}

      {/* Table Modal */}
      {isTableModalOpen && (
        <Modal isOpen={true} onClose={handleCloseTableModal} />
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <CategoryModal
          isOpen={true}
          onClose={handleCloseCategoryModal}
          initialCategory={editingCategory}
        />
      )}

      {/* Item Modal */}
      {isItemModalOpen && (
        <AddItemModal
          isOpen={true}
          onClose={handleCloseItemModal}
          initialItem={editingItem}
        />
      )}
    </section>
  );
};

export default Dashboard;
