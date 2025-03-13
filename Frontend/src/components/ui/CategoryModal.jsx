import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addCategoryAsync,
  updateCategoryAsync,
  selectCategoryStatus,
} from "../../redux/slices/categorySlice";
import Modal from "./Modal";

const CategoryModal = ({ isOpen, onClose, initialCategory = {} }) => {
  const [categoryName, setCategoryName] = useState(
    initialCategory ? initialCategory.name || "" : ""
  );
  const dispatch = useDispatch();
  const status = useSelector(selectCategoryStatus); // Get category operation status
  const isEditing = initialCategory ? !!initialCategory._id : false;

  const handleSubmit = () => {
    if (categoryName) {
      if (isEditing) {
        dispatch(
          updateCategoryAsync({
            id: initialCategory._id,
            data: { name: categoryName },
          })
        );
      } else {
        dispatch(addCategoryAsync({ name: categoryName }));
      }
    }
  };

  useEffect(() => {
    setCategoryName(initialCategory ? initialCategory.name || "" : "");
  }, [isOpen, initialCategory]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Category" : "Add Category"}
    >
      <div className="mb-4">
        <input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="Category Name"
          className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        onClick={handleSubmit}
        className="px-4 py-2 rounded-md bg-blue-500 text-white font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
        disabled={status === "loading"} // Disable button while loading
      >
        {isEditing ? "Save Changes" : "Add Category"}
      </button>
    </Modal>
  );
};

export default CategoryModal;
