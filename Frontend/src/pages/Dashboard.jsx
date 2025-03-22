import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { BiSolidDish } from "react-icons/bi";
import { MdCategory, MdDelete, MdEdit, MdTableBar } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import Metrics from "../components/dashboard/Metrics";
import Modal from "../components/dashboard/Modal";
import RecentOrders from "../components/dashboard/RecentOrders";
import AddItemModal from "../components/ui/AddItemModal";
import CategoryModal from "../components/ui/CategoryModal";
import { getItems } from "../https";
import {
  fetchCategories,
  selectCategories,
} from "../redux/slices/categorySlice";

const buttons = [
  { label: "Add Table", icon: <MdTableBar />, action: "table" },
  { label: "Add Category", icon: <MdCategory />, action: "category" },
  { label: "Add Dishes", icon: <BiSolidDish />, action: "dishes" },
];

const tabs = ["Metrics", "Orders", "Payment", "Manage Menu"];

const Dashboard = () => {
  const dispatch = useDispatch();
  const categories = useSelector(selectCategories);

  useEffect(() => {
    document.title = "RestOS | Dashboard";
  }, []);

  // Modals State
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Handlers for closing the modals
  const handleCloseTableModal = () => setIsTableModalOpen(false);
  const handleCloseCategoryModal = () => setIsCategoryModalOpen(false);
  const handleCloseItemModal = () => setIsItemModalOpen(false);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Edit state variables
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const [activeTab, setActiveTab] = useState("Metrics");

  // Fetch categories and items
  const { data: itemsData, refetch: refetchItems } = useQuery({
    queryKey: ["items"],
    queryFn: getItems,
  });

  const items = itemsData?.data?.data || [];

  // Functions to handle editing
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  // Update the handleDeleteItem function
  const handleDeleteItem = (itemId) => {
    import("../https").then(({ deleteItem }) => {
      deleteItem(itemId)
        .then(() => {
          // After deletion is successful, refetch items
          refetchItems();
          // Show success message
          console.log("Item deleted successfully");
        })
        .catch((error) => {
          console.error("Error deleting item:", error);
          // Show error message
        })
        .finally(() => {
          setDeletingItem(null);
        });
    });
  };

  // Update the handleDeleteCategory function
  const handleDeleteCategory = (categoryId) => {
    import("../https").then(({ deleteCategory }) => {
      deleteCategory(categoryId)
        .then(() => {
          // Immediately update the local state to remove the deleted category
          const updatedCategories = categories.filter(
            (cat) => cat._id !== categoryId
          );
          dispatch({
            type: "category/setCategories",
            payload: updatedCategories,
          });

          // Also refetch categories to ensure sync with backend
          dispatch(fetchCategories());

          // Refetch items as they might be affected by category deletion
          refetchItems();

          // Show success message
          console.log("Category deleted successfully");
        })
        .catch((error) => {
          console.error("Error deleting category:", error);
          // Show error message
        })
        .finally(() => {
          setDeletingCategory(null);
        });
    });
  };

  const handleOpenModal = (action) => {
    if (action === "table") {
      setIsTableModalOpen(true);
    } else if (action === "category") {
      setEditingCategory(null);
      setIsCategoryModalOpen(true);
    } else if (action === "dishes") {
      setEditingItem(null);
      setIsItemModalOpen(true);
    }
  };

  // Group items by category for display (similar to menu-management.tsx)
  const itemsByCategory = items.reduce((acc, item) => {
    const categoryName = item.category?.name || "Uncategorized";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {});

  // Get sorted categories for display

  // Modify the Menu Management Component to show all categories
  const MenuManagementComponent = () => {
    // Create a list of all category names from the categories array
    const allCategoryNames = categories.map((cat) => cat.name);

    // Add "Uncategorized" if there are items without a category
    if (items.some((item) => !item.category)) {
      allCategoryNames.push("Uncategorized");
    }

    // Create a sorted set of unique category names
    const uniqueCategoryNames = [...new Set(allCategoryNames)].sort();

    // Initialize empty arrays for categories without items
    const completeItemsByCategory = uniqueCategoryNames.reduce(
      (acc, catName) => {
        acc[catName] = itemsByCategory[catName] || [];
        return acc;
      },
      {}
    );

    if (!categories || categories.length === 0) {
      return (
        <div className="p-6 bg-[var(--card-bg)] rounded-lg">
          <p className="text-[var(--text-color)]">
            No categories available. Add some categories to get started!
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-[var(--text-color)]">
            Menu Items
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenModal("category")}
              className="text-[var(--text-color)] bg-[var(--card-bg)] hover:bg-[var(--main-bg)] px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"
            >
              <MdCategory /> Add Category
            </button>
            <button
              onClick={() => handleOpenModal("dishes")}
              className="text-[var(--text-color)] bg-[var(--card-bg)] hover:bg-[var(--main-bg)] px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"
            >
              <BiSolidDish /> Add Menu Item
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {uniqueCategoryNames.map((category) => (
            <div key={category} className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-xl font-medium text-[var(--text-color)]">
                  {category}
                </h3>
                {category !== "Uncategorized" && (
                  <button
                    className="p-2 bg-[var(--main-bg)] rounded-lg text-red-500 hover:text-red-700"
                    onClick={() => {
                      // Find the category ID by name
                      const categoryObj = categories.find(
                        (cat) => cat.name === category
                      );
                      if (categoryObj) {
                        setDeletingCategory(categoryObj._id);
                      }
                    }}
                    aria-label={`Delete ${category} category`}
                  >
                    <MdDelete className="h-4 w-4" />
                  </button>
                )}
              </div>
              {completeItemsByCategory[category].length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {completeItemsByCategory[category].map((item) => (
                    <div
                      key={item._id}
                      className="bg-[var(--card-bg)] p-6 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-medium text-[var(--text-color)]">
                            {item.name}
                          </h4>
                          <p className="text-[var(--text-color)]/70 mt-1">
                            {item.description || "No description provided"}
                          </p>
                          <p className="font-medium mt-2 text-[var(--text-color)]">
                            ₹{item.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            className="p-2 bg-[var(--main-bg)] rounded-lg text-blue-500 hover:text-blue-700"
                            onClick={() => handleEditItem(item)}
                            aria-label={`Edit ${item.name}`}
                          >
                            <MdEdit className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 bg-[var(--main-bg)] rounded-lg text-red-500 hover:text-red-700"
                            onClick={() => setDeletingItem(item._id)}
                            aria-label={`Delete ${item.name}`}
                          >
                            <MdDelete className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[var(--card-bg)] p-6 rounded-lg text-center">
                  <p className="text-[var(--text-color)]/70">
                    No items in this category
                  </p>
                  <button
                    onClick={() => {
                      setEditingItem({
                        category: categories.find(
                          (cat) => cat.name === category
                        )?._id,
                      });
                      setIsItemModalOpen(true);
                    }}
                    className="mt-2 text-blue-500 hover:text-blue-700"
                  >
                    Add an item
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Update the CategoriesAndItemsList component

  // Delete Confirmation Modal Component
  const DeleteConfirmationModal = ({
    isOpen,
    title,
    description,
    onConfirm,
    onCancel,
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[var(--card-bg)] p-6 rounded-lg max-w-md w-full">
          <h2 className="text-xl font-semibold text-[var(--text-color)]">
            {title}
          </h2>
          <p className="text-[var(--text-color)] mt-2">{description}</p>
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-[var(--main-bg)] rounded-lg text-[var(--text-color)]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="bg-[var(--main-bg)] min-h-screen">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-14 px-4 md:px-8 gap-4">
        <div className="flex items-center gap-3">
          {buttons.map(({ label, icon, action }) => (
            <button
              key={action}
              onClick={() => handleOpenModal(action)}
              className="text-[var(--text-color)] bg-[var(--card-bg)] hover:bg-[var(--main-bg)] px-4 md:px-8 py-3 rounded-lg text-[#f5f5f5] font-semibold text-sm md:text-md flex items-center gap-2"
            >
              {label} {icon}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {tabs.map((tab) => (
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
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 pb-14">
        {activeTab === "Metrics" && <Metrics />}
        {activeTab === "Orders" && <RecentOrders />}
        {activeTab === "Manage Menu" && <MenuManagementComponent />}
      </div>

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

      {/* Delete Item Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deletingItem}
        title="Delete Menu Item"
        description="Are you sure you want to delete this menu item? This action cannot be undone."
        onConfirm={() => deletingItem && handleDeleteItem(deletingItem)}
        onCancel={() => setDeletingItem(null)}
      />

      {/* Delete Category Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deletingCategory}
        title="Delete Category"
        description="Are you sure you want to delete this category? All items in this category will be affected."
        onConfirm={() =>
          deletingCategory && handleDeleteCategory(deletingCategory)
        }
        onCancel={() => setDeletingCategory(null)}
      />
    </section>
  );
};

export default Dashboard;
