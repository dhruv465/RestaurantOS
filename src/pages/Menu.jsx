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
    <section className="bg-[#1f1f1f] min-h-screen pb-20 overflow-auto flex gap-3">
      <div className="flex-[3]">
        <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-8 lg:px-10 py-4 gap-4">
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
      <div className="flex-[1] bg-[#1a1a1a] mt-4 mr-3 rounded-lg pt-2">
        <CustomerInfo />
        <hr className="border-t-2 border-[#2a2a2a] m-2" />
        {/* Order Items */}
        <CartInfo />
        {/* Bill */}
        <Bill />
      </div>
      <div className="fixed bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </section>
  );
};

export default Menu;
