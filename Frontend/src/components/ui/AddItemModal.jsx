import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { additemAsync, selectItemStatus, updateItemAsync } from "../../redux/slices/itemSlice";
import { enqueueSnackbar } from "notistack";
import Modal from "./Modal";
import { selectCategories } from "../../redux/slices/categorySlice";
import { useMutation } from "@tanstack/react-query";
import { addItem, updateItem } from "../../https";

const AddItemModal = ({ isOpen, onClose, initialItem = {} }) => {
  const dispatch = useDispatch();
  const categories = useSelector(selectCategories);
  const itemStatus = useSelector(selectItemStatus);
  const isEditing = initialItem && !!initialItem._id;

  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [itemCategory, setItemCategory] = useState("none"); // Default to none

  useEffect(() => {
    if (isOpen) {
      setItemName(initialItem?.name || "");
      setItemPrice(initialItem?.price || "");
      setSelectedCategory(initialItem?.category?._id || initialItem?.category || "");
      setItemCategory(initialItem?.itemCategory || "none");
    }
  }, [isOpen, initialItem]);

  const itemMutation = useMutation({
    mutationFn: (data) => {
      if (isEditing) {
        return updateItem(initialItem._id, data);
      } else {
        return addItem(data);
      }
    },
    onSuccess: (res) => {
      const { data } = res;
      dispatch(additemAsync(data.item)); // Dispatch the action to update Redux state
      onClose();
      enqueueSnackbar(data.message || `Item ${isEditing ? 'updated' : 'added'} successfully`, { 
        variant: "success" 
      });
    },
    onError: (error) => {
      console.error(error);
      const message = error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'add'} item`;
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const handleSubmit = () => {
    if (!itemName.trim()) {
      enqueueSnackbar("Item name cannot be empty", { variant: "warning" });
      return;
    }
    
    if (!itemPrice || isNaN(parseFloat(itemPrice)) || parseFloat(itemPrice) <= 0) {
      enqueueSnackbar("Please enter a valid price", { variant: "warning" });
      return;
    }
    
    if (!selectedCategory) {
      enqueueSnackbar("Please select a category", { variant: "warning" });
      return;
    }

    const itemData = {
      name: itemName,
      price: parseFloat(itemPrice),
      category: selectedCategory,
      itemCategory: itemCategory
    };

    itemMutation.mutate(itemData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Item" : "Add Item"}
    >
      <div className="mb-4">
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="Item Name"
          className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
        />
      </div>
      <div className="mb-4">
        <input
          type="number"
          value={itemPrice}
          onChange={(e) => setItemPrice(e.target.value)}
          placeholder="Item Price"
          className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
        />
      </div>
      <div className="mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
        >
          <option value="">Select Category</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <div className="text-[var(--text-color)] mb-2">Item Type</div>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="itemCategory"
              value="none"
              checked={itemCategory === "none"}
              onChange={() => setItemCategory("none")}
              className="form-radio text-gray-500"
            />
            <span className="text-[var(--text-color)]">None</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="itemCategory"
              value="veg"
              checked={itemCategory === "veg"}
              onChange={() => setItemCategory("veg")}
              className="form-radio text-green-500"
            />
            <span className="text-[var(--text-color)]">Vegetarian</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="itemCategory"
              value="non-veg"
              checked={itemCategory === "non-veg"}
              onChange={() => setItemCategory("non-veg")}
              className="form-radio text-red-500"
            />
            <span className="text-[var(--text-color)]">Non-Vegetarian</span>
          </label>
        </div>
      </div>
      <button
        onClick={handleSubmit}
        className="bg-[#F6b100] text-white rounded-lg py-3 w-full mt-8 hover:bg-[#F6b100]/90 transition-colors duration-200"
        disabled={itemMutation.isPending || itemStatus === "loading"}
      >
        {isEditing ? "Save Changes" : "Add Item"}
      </button>
    </Modal>
  );
};

export default AddItemModal;