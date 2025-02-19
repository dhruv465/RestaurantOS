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
      <div className="grid grid-cols-4 gap-4 px-10 py-4 w-[100%]">
        {menus.map((menu, index) => (
          <div
            key={menu.id}
            className="flex flex-col items-start justify-between p-4 rounded-lg h-[100px] cursor-pointer bg-[var(--card-bg)]"
            style={{ background: colors[index] }}
            onClick={() => setSelected(menu)}
          >
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[#f5f5f5] text-lg font-semibold">
                {menu.icon} {menu.name}
              </h1>
              {selected.id === menu.id && (
                <GrRadialSelected className="text-[#f5f5f5] text-lg" />
              )}
            </div>
            <p className="text-[#ababab] text-sm font-semibold">
              {menu.items ? menu.items.length : "No "} Items
            </p>
          </div>
        ))}
      </div>

      <hr className="border-[#2a2a2a] border-t-2 mt-4" />

      <div className="grid grid-cols-4 gap-4 px-10 py-4 w-[100%]">
        {selected?.items.map((menu) => (
          <div
            key={menu.id}
            className="flex flex-col items-start justify-between p-4 rounded-lg h-[150px] cursor-pointer bg-[var(--card-bg)] hover:bg-[#1a1a1a]"
            style={{ background: "#1a1a1a" }}
          >
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[#f5f5f5] text-lg font-semibold">
                {menu.name}
              </h1>
              <button className="bg-[#f6b0006e] text-white p-2 rounded-lg">
                <IoMdCart size={20}/>
              </button>
            </div>
            <div className="flex items-center justify-between w-full">
              <p className="text-[#ababab] text-xl font-semibold">
                ₹{menu.price}
              </p>
              <div className="flex items-center justify-between bg-[#1f1f1f] px-4 py-3 rounded-lg gap-6">
                <button
                  onClick={() => decrement(menu.id)}
                  className="text-yellow-500 text-2xl"
                >
                  &minus;
                </button>
                <span className="text-white">{itemCounts[menu.id] || 0}</span>
                <button
                  onClick={() => increment(menu.id)}
                  className="text-yellow-500 text-2xl"
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
