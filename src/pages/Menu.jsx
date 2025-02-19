import React from "react";
import BottomNav from "../components/ui/BottomNav";
import BackButton from "../components/ui/BackButton";
import { IoRestaurant } from "react-icons/io5";
import MenuContainer from "../components/menu/MenuContainer";
import CustomerInfo from "../components/menu/CustomerInfo";
import CartInfo from "../components/menu/CartInfo";
import Bill from "../components/menu/Bill";

const Menu = () => {
  return (
    <section className="bg-[var(--main-bg)] min-h-screen pb-20 overflow-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-3 p-3">
        <div className="bg-[var(--card-bg)] rounded-lg p-4">
          <div className="flex flex-col md:flex-row items-center justify-between px-4 py-4 gap-4">
            <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">
              Menu
            </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <button
              className="profile flex items-center gap-2 cursor-pointer bg-[var(--card-bg)] p-3 rounded-lg"
              aria-label="User profile"
            >
              <IoRestaurant
                className="text-2xl text-[var(--text-color)]"
                aria-hidden="true"
              />
              <div className="text-[var(--text-color)] flex flex-col items-start">
                <h2 className="text-md font-semibold">Customer Name</h2>
                <p className="text-xs text-[var(--text-color)]/70 font-medium">
                  Table No: 2
                </p>
              </div>
            </button>
            </div>
          </div>

          <MenuContainer />
        </div>
        {/* Right Div */}
        <div className="bg-[var(--card-bg)] rounded-lg p-4">
          <CustomerInfo />
          <hr className="border-t-2 border-[var(--border-color)] m-2" />
          {/* Order Items */}
          <CartInfo />
          {/* Bill */}
          <Bill />
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </section>
  );
};

export default Menu;
