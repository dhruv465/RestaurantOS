import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders, updateOrderStatus, updateTable } from "../../https/index";
import { formatDateAndTime } from "../../utils/index";
import { StatusPill } from "../home/Widgets";

const select = "bg-[var(--main-bg)] text-[var(--text-color)] border border-[var(--border-color)] p-1.5 rounded-lg text-sm cursor-pointer";

const RecentOrders = () => {
  const queryClient = useQueryClient();

  // Mutation for updating order status
  const orderStatusUpdateMutation = useMutation({
    mutationFn: ({ orderId, orderStatus }) =>
      updateOrderStatus({ orderId, orderStatus }),
    onSuccess: () => {
      enqueueSnackbar("Order status updated successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => {
      enqueueSnackbar("Failed to update order status", { variant: "error" });
    },
  });

  // Mutation for updating table status
  const tableStatusUpdateMutation = useMutation({
    mutationFn: ({ tableId, status, orderId }) =>
      updateTable({ tableId, status, orderId }),
    onSuccess: () => {
      enqueueSnackbar("Table status updated successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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

  // Newest first; open orders can be moved on from here, closed ones just show where they ended.
  const filteredOrders = [...(resData?.data.data || [])]
    .filter((order) => order.acceptance !== "Pending")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);
  const isOpen = (order) => !["Completed", "Cancelled"].includes(order.orderStatus);

  return (
    <div className="w-full">
      <div className="bg-[var(--card-bg)] text-[var(--text-color)] p-4 rounded-xl border border-[var(--border-color)]">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <p className="text-sm text-[var(--muted)] mb-3">The latest 50. Change an open order&apos;s status or its table here if it got stuck.</p>
        {/* Wide table: it scrolls sideways inside its card on a phone, the page does not. */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--muted)] border-b border-[var(--border-color)]">
              <tr>
                <th className="p-2">Order</th>
                <th className="p-2">Customer</th>
                <th className="p-2">Status</th>
                <th className="p-2">Table</th>
                <th className="p-2">Time</th>
                <th className="p-2">Items</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2">Paid</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders?.map((order, index) => (
                <tr
                  key={order._id || index}
                  className="border-b border-[var(--border-color)] last:border-0"
                >
                  <td className="p-2 whitespace-nowrap">#{String(order.orderNo || "").split("-").pop()}</td>
                  <td className="p-2">{order.customerDetails?.name || "Guest"}</td>
                  <td className="p-2">
                    {!isOpen(order) ? <StatusPill status={order.orderStatus} /> : (
                    <select
                      aria-label={`Status of order ${order.orderNo}`}
                      className={select}
                      value={order.orderStatus}
                      onChange={(e) =>
                        handleOrderStatusChange({
                          orderId: order._id,
                          orderStatus: e.target.value,
                        })
                      }
                    >
                      <option value="In Progress">In the kitchen</option>
                      <option value="Ready">Ready to serve</option>
                    </select>
                    )}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {order.table && isOpen(order) ? (
                    <select
                      aria-label={`Table ${order.table.tableNo} status`}
                      className={select}
                      value={order.table.status}
                      onChange={(e) =>
                        handleTableStatusChange({
                          tableId: order.table._id,
                          tableStatus: e.target.value,
                          orderId: order._id,
                        })
                      }
                    >
                      <option value="Available">Table {order.table.tableNo}: free</option>
                      <option value="Booked">Table {order.table.tableNo}: in use</option>
                    </select>
                    ) : order.table ? (
                      `Table ${order.table.tableNo}`
                    ) : (
                      order.type
                    )}
                  </td>
                  <td className="p-2 whitespace-nowrap text-[var(--muted)]">{formatDateAndTime(order.createdAt)}</td>
                  <td className="p-2">{order.items.length}</td>
                  <td className="p-2 text-right tabular-nums">₹{((order.bills?.totalPaise || 0) / 100).toFixed(2)}</td>
                  <td className="p-2">{order.paymentStatus === "Paid" ? "Paid" : "No"}</td>
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
