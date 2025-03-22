import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addCategoryAsync,
  updateCategoryAsync,
  selectCategoryStatus,
} from "../../redux/slices/categorySlice";
import Modal from "./Modal";
import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { createCategory, updateCategory } from "../../https";

const CategoryModal = ({ isOpen, onClose, initialCategory = {} }) => {
  const [categoryName, setCategoryName] = useState(
    initialCategory ? initialCategory.name || "" : ""
  );
  const dispatch = useDispatch();
  const status = useSelector(selectCategoryStatus);
  const isEditing = initialCategory ? !!initialCategory._id : false;

  useEffect(() => {
    setCategoryName(initialCategory ? initialCategory.name || "" : "");
  }, [isOpen, initialCategory]);

  const categoryMutation = useMutation({
    mutationFn: (data) => {
      if (isEditing) {
        return updateCategory(initialCategory._id, { name: data });
      } else {
        return createCategory({ name: data });
      }
    },
    onSuccess: (res) => {
      const { data } = res;
      dispatch(addCategoryAsync(data.category)); // Dispatch the action to update Redux state
      onClose();
      enqueueSnackbar(data.message || "Category operation successful", { variant: "success" });
    },
    onError: (error) => {
      console.error(error);
      const message = error.response?.data?.message || "Category operation failed";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const handleSubmit = () => {
    if (!categoryName.trim()) {
      enqueueSnackbar("Category name cannot be empty", { variant: "warning" });
      return;
    }
    categoryMutation.mutate(categoryName);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Category" : "Add Category"}
      className="bg-[var(--card-bg)] p-4 rounded-md shadow-md w-96 h-96"
    >
      <div className="mb-4">
        <input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="Category Name"
          className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
        />
      </div>
      <button
        onClick={handleSubmit}
        className="bg-[#F6b100] text-white rounded-lg py-3 w-full mt-8 hover:bg-[#F6b100]/90 transition-colors duration-200"
        disabled={categoryMutation.isPending || status === "loading"}
      >
        {isEditing ? "Save Changes" : "Add Category"}
      </button>
    </Modal>
  );
};

export default CategoryModal;
