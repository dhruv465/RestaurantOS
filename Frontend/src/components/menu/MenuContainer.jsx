import React, { useState, useEffect } from "react";
import { getRandomColor } from "../../utils/index";
import { menus } from "../../constants";
import { GrRadialSelected } from "react-icons/gr";
import { IoMdCart } from "react-icons/io";
import { useDispatch } from "react-redux";
import { addItems } from "../../redux/slices/CartSlice";

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
    if (itemCount === 0) return;

    const { name, price } = menu;
    const quantity = itemCount[menu.id] || 0;
    const newObj = {
      id: Date.now(),
      name,
      pricePerQuantity: price,
      quantity: quantity,
      price: price * quantity,
    };

    dispatch(addItems(newObj));
    setItemCount(0);
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
            className="flex flex-col items-start justify-between p-3 sm:p-4 rounded-lg h-[120px] sm:h-[150px] cursor-pointer bg-[var(--card-bg)] hover:bg-[var(--card-bg)]/90"
          >
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[var(--text-color)] text-lg font-semibold">
                {menu.name}
              </h1>
              <button
                onClick={() => handleAddToCart(menu)}
                className="p-2 rounded-lg text-[var(--text-color)] bg-[var(--main-bg)]"
                // style={{ background: colors[selected.id] }}
              >
                <IoMdCart size={20} />
              </button>
            </div>
            <div className="flex items-center justify-between w-full">
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
