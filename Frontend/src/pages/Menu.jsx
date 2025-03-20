import React, { useEffect, useState } from "react";
import { IoRestaurant } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import Bill from "../components/menu/Bill";
import CartInfo from "../components/menu/CartInfo";
import CustomerInfo from "../components/menu/CustomerInfo";
import MenuContainer from "../components/menu/MenuContainer";
import BackButton from "../components/ui/BackButton";
import BottomNav from "../components/ui/BottomNav";
import { addItems, removeAllItems } from "../redux/slices/cartSlice";
import { removeCustomer, setCustomer } from "../redux/slices/customerSlice";

const Menu = () => {
  const location = useLocation();
  const tableData = location.state?.table;
  const dispatch = useDispatch();
  // Track the current table ID to detect changes
  const [currentTableId, setCurrentTableId] = useState(null);

  // Fetch Redux state
  const customerData = useSelector((state) => state.customer);
  const cartData = useSelector((state) => state.cart);
  console.log("Menu component rendered with tableData:", tableData);
  console.log("Redux Customer Data:", customerData);
  console.log("Redux Cart Data:", cartData);

  useEffect(() => {
    // Skip if no table data is available
    if (!tableData) {
      return;
    }

    // Check if we've switched to a different table
    const isNewTable = currentTableId !== tableData.tableId;

    // If we have an order and either it's a new table or we haven't loaded this table before
    if (tableData.currentOrder?.data) {
      if (isNewTable) {
        // Clear the cart immediately when switching tables
        dispatch(removeAllItems());
        dispatch(removeCustomer());

        // Update the current table ID tracker
        setCurrentTableId(tableData.tableId);

        // Set customer data from the current order
        if (tableData.currentOrder.data.customerDetails) {
          const customerDetails = tableData.currentOrder.data.customerDetails;

          const customerPayload = {
            orderId: tableData.currentOrder.data._id,
            customerName: customerDetails.name,
            customerPhone: customerDetails.phone,
            guests: customerDetails.guests || 1,
            // Always include table info to maintain the relation
            table: {
              tableId: tableData.tableId,
              tableNo: tableData.tableNo,
            },
          };

          console.log("Setting customer data:", customerPayload);
          dispatch(setCustomer(customerPayload));

          // Load cart items from the order
          if (
            tableData.currentOrder.data.items &&
            tableData.currentOrder.data.items.length > 0
          ) {
            console.log(
              "Loading cart items:",
              tableData.currentOrder.data.items
            );

            tableData.currentOrder.data.items.forEach((item) => {
              dispatch(
                addItems({
                  id: item.id || Date.now() + Math.random(),
                  name: item.name,
                  pricePerQuantity:
                    item.pricePerQuantity || item.price / item.quantity,
                  quantity: item.quantity,
                  price: item.price,
                })
              );
            });
          } else {
            console.log("No items in the order");
          }
        } else {
          console.log("No customer details in order data");
        }
      } else {
        console.log("Same table - no reload needed");
      }
    } else {
      // Table doesn't have an order
      if (isNewTable) {
        dispatch(removeAllItems());
        setCurrentTableId(tableData.tableId);

        // Update just the table info in customer data
        dispatch(
          setCustomer({
            table: {
              tableId: tableData.tableId,
              tableNo: tableData.tableNo,
            },
          })
        );
      }
    }
  }, [tableData, dispatch]);

  useEffect(() => {
    document.title = "RestOS | Menu";
  }, []);

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
                  {customerData.customerName || "New Customer"}
                </h2>
                <p className="text-xs text-[var(--text-color)]/70 font-medium">
                  Table: {customerData.table?.tableNo || "N/A"}
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
