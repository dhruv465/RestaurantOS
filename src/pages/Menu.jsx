import React from "react";
import BottomNav from "../components/ui/BottomNav";
import BackButton from "../components/ui/BackButton";
import { IoRestaurant } from "react-icons/io5";
import MenuContainer from "../components/menu/MenuContainer";
import CustomerInfo from "../components/menu/CustomerInfo";
import CartInfo from "../components/menu/CartInfo";
import Bill from "../components/menu/Bill";
import { useSelector } from "react-redux";

const Menu = () => {
  const customerData = useSelector(state => state.customer);
  return (
    <section className="bg-[var(--main-bg)] min-h-screen pb-20 overflow-auto flex flex-col md:flex-row gap-3 px-2 sm:px-4">
      <div className="w-full md:flex-[3]">
        <div className="flex flex-col md:flex-row items-center justify-between px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 gap-3 sm:gap-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-lg sm:text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">
              Menu
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <button
              className="profile flex items-center gap-2 cursor-pointer bg-[var(--card-bg)] p-2 sm:p-3 rounded-lg"
              aria-label="User profile"
            >
              <IoRestaurant
                className="text-2xl text-[var(--text-color)]"
                aria-hidden="true"
              />
              <div className="text-[var(--text-color)] flex flex-col items-start">
                <h2 className="text-md font-semibold">
                  {customerData.customerName || "Customer Name"}
                </h2>
                <p className="text-xs text-[var(--text-color)]/70 font-medium">
                  {customerData.tableNo || "N/A"}
                </p>
              </div>
            </button>
          </div>
        </div>

        <MenuContainer />
      </div>
      {/* Right Div */}
      <div className="w-full md:w-auto md:flex-[1] bg-[var(--card-bg)] mt-2 md:mt-4 mx-2 md:mr-3 rounded-lg pt-2 px-2 sm:px-4">
        <CustomerInfo />
        <hr className="border-t-2 border-[var(--border-color)] m-2" />
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
