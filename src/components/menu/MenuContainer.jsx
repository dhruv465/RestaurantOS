import React, { useState, useEffect } from "react";
import { getRandomColor } from "../../utils/index";
import { menus } from "../../constants";
import { GrRadialSelected } from "react-icons/gr";
import { IoMdCart } from "react-icons/io";

const MenuContainer = () => {
  const [selected, setSelected] = useState(menus[0]);
  const [itemCounts, setItemCounts] = useState({});
  const [colors, setColors] = useState([]);

  useEffect(() => {
    const menuColors = menus.map(() => getRandomColor());
    setColors(menuColors);
  }, []);

  const increment = (id) => {
    setItemCounts((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const decrement = (id) => {
    setItemCounts((prev) => ({
      ...prev,
      [id]: Math.max((prev[id] || 0) - 1, 0),
    }));
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-4 px-4 sm:px-6 md:px-8 lg:px-10 py-4 w-full min-w-[900px]">
        {menus.map((menu, index) => (
          <div
            key={menu.id}
            className="flex flex-col items-start justify-between p-3 sm:p-4 rounded-lg h-[90px] sm:h-[100px] cursor-pointer min-w-[200px]"
            style={{ background: colors[index] }}
            onClick={() => setSelected(menu)}
          >
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[var(--text-color)] text-lg font-semibold">
                {menu.icon} {menu.name}
              </h1>
              {selected.id === menu.id && (
                <GrRadialSelected className="text-[var(--text-color)] text-lg" />
              )}
            </div>
            <p className="text-[var(--text-color)] text-sm font-semibold">
              {menu.items ? menu.items.length : "No "} Items
            </p>
          </div>
        ))}
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
              {/* <button
                className="p-2 rounded-lg text-[var(--text-color)]"
                style={{ background: colors[selected.id] }}
              >
                <IoMdCart size={20} />
              </button> */}
            </div>
            <div className="flex items-center justify-between w-full">
              <p className="text-[var(--text-color)] text-xl font-semibold">
                ₹{menu.price}
              </p>
              <div className="flex items-center justify-between px-4 py-3 rounded-lg gap-6">
                <button
                  onClick={() => decrement(menu.id)}
                  className="text-[var(--text-color)] text-2xl"
                >
                  &minus;
                </button>
                <span className="text-[var(--text-color)]">
                  {itemCounts[menu.id] || 0}
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
