import React, { useState, useEffect } from "react";
import { getRandomColor } from "../../utils/index";
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { useDispatch } from "react-redux";
import { addItems } from "../../redux/slices/cartSlice";
import img from "../../assets/images/image.png";
import { useQuery } from "@tanstack/react-query";
import { getCategories, getItems } from "../../https";
import { GrRadialSelected } from "react-icons/gr";

const MenuContainer = () => {
  const [selected, setSelected] = useState(null);
  const [itemCount, setItemCount] = useState({});
  const [itemId, setItemId] = useState();
  const [colors, setColors] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const dispatch = useDispatch();

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  // Fetch items
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["items"],
    queryFn: getItems,
  });

  useEffect(() => {
    if (categoriesData && categoriesData.data && categoriesData.data.data) {
      const categories = categoriesData.data.data.map(category => ({
        id: category._id,
        name: category.name,
        items: []
      }));
      
      setMenuCategories(categories);
      
      // Set the first category as selected by default
      if (categories.length > 0 && !selected) {
        setSelected(categories[0]);
      }
      
      // Generate random colors for categories
      const menuColors = categories.map(() => getRandomColor());
      setColors(menuColors);
    }
  }, [categoriesData]);

  useEffect(() => {
    if (itemsData && itemsData.data && itemsData.data.data && menuCategories.length > 0) {
      const items = itemsData.data.data;
      
      // Create a new array with categories that include their items
      const categoriesWithItems = menuCategories.map(category => {
        const categoryItems = items.filter(item => 
          item.category && item.category._id === category.id
        ).map(item => ({
          id: item._id,
          name: item.name,
          price: item.price,
          image: item.image || null
        }));
        
        return {
          ...category,
          items: categoryItems
        };
      });
      
      setMenuCategories(categoriesWithItems);
      
      // Update selected category with items
      if (selected) {
        const updatedSelected = categoriesWithItems.find(cat => cat.id === selected.id);
        if (updatedSelected) {
          setSelected(updatedSelected);
        }
      }
    }
  }, [itemsData, menuCategories.length]);

  const increment = (id) => {
    setItemId(id);
    setItemCount((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const decrement = (id) => {
    setItemId(id);
    setItemCount((prev) => ({
      ...prev,
      [id]: Math.max((prev[id] || 0) - 1, 0),
    }));
  };

  const handleAddToCart = (menu) => {
    const quantity = itemCount[menu.id] || 0;

    if (quantity === 0) return; // Don't add items with zero quantity

    const { name, price } = menu;
    const newObj = {
      id: Date.now(),
      name,
      pricePerQuantity: price,
      quantity: quantity,
      price: price * quantity,
    };

    dispatch(addItems(newObj));

    // Reset only this item's count, not all counts
    setItemCount((prev) => ({
      ...prev,
      [menu.id]: 0,
    }));
  };

  if (categoriesLoading || itemsLoading) {
    return <div className="w-full px-4 py-4 text-[var(--text-color)]">Loading menu...</div>;
  }

  return (
    <>
      <div className="w-full px-4 py-4">
        {/* Container with horizontal scroll on mobile/tablet */}
        <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-x-visible">
          {menuCategories.map((category, index) => (
            <div
              key={category.id}
              className="flex-shrink-0 w-[260px] sm:w-[280px] lg:w-auto flex flex-col items-start justify-between p-4 rounded-lg h-24 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: colors[index] }}
              onClick={() => setSelected(category)}
            >
              <div className="flex items-center justify-between w-full">
                <h1 className="text-[var(--text-color)] text-lg font-semibold truncate">
                  {category.name}
                </h1>
                {selected && selected.id === category.id && (
                  <GrRadialSelected className="text-[var(--text-color)] text-lg flex-shrink-0" />
                )}
              </div>
              <p className="text-[var(--text-color)] text-sm font-semibold mt-2">
                {category.items ? category.items.length : "No"} Items
              </p>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-[var(--border-color)] border-t-2 mt-4" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4 sm:px-6 md:px-8 lg:px-10 py-4 w-full overflow-y-auto">
        {selected && selected.items && selected.items.map((menu) => (
          <div
            key={menu.id}
            className="flex flex-col overflow-hidden rounded-lg bg-[var(--card-bg)] hover:shadow-md transition-shadow"
          >
            <div className="relative">
              {menu.image ? (
                <img
                  src={menu.image}
                  alt={menu.name}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <img
                  src={img}
                  alt={`${menu.name} placeholder`}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-3 text-white">
                  <h3 className="font-medium">{menu.name}</h3>
                  <p className="text-sm">₹{menu.price}</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  className="h-8 w-8 rounded-full flex items-center justify-center border border-[var(--border-color)] text-[var(--text-color)]"
                  onClick={() => decrement(menu.id)}
                  disabled={!itemCount[menu.id]}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-[var(--text-color)]">
                  {itemCount[menu.id] || 0}
                </span>
                <button
                  className="h-8 w-8 rounded-full flex items-center justify-center border border-[var(--border-color)] text-[var(--text-color)]"
                  onClick={() => increment(menu.id)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                className="h-8 w-8 flex items-center justify-center text-[var(--text-color)]"
                onClick={() => handleAddToCart(menu)}
              >
                <ShoppingCart className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default MenuContainer;