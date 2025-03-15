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
import { createCategory } from "../../https";

const CategoryModal = ({ isOpen, onClose, initialCategory = {} }) => {
  const [categoryName, setCategoryName] = useState(
    initialCategory ? initialCategory.name || "" : ""
  );
  const dispatch = useDispatch();
  const status = useSelector(selectCategoryStatus);
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

    categoryMutation.mutate(categoryName);
  };

  const categoryMutation = useMutation({
    mutationFn: (reqData) => createCategory(reqData),

    onSuccess: (res) => {
      console.log(res);
      onClose();
      const { data } = res;
      enqueueSnackbar(data.message, { variant: "success" });
      console.log(error);
    },
    onError: (error) => {
      console.log(error);
      const { data } = error.response;
      enqueueSnackbar(data.message, { variant: "error" });
    },
  });

  if (!isOpen) return null;

  useEffect(() => {
    setCategoryName(initialCategory ? initialCategory.name || "" : "");
  }, [isOpen, initialCategory]);

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
        disabled={status === "loading"} // Disable button while loading
      >
        {isEditing ? "Save Changes" : "Add Category"}
      </button>
    </Modal>
  );
};

export default CategoryModal;
