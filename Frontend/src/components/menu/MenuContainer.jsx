import { useQuery } from "@tanstack/react-query";
import {
  Apple,
  Beef,
  Cake,
  Coffee, // Importing Leaf icon for veg
  Drumstick,
  Egg,
  Fish,
  IceCream,
  Leaf,
  Minus,
  Pizza,
  Plus,
  Salad,
  Sandwich,
  ShoppingCart,
  Soup,
  Utensils,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import img from "../../assets/images/image.png";
import { getCategories, getItems } from "../../https";
import { addItems } from "../../redux/slices/cartSlice";
import { getRandomColor } from "../../utils/index";

const MenuContainer = () => {
  const [selected, setSelected] = useState(null);
  const [itemCount, setItemCount] = useState({});
  const [itemId, setItemId] = useState();
  const [colors, setColors] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = "RestOS | Menu";

    // Add event listener for the search input
    const searchInput = document.getElementById("menuSearchInput");
    if (searchInput) {
      const handleSearchChange = (e) => {
        const query = e.target.value.trim().toLowerCase();
        setSearchQuery(query);
        setIsSearching(query.length > 0);
      };

      searchInput.addEventListener("input", handleSearchChange);

      return () => {
        searchInput.removeEventListener("input", handleSearchChange);
      };
    }
  }, []);

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

  // Array of available icons to use for categories
  const availableIcons = useMemo(
    () => [
      Utensils,
      UtensilsCrossed,
      Coffee,
      Soup,
      Cake,
      Pizza,
      Wine,
      Salad,
      Apple,
      Fish,
      Egg,
      IceCream,
      Sandwich,
      Beef,
    ],
    []
  );

  // Map of category IDs to icon indexes (will be set when categories are loaded)
  const [categoryIconMap, setCategoryIconMap] = useState({});

  useEffect(() => {
    if (categoriesData && categoriesData.data && categoriesData.data.data) {
      const categories = categoriesData.data.data.map((category) => ({
        id: category._id,
        name: category.name,
        items: [],
      }));

      setMenuCategories(categories);

      // Set the first category as selected by default
      if (categories.length > 0 && !selected) {
        setSelected(categories[0]);
      }

      // Generate random colors for categories
      const menuColors = categories.map(() => getRandomColor());
      setColors(menuColors);

      // Assign icons to categories
      const iconMap = {};
      categories.forEach((category, index) => {
        // Use modulo to cycle through available icons if we have more categories than icons
        iconMap[category.id] = index % availableIcons.length;
      });
      setCategoryIconMap(iconMap);
    }
  }, [categoriesData, availableIcons]);

  useEffect(() => {
    if (
      itemsData &&
      itemsData.data &&
      itemsData.data.data &&
      menuCategories.length > 0
    ) {
      const items = itemsData.data.data;

      // Collect all items for search functionality
      const allMenuItems = items.map((item) => ({
        id: item._id,
        name: item.name,
        price: item.price,
        image: item.image || null,
        itemCategory: item.itemCategory || "veg",
        categoryId: item.category?._id,
        categoryName:
          menuCategories.find((cat) => cat.id === item.category?._id)?.name ||
          "Uncategorized",
      }));

      setAllItems(allMenuItems);

      // Create a new array with categories that include their items
      const categoriesWithItems = menuCategories.map((category) => {
        const categoryItems = items
          .filter((item) => item.category && item.category._id === category.id)
          .map((item) => ({
            id: item._id,
            name: item.name,
            price: item.price,
            image: item.image || null,
            itemCategory: item.itemCategory || "veg",
          }));

        return {
          ...category,
          items: categoryItems,
        };
      });

      setMenuCategories(categoriesWithItems);

      // Update selected category with items
      if (selected) {
        const updatedSelected = categoriesWithItems.find(
          (cat) => cat.id === selected.id
        );
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

  // Function to render an icon for a category
  const renderCategoryIcon = (categoryId) => {
    if (categoryId && categoryIconMap[categoryId] !== undefined) {
      const iconIndex = categoryIconMap[categoryId];
      const IconComponent = availableIcons[iconIndex];
      return <IconComponent className="h-4 w-4" />;
    }
    return <UtensilsCrossed className="h-4 w-4" />;
  };

  // Generate contrast text color based on background color
  const getContrastTextColor = (bgColor) => {
    // Extract RGB components from hex color
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance - simplified formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return white for dark backgrounds, black for light backgrounds
    return luminance > 0.5 ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)";
  };

  if (categoriesLoading || itemsLoading) {
    return (
      <div className="w-full px-4 py-4 text-[var(--text-color)]">
        Loading menu...
      </div>
    );
  }

  // Filter items based on search query
  const filteredItems = searchQuery
    ? allItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Render a menu item card
  const renderMenuItem = (menu) => (
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

        {/* Show badge only for veg and non-veg items */}
        {menu.itemCategory !== "none" && (
          <div className="absolute top-2 right-2">
            <div
              className={`text-xs font-semibold px-2 rounded-full ${
                menu.itemCategory === "veg"
                  ? "bg-green-500 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              {menu.itemCategory === "veg" ? (
                <span className="flex items-center gap-1">
                  <Leaf className="h-3 w-3" /> Veg
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Drumstick className="h-3 w-3" /> Non-Veg
                </span>
              )}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
          <div className="p-3 text-white">
            <h3 className="font-medium">{menu.name}</h3>
            <p className="text-sm">₹{menu.price}</p>
            {isSearching && (
              <p className="text-xs text-white/80 mt-1">{menu.categoryName}</p>
            )}
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
  );

  return (
    <>
      {/* Categories Section - Always show */}
      <div className="w-full px-4 py-6">
        <h2 className="text-lg font-bold mb-4 text-[var(--text-color)]">
          Menu Categories
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar ">
          {menuCategories.map((category, index) => {
            return (
              <div
                key={category.id}
                className={`
                  flex-shrink-0 w-auto
                  flex items-center gap-2 p-2 px-4 rounded-full mb-2 mt-2 ml-1 mr-1 cursor-pointer 
                  transition-all duration-300 snap-start
                  hover:scale-105 
                  ${
                    !isSearching && selected && selected.id === category.id
                      ? "bg-[#F6b100] text-white shadow-md"
                      : "bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-color)] hover:shadow-sm hover:bg-[var(--card-bg)]/90"
                  }
                `}
                onClick={() => {
                  setSelected(category);
                  // Clear search when selecting a category
                  if (isSearching) {
                    const searchInput = document.getElementById("menuSearchInput");
                    if (searchInput) {
                      searchInput.value = "";
                      setSearchQuery("");
                      setIsSearching(false);
                    }
                  }
                }}
              >
                <div
                  className={`rounded-full ${
                    !isSearching && selected && selected.id === category.id
                      ? "bg-white/20"
                      : "bg-[var(--main-bg)]"
                  } p-2`}
                >
                  {renderCategoryIcon(category.id)}
                </div>

                <span className="font-medium">{category.name}</span>
                <div
                  className={`ml-1 px-1.5 py-0.5 text-xs rounded-full  ${
                    !isSearching && selected && selected.id === category.id
                      ? "bg-white/20 text-white"
                      : "bg-[var(--main-bg)] text-[var(--text-color)]"
                  }`}
                >
                  {category.items ? category.items.length : 0}{" "}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <hr className="border-[var(--border-color)] border-t-2 mt-2" />

      {/* Search Results or Category Items */}
      <div className="px-4 py-4">
        {isSearching && (
          <h2 className="text-lg font-bold mb-4 text-[var(--text-color)]">
            Search Results for "{searchQuery}"
            <span className="text-sm font-normal ml-2">
              ({filteredItems.length} items found)
            </span>
          </h2>
        )}

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-0 sm:px-2 md:px-4 lg:px-6 py-4 w-full overflow-y-auto">
          {isSearching
            ? filteredItems.map(renderMenuItem)
            : selected && selected.items && selected.items.map(renderMenuItem)}

          {isSearching && filteredItems.length === 0 && (
            <div className="col-span-full flex justify-center items-center py-10">
              <div className="text-center">
                <p className="text-[var(--text-color)] text-lg font-medium">
                  No items found
                </p>
                <p className="text-[var(--text-color)] opacity-70 mt-2">
                  Try a different search term
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MenuContainer;
