import React, { useRef, useEffect } from "react";
import { MdDeleteForever } from "react-icons/md";
import { FaNotesMedical } from "react-icons/fa6";
import { useSelector, useDispatch } from "react-redux";
import { removeItems } from "../../redux/slices/cartSlice";
const CartInfo = () => {
  const cartData = useSelector((state) => state.cart);
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
        {cartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-[var(--text-color)] font-semibold text-lg opacity-80">
              Your cart is empty
            </p>
          </div>
        ) : (
          cartData.map((item) => {
            return (
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
            );
          })
        )}
      </div>
    </div>
  );
};

export default CartInfo;
