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

  useEffect(() => {
    if (isOpen) {
      setItemName(initialItem?.name || "");
      setItemPrice(initialItem?.price || "");
      setSelectedCategory(initialItem?.category?._id || initialItem?.category || "");
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
      onClose();
      const { data } = res;
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
      category: selectedCategory
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
