import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BiSolidDish } from "react-icons/bi";
import { MdCategory, MdDelete, MdEdit, MdTableBar } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { can } from "../utils";
import Metrics from "../components/dashboard/Metrics";
import Modal from "../components/dashboard/Modal";
import RecentOrders from "../components/dashboard/RecentOrders";
import AddItemModal from "../components/ui/AddItemModal";
import CategoryModal from "../components/ui/CategoryModal";
import { getItems, updateItem } from "../https";
import { enqueueSnackbar } from "notistack";
import {
  fetchCategories,
  selectCategories,
} from "../redux/slices/categorySlice";

const buttons = [
  { label: "Add Table", icon: <MdTableBar />, action: "table" },
  { label: "Add Category", icon: <MdCategory />, action: "category" },
  { label: "Add Dishes", icon: <BiSolidDish />, action: "dishes" },
];

const card = "rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]";
const toolButton = "text-[var(--text-color)] bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-[#F6b100] px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2";

const Dashboard = () => {
  const dispatch = useDispatch();
  const categories = useSelector(selectCategories);
  const user = useSelector((state) => state.user);
  // Overview for everyone who can open this page; the menu editor only for those who may change it.
  const tabs = ["Overview", "Orders", ...(can(user, "menu.manage") ? ["Manage Menu"] : [])];

  useEffect(() => {
    document.title = "RestOS | Sales";
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

  const [activeTab, setActiveTab] = useState("Overview");

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
        <div className={`p-6 ${card}`}>
          <p className="text-[var(--text-color)]">
            No categories available. Add some categories to get started!
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <h2 className="text-xl font-semibold text-[var(--text-color)]">Menu items</h2>

        <div className="space-y-6">
          {uniqueCategoryNames.map((category) => (
            <div key={category} className="space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                <h3 className="text-lg font-semibold text-[var(--text-color)]">
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
                    aria-label={`Delete ${category} category`} title={`Delete ${category} category`}
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
                      className={`p-4 ${card}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-medium text-[var(--text-color)]">
                            {item.name}
                          </h4>
                          <p className="text-sm text-[var(--muted)] mt-1">
                            {item.description || "No description"}
                          </p>
                          <p className="font-medium mt-2 text-[var(--text-color)]">
                            ₹{item.price.toFixed(2)}
                          </p>
                          <button
                            onClick={() =>
                              updateItem(item._id, { available: item.available === false })
                                .then(() => refetchItems())
                                .catch((e) => enqueueSnackbar(e.response?.data?.message || "Could not update", { variant: "error" }))
                            }
                            aria-pressed={item.available === false}
                            className={`mt-2 px-3 py-1 rounded-full text-xs text-white ${item.available === false ? "bg-red-600" : "bg-green-600"}`}
                          >
                            {item.available === false ? "Sold out — tap to restock" : "Available"}
                          </button>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            className="p-2 bg-[var(--main-bg)] rounded-lg text-blue-500 hover:text-blue-700"
                            onClick={() => handleEditItem(item)}
                            aria-label={`Edit ${item.name}`} title={`Edit ${item.name}`}
                          >
                            <MdEdit className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 bg-[var(--main-bg)] rounded-lg text-red-500 hover:text-red-700"
                            onClick={() => setDeletingItem(item._id)}
                            aria-label={`Delete ${item.name}`} title={`Delete ${item.name}`}
                          >
                            <MdDelete className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-6 text-center ${card}`}>
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
    <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 pb-6 text-[var(--text-color)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pt-5 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Sales</h1>
          <p className="text-sm text-[var(--muted)]">Today&apos;s numbers, recent orders and the menu. Updates live.</p>
        </div>
        <div role="tablist" aria-label="Sales views" className="flex gap-1 p-1 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] w-full md:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap ${
                activeTab === tab ? "bg-[#F6b100] text-white" : "text-[var(--text-color)] hover:bg-[var(--main-bg)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Overview" && <Metrics />}
      {activeTab === "Orders" && <RecentOrders />}
      {activeTab === "Manage Menu" && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {buttons
              .filter(({ action }) => action !== "table" || can(user, "tables.manage"))
              .map(({ label, icon, action }) => (
                <button key={action} onClick={() => handleOpenModal(action)} className={toolButton}>
                  {icon} {label}
                </button>
              ))}
          </div>
          <MenuManagementComponent />
        </>
      )}

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
