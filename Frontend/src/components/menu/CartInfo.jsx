import React, { useRef, useEffect } from "react";
import { MdDeleteForever } from "react-icons/md";
import { FaNotesMedical } from "react-icons/fa6";
import { useSelector, useDispatch } from "react-redux";
import { removeItems } from "../../redux/slices/cartSlice";

const CartInfo = ({ orderData }) => {
  const cartData = useSelector((state) => state.cart.items); // Access items from cart slice
  const scrollRef = useRef();
  const dispatch = useDispatch();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [cartData]);

  const handleRemove = (itemId) => {
    dispatch(removeItems(itemId));
  };

  return (
    <div className="px-4 py-2">
      <h1 className="text-[var(--text-color)] font-semibold tracking-wide text-md">
        Order Details
      </h1>
      <div
        className="mt-4 overflow-y-scroll scrollbar-hide h-[380px]"
        ref={scrollRef}
      >
        {/* Conditionally render based on orderData or cartData */}
        {orderData && orderData.bills && orderData.bills.items ? ( 
          // If orderData AND orderData.bills AND orderData.bills.items exist, display items 
          orderData.bills.items.map((item) => (
            <div
              key={item._id}
              className="rounded-lg px-4 py-4 mb-2  bg-[var(--main-bg)]"
            >
              <div className="flex items-center justify-between">
                <h1 className="text-[var(--text-color)] font-semibold tracking-wide text-md">
                  {item.name}
                </h1>
                <p className="text-[var(--text-color)] font-semibold">
                  x{item.quantity}
                </p>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  {/* You may need to adjust handleRemove if item._id is different from item.id */}
                  <MdDeleteForever
                    onClick={() => handleRemove(item._id)} 
                    className="text-[var(--text-color)] cursor-pointer size={20}"
                  />
                  <FaNotesMedical className="text-[var(--text-color)] cursor-pointer size={20}" />
                </div>
                <p className="text-[var(--text-color)] text-md font-bold">
                  ₹ {item.price}
                </p>
              </div>
            </div>
          ))
        ) : cartData.length === 0 ? (
          // If cartData is empty, show "Your cart is empty"
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-[var(--text-color)] font-semibold text-lg opacity-80">
              Your cart is empty
            </p>
          </div>
        ) : (
          // If cartData has items, display them
          cartData.map((item) => (
            <div
              key={item.id}
              className="rounded-lg px-4 py-4 mb-2  bg-[var(--main-bg)]"
            >
              <div className="flex items-center justify-between">
                <h1 className="text-[var(--text-color)] font-semibold tracking-wide text-md">
                  {item.name}
                </h1>
                <p className="text-[var(--text-color)] font-semibold">
                  x{item.quantity}
                </p>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  <MdDeleteForever
                    onClick={() => handleRemove(item.id)}
                    className="text-[var(--text-color)] cursor-pointer size={20}"
                  />
                  <FaNotesMedical className="text-[var(--text-color)] cursor-pointer size={20}" />
                </div>
                <p className="text-[var(--text-color)] text-md font-bold">
                  ₹ {item.price}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CartInfo;
