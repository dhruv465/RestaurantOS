import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { additemAsync, selectItemStatus, updateItemAsync } from "../../redux/slices/itemSlice";
import { enqueueSnackbar } from "notistack";
import Modal from "./Modal";
import { selectCategories } from "../../redux/slices/categorySlice";
import { useMutation, useQuery } from "@tanstack/react-query";
import { addItem, getModifierGroups, getSettings, updateItem, uploadItemImage } from "../../https";
import { ALLERGENS, assetUrl } from "../../utils";

const AddItemModal = ({ isOpen, onClose, initialItem = {} }) => {
  const dispatch = useDispatch();
  const categories = useSelector(selectCategories);
  const itemStatus = useSelector(selectItemStatus);
  const isEditing = initialItem && !!initialItem._id;

  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [itemCategory, setItemCategory] = useState("none"); // Default to none
  const [station, setStation] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [available, setAvailable] = useState(true);
  const [prepMinutes, setPrepMinutes] = useState("");
  const [allergens, setAllergens] = useState([]);
  const [spiceLevel, setSpiceLevel] = useState(0);
  const [sortOrder, setSortOrder] = useState(0);
  const { data: settingsRes } = useQuery({ queryKey: ["settings"], queryFn: getSettings, enabled: isOpen });
  const stations = settingsRes?.data?.data?.stations || [];
  const { data: groupsRes } = useQuery({ queryKey: ["modifier-groups"], queryFn: getModifierGroups, enabled: isOpen });
  const groups = groupsRes?.data?.data || [];
  const [modifierGroups, setModifierGroups] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setItemName(initialItem?.name || "");
      setItemPrice(initialItem?.price || "");
      setSelectedCategory(initialItem?.category?._id || initialItem?.category || "");
      setItemCategory(initialItem?.itemCategory || "none");
      setStation(initialItem?.station || "");
      setDescription(initialItem?.description || "");
      setImage(initialItem?.image || "");
      setAvailable(initialItem?.available !== false);
      setPrepMinutes(initialItem?.prepMinutes ?? "");
      setAllergens(initialItem?.allergens || []);
      setSpiceLevel(initialItem?.spiceLevel || 0);
      setSortOrder(initialItem?.sortOrder || 0);
      setModifierGroups((initialItem?.modifierGroups || []).map((g) => g._id || g));
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
      itemCategory: itemCategory,
      station,
      description: description.trim(),
      image,
      available,
      prepMinutes: prepMinutes === "" ? undefined : Number(prepMinutes),
      allergens,
      spiceLevel: Number(spiceLevel),
      sortOrder: Number(sortOrder) || 0,
      modifierGroups,
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
        <textarea
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
        />
      </div>
      <div className="mb-4 flex items-center gap-3">
        {image && <img src={assetUrl(image)} alt="" className="h-14 w-14 rounded object-cover" />}
        <label className="text-sm text-[var(--text-color)] cursor-pointer underline">
          {uploading ? "Uploading…" : image ? "Change photo" : "Add photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const { data } = await uploadItemImage(file);
                setImage(data.url);
              } catch (error) {
                enqueueSnackbar(error.response?.data?.message || "Upload failed", { variant: "error" });
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
        {image && (
          <button type="button" onClick={() => setImage("")} className="text-sm text-red-500">
            Remove
          </button>
        )}
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <label className="text-xs text-[#ababab]">
          Prep minutes
          <input
            type="number"
            min="0"
            max="240"
            value={prepMinutes}
            onChange={(e) => setPrepMinutes(e.target.value)}
            className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 border border-[var(--border-color)]"
          />
        </label>
        <label className="text-xs text-[#ababab]">
          Spice
          <select
            value={spiceLevel}
            onChange={(e) => setSpiceLevel(e.target.value)}
            className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 border border-[var(--border-color)]"
          >
            {["None", "Mild", "Medium", "Hot"].map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[#ababab]">
          Menu order
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 border border-[var(--border-color)]"
          />
        </label>
      </div>
      {groups.length > 0 && (
        <fieldset className="mb-4">
          <legend className="text-[var(--text-color)] mb-2 text-sm">Add-on groups</legend>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <label key={g._id} className="flex items-center gap-1 text-sm text-[var(--text-color)]">
                <input
                  type="checkbox"
                  checked={modifierGroups.includes(g._id)}
                  onChange={(e) =>
                    setModifierGroups(e.target.checked ? [...modifierGroups, g._id] : modifierGroups.filter((id) => id !== g._id))
                  }
                />
                {g.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="mb-4">
        <legend className="text-[var(--text-color)] mb-2 text-sm">Allergens</legend>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => (
            <label key={a} className="flex items-center gap-1 text-sm text-[var(--text-color)] capitalize">
              <input
                type="checkbox"
                checked={allergens.includes(a)}
                onChange={(e) => setAllergens(e.target.checked ? [...allergens, a] : allergens.filter((x) => x !== a))}
              />
              {a}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mb-4 flex items-center gap-2 text-[var(--text-color)]">
        <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
        Available (untick when sold out)
      </label>
      <div className="mb-4">
        <select
          aria-label="Kitchen station"
          value={station}
          onChange={(e) => setStation(e.target.value)}
          className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
        >
          <option value="">Kitchen station: {stations[0] || "default"}</option>
          {stations.slice(1).map((name) => (
            <option key={name} value={name}>
              Kitchen station: {name}
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