import React, { useState, useEffect } from "react";
import { getRandomColor } from "../../utils/index";
import { menus } from "../../constants";
import { GrRadialSelected } from "react-icons/gr";
import { IoMdCart } from "react-icons/io";
import { useDispatch } from "react-redux";
import { addItems } from "../../redux/slices/cartSlice";
import img from "../../assets/images/image.png";

const MenuContainer = () => {
  const [selected, setSelected] = useState(menus[0]);
  const [itemCount, setItemCount] = useState({});
  const [itemId, setItemId] = useState();
  const [colors, setColors] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    const menuColors = menus.map(() => getRandomColor());
    setColors(menuColors);
  }, []);

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

  return (
    <>
      <div className="w-full px-4 py-4">
        {/* Container with horizontal scroll on mobile/tablet */}
        <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-x-visible">
          {menus.map((menu, index) => (
            <div
              key={menu.id}
              className="flex-shrink-0 w-[260px] sm:w-[280px] lg:w-auto flex flex-col items-start justify-between p-4 rounded-lg h-24 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: colors[index] }}
              onClick={() => setSelected(menu)}
            >
              <div className="flex items-center justify-between w-full">
                <h1 className="text-[var(--text-color)] text-lg font-semibold truncate">
                  {menu.icon} {menu.name}
                </h1>
                {selected.id === menu.id && (
                  <GrRadialSelected className="text-[var(--text-color)] text-lg flex-shrink-0" />
                )}
              </div>
              <p className="text-[var(--text-color)] text-sm font-semibold mt-2">
                {menu.items ? menu.items.length : "No"} Items
              </p>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-[var(--border-color)] border-t-2 mt-4" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4 sm:px-6 md:px-8 lg:px-10 py-4 w-full overflow-y-auto">
        {selected?.items.map((menu) => (
          <div
            key={menu.id}
            className="flex flex-col items-start justify-between p-3 sm:p-4 rounded-lg cursor-pointer bg-[var(--card-bg)] hover:bg-[var(--card-bg)]/90"
          >
            {/* Image container */}
            <div className="w-full h-32 mb-3 overflow-hidden rounded-lg">
              {menu.image ? (
                <img
                  src={menu.image}
                  alt={menu.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <img
                    src={img}
                    alt={`${menu.name} placeholder`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between w-full">
              <h1 className="text-[var(--text-color)] text-lg font-semibold">
                {menu.name}
              </h1>
              <button
                onClick={() => handleAddToCart(menu)}
                className="p-2 rounded-lg text-[var(--text-color)] bg-[var(--main-bg)]"
              >
                <IoMdCart size={20} />
              </button>
            </div>
            <div className="flex items-center justify-between w-full mt-2">
              <p className="text-[var(--text-color)] text-xl font-semibold">
                ₹{menu.price}
              </p>
              <div className="flex items-center justify-between px-4 py-3 rounded-lg gap-6 bg-[var(--main-bg)]">
                <button
                  onClick={() => decrement(menu.id)}
                  className="text-[var(--text-color)] text-2xl z"
                >
                  &minus;
                </button>
                <span className="text-[var(--text-color)]">
                  {itemCount[menu.id] || 0}
                </span>
                <button
                  onClick={() => increment(menu.id)}
                  className="text-[var(--text-color)] text-2xl"
                >
                  &#43;
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default MenuContainer;
