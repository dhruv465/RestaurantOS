import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { additemAsync, selectItemStatus } from "../../redux/slices/itemSlice";
import { enqueueSnackbar } from "notistack";
import Modal from "./Modal";
import { selectCategories } from "../../redux/slices/categorySlice";

const AdditemModal = ({ isOpen, onClose, initialItem = {} }) => {
  const dispatch = useDispatch();
  const categories = useSelector(selectCategories);
  const itemStatus = useSelector(selectItemStatus);
  const isEditing = initialItem && !!initialItem._id;

  const [itemName, setItemName] = useState(
    initialItem && initialItem.name ? initialItem.name : ""
  );
  const [itemPrice, setItemPrice] = useState(
    initialItem && initialItem.price ? initialItem.price : ""
  );
  const [selectedCategory, setSelectedCategory] = useState(
    initialItem && initialItem.category ? initialItem.category : ""
  );

  useEffect(() => {
    setItemName(initialItem && initialItem.name ? initialItem.name : "");
    setItemPrice(initialItem && initialItem.price ? initialItem.price : "");
    setSelectedCategory(
      initialItem && initialItem.category ? initialItem.category : ""
    );
  }, [isOpen, initialItem]);

  const handleSubmit = async () => {
    if (itemName && itemPrice && selectedCategory) {
      const newItem = {
        name: itemName,
        price: parseFloat(itemPrice),
        category: selectedCategory,
      };

      const response = await dispatch(
        isEditing
          ? additemAsync({ id: initialItem._id, data: newItem })
          : additemAsync(newItem)
      );
      if (response.meta.requestStatus === "fulfilled") {
        enqueueSnackbar("Item added/updated successfully!", {
          variant: "success",
        });
      } else {
        enqueueSnackbar("Failed to add/update item.", { variant: "error" });
      }
      onClose();
    }
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
        disabled={itemStatus === "loading"}
      >
        {isEditing ? "Save Changes" : "Add Item"}
      </button>
    </Modal>
  );
};

export default AdditemModal;
