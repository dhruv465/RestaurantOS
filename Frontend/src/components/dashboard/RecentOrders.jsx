import React from "react";
import { GrUpdate } from "react-icons/gr";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders, updateOrderStatus, updateTable } from "../../https/index";
import { formatDateAndTime } from "../../utils/index";

const RecentOrders = () => {
  const queryClient = useQueryClient();

  // Mutation for updating order status
  const orderStatusUpdateMutation = useMutation({
    mutationFn: ({ orderId, orderStatus }) =>
      updateOrderStatus({ orderId, orderStatus }),
    onSuccess: (data) => {
      enqueueSnackbar("Order status updated successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries(["orders"]);
    },
    onError: () => {
      enqueueSnackbar("Failed to update order status", { variant: "error" });
    },
  });

  // Mutation for updating table status
  const tableStatusUpdateMutation = useMutation({
    mutationFn: ({ tableId, status, orderId }) =>
      updateTable({ tableId, status, orderId }),
    onSuccess: (data) => {
      enqueueSnackbar("Table status updated successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries(["orders"]);
    },
    onError: () => {
      enqueueSnackbar("Failed to update table status", { variant: "error" });
    },
  });

  const handleOrderStatusChange = ({ orderId, orderStatus }) => {
    orderStatusUpdateMutation.mutate({ orderId, orderStatus });
  };

  const handleTableStatusChange = ({ tableId, tableStatus, orderId }) => {
    tableStatusUpdateMutation.mutate({ tableId, status: tableStatus, orderId });
  };

  const { data: resData, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      return await getOrders();
    },
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  // Filter out orders where the table status is "Available"
  // RecentOrders.jsx
  const filteredOrders = resData?.data.data.filter(
    (order) =>
      order.orderStatus !== "Completed" && order.table?.status !== "Available" // Optional chaining here
  );

  return (
    <div className="flex flex-col w-full p-4">
      <div className="container mx-auto bg-[var(--card-bg)] text-[var(--text-color)] p-4 rounded-lg overflow-x-auto">
        <h2 className="text-[var(--text-color)] text-xl font-semibold mb-4">
          Recent Orders
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[#f5f5f5]">
            <thead className="bg[var(--main-bg)] text-[#ababab]">
              <tr>
                <th className="p-3">Order ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Order Status</th>
                <th className="p-3">Table Status</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Items</th>
                <th className="p-3">Table No</th>
                <th className="p-3">Total</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders?.map((order, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-600 text-[var(--text-color)] cursor-pointer"
                >
                  <td className="p-4">
                    #{Math.floor(new Date(order.orderDate).getTime())}
                  </td>
                  <td className="p-4">{order.customerDetails.name}</td>
                  <td className="p-4">
                    <select
                      className={`bg-[#1a1a1a] text-[#f5f5f5] border border-gray-500 p-2 rounded-lg focus:outline-none cursor-pointer ${
                        order.orderStatus === "Ready"
                          ? "text-green-500"
                          : "text-yellow-500"
                      }`}
                      value={order.orderStatus}
                      onChange={(e) =>
                        handleOrderStatusChange({
                          orderId: order._id,
                          orderStatus: e.target.value,
                        })
                      }
                    >
                      <option className="text-yellow-500" value="In Progress">
                        In Progress
                      </option>
                      <option className="text-green-500" value="Ready">
                        Ready
                      </option>
                    </select>
                  </td>
                  <td className="p-4">
                    <select
                      className={`bg-[#1a1a1a] text-[#f5f5f5] border border-gray-500 p-2 rounded-lg focus:outline-none cursor-pointer ${
                        order.table.status === "Available"
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                      value={order.table.status}
                      onChange={(e) =>
                        handleTableStatusChange({
                          tableId: order.table._id,
                          tableStatus: e.target.value,
                          orderId: order._id,
                        })
                      }
                    >
                      <option className="text-green-500" value="Available">
                        Available
                      </option>
                      <option className="text-red-500" value="Booked">
                        Booked
                      </option>
                    </select>
                  </td>
                  <td className="p-4">{formatDateAndTime(order.createdAt)}</td>
                  <td className="p-4">{order.items.length} Items</td>
                  <td className="p-4">Table - {order.table.tableNo}</td>
                  <td className="p-4">₹{order.bills.grandTotal}</td>
                  <td className="p-4 text-center">
                    <button className="text-blue-400 hover:text-blue-500 transition text-sm md:text-md">
                      <GrUpdate size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecentOrders;
